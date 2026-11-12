
import fs from "fs";
import path from "path";
import xlsx from "xlsx";
import mongoose from "mongoose";

import PayrollImport from "../models/payrollImport.model.js";
import PayrollBatch from "../models/payrollBatch.model.js";
import User from "../models/user.model.js";
import Employee from "../models/employee.model.js";

// ==================================================
// HELPER FUNCTIONS
// ==================================================

const normalizeHeader = (header) =>
  String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getValue = (row, possibleHeaders) => {
  for (const header of possibleHeaders) {
    const value = row[header];

    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }

  return "";
};

// Handles values such as 50000, 50,000, ₹50,000 and $50000
const parseSalary = (value) => {
  if (value === undefined || value === null || value === "") {
    return "";
  }

  return String(value).replace(/[,\s₹$€£]/g, "").trim();
};

const toDecimal128 = (value) =>
  mongoose.Types.Decimal128.fromString(String(value));

const validEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");

const calculateBatchTotals = (items) => {
  const currencyTotals = {};

  for (const item of items) {
    const currency = item.currency;
    const amount = Number(item.finalAmount.toString());

    currencyTotals[currency] =
      (currencyTotals[currency] || 0) + amount;
  }

  const currencyBreakdown = Object.entries(currencyTotals).map(
    ([currency, amount]) => ({
      currency,
      total: toDecimal128(amount.toFixed(2)),
    })
  );

  return {
    currencyBreakdown,
    totalAmount:
      currencyBreakdown.length === 1
        ? currencyBreakdown[0].total
        : null,
  };
};

const getUser = async (userId) =>
  User.findById(userId).select("-password");

// ==================================================
// 1. UPLOAD PAYROLL FILE
// ==================================================

export const uploadPayrollFile = async (req, res) => {
  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Your account is not connected to a company.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a payroll file",
      });
    }

    const extension = path
      .extname(req.file.originalname)
      .toLowerCase()
      .replace(".", "");

    const allowedTypes = ["csv", "xlsx", "xls"];

    if (!allowedTypes.includes(extension)) {
      if (req.file.path) {
        fs.unlink(req.file.path, () => {});
      }

      return res.status(400).json({
        success: false,
        message: "Only CSV and Excel files are supported",
      });
    }

    const payrollImport = await PayrollImport.create({
      companyId: user.companyId,
      uploadedBy: user._id,
      originalFileName: req.file.originalname,
      fileType: extension,
      storageKey: req.file.path,
      fileSize: req.file.size,
      processingStatus: "uploaded",
    });

    return res.status(201).json({
      success: true,
      message: "Payroll file uploaded successfully",
      data: payrollImport,
    });
  } catch (error) {
    console.error("UPLOAD PAYROLL FILE ERROR:", error);

    if (req.file?.path) {
      fs.unlink(req.file.path, () => {});
    }

    return res.status(500).json({
      success: false,
      message: "Failed to upload payroll file",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 2. GET ALL PAYROLL IMPORTS
// ==================================================

export const getPayrollImports = async (req, res) => {
  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const imports = await PayrollImport.find({
      companyId: user.companyId,
    })
      .select("-extractedRecords -storageKey")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      message: "All payroll imports found",
      count: imports.length,
      data: imports,
    });
  } catch (error) {
    console.error("GET PAYROLL IMPORTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch payroll imports",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 3. GET PAYROLL IMPORT BY ID
// ==================================================

export const getPayrollImportById = async (req, res) => {
  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const payrollImport = await PayrollImport.findOne({
      _id: req.params.id,
      companyId: user.companyId,
    }).select("-storageKey");

    if (!payrollImport) {
      return res.status(404).json({
        success: false,
        message: "Payroll import not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Payroll import found successfully",
      data: payrollImport,
    });
  } catch (error) {
    console.error("GET PAYROLL IMPORT BY ID ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get payroll import",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 4. PROCESS PAYROLL FILE
// ==================================================

export const processPayrollImport = async (req, res) => {
  let payrollImport;

  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Your account is not connected to a company.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payroll import ID",
      });
    }

    // Claim the import atomically.
    // Both uploaded and failed imports can be processed.
    payrollImport = await PayrollImport.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: user.companyId,
        processingStatus: {
          $in: ["uploaded", "failed"],
        },
      },
      {
        $set: {
          processingStatus: "processing",
          processingStartedAt: new Date(),
          processingCompletedAt: null,
        },
      },
      {
        new: true,
      }
    ).select("+storageKey");

    if (!payrollImport) {
      const existingImport = await PayrollImport.findOne({
        _id: req.params.id,
        companyId: user.companyId,
      }).select("processingStatus");

      if (!existingImport) {
        return res.status(404).json({
          success: false,
          message: "Payroll import not found",
        });
      }

      return res.status(400).json({
        success: false,
        message: `This import cannot be processed. Current status: ${existingImport.processingStatus}`,
      });
    }

    // Check uploaded file
    if (
      !payrollImport.storageKey ||
      !fs.existsSync(payrollImport.storageKey)
    ) {
      payrollImport.processingStatus = "failed";
      payrollImport.processingCompletedAt = new Date();
      await payrollImport.save();

      return res.status(404).json({
        success: false,
        message: "Uploaded file not found. Please upload the file again.",
      });
    }

    // Read workbook
    const workbook = xlsx.readFile(payrollImport.storageKey, {
      cellDates: true,
    });

    if (!workbook.SheetNames.length) {
      throw new Error("No worksheet found in the uploaded file.");
    }

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawRows = xlsx.utils.sheet_to_json(firstSheet, {
      defval: "",
      raw: false,
    });

    if (!rawRows.length) {
      payrollImport.processingStatus = "failed";
      payrollImport.processingCompletedAt = new Date();
      payrollImport.validationErrors = [
        {
          field: "file",
          code: "EMPTY_FILE",
          message: "The uploaded spreadsheet contains no records.",
          severity: "error",
        },
      ];

      await payrollImport.save();

      return res.status(400).json({
        success: false,
        message: "The spreadsheet is empty",
      });
    }

    // Normalize spreadsheet headers
    const rows = rawRows.map((rawRow) => {
      const normalizedRow = {};

      for (const [key, value] of Object.entries(rawRow)) {
        normalizedRow[normalizeHeader(key)] = value;
      }

      return normalizedRow;
    });

    // Extract employee codes
    const employeeCodes = [
      ...new Set(
        rows
          .map((row) =>
            getValue(row, [
              "employeecode",
              "code",
              "employeeid",
            ])
          )
          .filter(Boolean)
      ),
    ];

    // Find matching employees
    const existingEmployees = await Employee.find({
      companyId: user.companyId,
      employeeCode: {
        $in: employeeCodes,
      },
    }).select(
      "_id employeeCode name email country department jobTitle salary paymentMethods"
    );

    const employeeMap = new Map(
      existingEmployees.map((employee) => [
        employee.employeeCode,
        employee,
      ])
    );

    const seenCodes = new Set();
    const extractedRecords = [];
    const fileErrors = [];

    // Process spreadsheet rows
    rows.forEach((row, index) => {
      const employeeCode = getValue(row, [
        "employeecode",
        "code",
        "employeeid",
      ]);

      const existingEmployee = employeeMap.get(employeeCode);

      const name =
        getValue(row, ["name", "employeename"]) ||
        existingEmployee?.name ||
        "";

      const email =
        getValue(row, ["email", "employeeemail"]) ||
        existingEmployee?.email ||
        "";

      const country =
        getValue(row, ["country"]) ||
        existingEmployee?.country ||
        "";

      const department =
        getValue(row, ["department", "dept", "division"]) ||
        existingEmployee?.department ||
        "";

      const jobTitle =
        getValue(row, [
          "jobtitle",
          "designation",
          "role",
          "position",
        ]) ||
        existingEmployee?.jobTitle ||
        "";

      const salaryValue = parseSalary(
        getValue(row, [
          "salary",
          "amount",
          "baseamount",
          "salaryamount",
          "basesalary",
        ])
      );

      const currencyValue = getValue(row, ["currency"]);

      const frequencyValue = getValue(row, [
        "payfrequency",
        "frequency",
      ]).toLowerCase();

      const existingSalaryAmount =
        existingEmployee?.salary?.amount?.toString() || "";

      const salaryAmount = salaryValue || existingSalaryAmount;

      const currency =
        currencyValue ||
        existingEmployee?.salary?.currency ||
        "";

      const payFrequency =
        frequencyValue ||
        existingEmployee?.salary?.payFrequency ||
        "";

      const recipientEmail =
        getValue(row, [
          "recipientemail",
          "paypalemail",
        ]) ||
        existingEmployee?.paymentMethods?.recipientEmail ||
        "";

      const errors = [];

      if (!employeeCode) {
        errors.push("Employee code is required.");
      }

      if (!name) {
        errors.push("Employee name is required.");
      }

      if (!validEmail(email)) {
        errors.push("A valid employee email is required.");
      }

      if (!country) {
        errors.push("Country is required.");
      }

      const numericSalary = Number(salaryAmount);

      if (
        !salaryAmount ||
        !Number.isFinite(numericSalary) ||
        numericSalary <= 0
      ) {
        errors.push("Salary must be a valid positive number.");
      }

      if (!/^[A-Za-z]{3}$/.test(currency)) {
        errors.push("Currency must be a three-letter currency code.");
      }

      if (
        !["weekly", "biweekly", "monthly"].includes(payFrequency)
      ) {
        errors.push(
          "Pay frequency must be weekly, biweekly, or monthly."
        );
      }

      let rowStatus = errors.length ? "invalid" : "valid";

      if (employeeCode && seenCodes.has(employeeCode)) {
        rowStatus = "duplicate";
        errors.push("Duplicate employee code in uploaded file.");
      }

      if (employeeCode) {
        seenCodes.add(employeeCode);
      }

      extractedRecords.push({
        rowNumber: index + 2,
        employeeCode,
        name,
        email: email.toLowerCase(),
        country,
        department,
        jobTitle,

        salary: {
          amount: salaryAmount || undefined,
          currency: currency.toUpperCase(),
          payFrequency,
        },

        recipientEmail: recipientEmail.toLowerCase(),
        matchedEmployeeId: existingEmployee?._id || null,
        action: existingEmployee ? "update" : "create",
        rowStatus,
        validationErrors: errors,
      });

      errors.forEach((message) => {
        fileErrors.push({
          rowNumber: index + 2,
          field: "record",
          code: "VALIDATION_ERROR",
          message,
          severity: "error",
        });
      });
    });

    // Save extracted records
    payrollImport.extractedRecords = extractedRecords;
    payrollImport.validationErrors = fileErrors;
    payrollImport.processingStatus = "needs_review";
    payrollImport.processingCompletedAt = new Date();

    await payrollImport.save();

    return res.status(200).json({
      success: true,
      message:
        "Payroll file processed successfully. Please review the extracted records.",

      totalRecords: extractedRecords.length,

      validRecords: extractedRecords.filter(
        (record) => record.rowStatus === "valid"
      ).length,

      invalidRecords: extractedRecords.filter(
        (record) => record.rowStatus === "invalid"
      ).length,

      duplicateRecords: extractedRecords.filter(
        (record) => record.rowStatus === "duplicate"
      ).length,

      data: payrollImport,
    });
  } catch (error) {
    console.error("\n========== PAYROLL PROCESS ERROR ==========");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("============================================\n");

    // Mark import as failed so it can be retried
    try {
      if (payrollImport?._id) {
        await PayrollImport.findByIdAndUpdate(
          payrollImport._id,
          {
            $set: {
              processingStatus: "failed",
              processingCompletedAt: new Date(),
            },
          }
        );
      }
    } catch (updateError) {
      console.error("IMPORT STATUS UPDATE ERROR:", updateError);
    }

    return res.status(500).json({
      success: false,
      message: "Failed to process payroll file",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 5. REVIEW AND CORRECT PAYROLL RECORDS
// ==================================================

export const reviewPayrollImport = async (req, res) => {
  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({
        success: false,
        message: "Records must be provided as an array",
      });
    }

    const payrollImport = await PayrollImport.findOne({
      _id: req.params.id,
      companyId: user.companyId,
    });

    if (!payrollImport) {
      return res.status(404).json({
        success: false,
        message: "Payroll import not found",
      });
    }

    if (payrollImport.processingStatus !== "needs_review") {
      return res.status(400).json({
        success: false,
        message: "This import is not available for review",
      });
    }

    for (const update of records) {
      const record = payrollImport.extractedRecords.id(
        update.recordId
      );

      if (!record) continue;

      const allowedFields = [
        "employeeCode",
        "name",
        "email",
        "country",
        "recipientEmail",
        "department",
        "jobTitle",
      ];

      for (const field of allowedFields) {
        if (update[field] !== undefined) {
          record[field] = update[field];
        }
      }

      if (update.salary && typeof update.salary === "object") {
        if (update.salary.amount !== undefined) {
          record.salary.amount = parseSalary(update.salary.amount);
        }

        if (update.salary.currency !== undefined) {
          record.salary.currency = String(update.salary.currency)
            .trim()
            .toUpperCase();
        }

        if (update.salary.payFrequency !== undefined) {
          record.salary.payFrequency = String(
            update.salary.payFrequency
          ).trim().toLowerCase();
        }
      }

      if (["create", "update", "skip"].includes(update.action)) {
        record.action = update.action;
      }
    }

    // Revalidate every record and detect duplicates again
    const seenCodes = new Set();

    for (const record of payrollImport.extractedRecords) {
      const errors = [];

      if (!record.employeeCode?.trim()) {
        errors.push("Employee code is required.");
      }

      if (!record.name?.trim()) {
        errors.push("Employee name is required.");
      }

      if (!validEmail(record.email)) {
        errors.push("A valid employee email is required.");
      }

      if (!record.country?.trim()) {
        errors.push("Country is required.");
      }

      const amount = Number(record.salary?.amount);

      if (!Number.isFinite(amount) || amount <= 0) {
        errors.push("Salary must be a valid positive number.");
      }

      if (!/^[A-Za-z]{3}$/.test(record.salary?.currency || "")) {
        errors.push("Currency must be a three-letter currency code.");
      }

      if (
        !["weekly", "biweekly", "monthly"].includes(
          record.salary?.payFrequency
        )
      ) {
        errors.push("Invalid pay frequency.");
      }

      if (
        record.employeeCode &&
        seenCodes.has(record.employeeCode)
      ) {
        errors.push("Duplicate employee code in uploaded file.");
        record.rowStatus = "duplicate";
      } else {
        record.rowStatus = errors.length ? "invalid" : "valid";
      }

      if (record.employeeCode) {
        seenCodes.add(record.employeeCode);
      }

      record.validationErrors = errors;
    }

    payrollImport.reviewedBy = user._id;
    payrollImport.reviewedAt = new Date();

    // Rebuild file-level validation errors
    payrollImport.validationErrors = payrollImport.extractedRecords
      .filter((record) => record.validationErrors?.length)
      .flatMap((record) =>
        record.validationErrors.map((message) => ({
          rowNumber: record.rowNumber,
          field: "record",
          code: "VALIDATION_ERROR",
          message,
          severity: "error",
        }))
      );

    await payrollImport.save();

    return res.status(200).json({
      success: true,
      message: "Payroll records updated successfully",
      data: payrollImport,
    });
  } catch (error) {
    console.error("REVIEW PAYROLL IMPORT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to review payroll import",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 6. APPROVE IMPORT AND CREATE PAYROLL BATCH
// ==================================================

export const approvePayrollImport = async (req, res) => {
  let session;

  try {
    const user = await getUser(req.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.companyId) {
      return res.status(400).json({
        success: false,
        message: "Your account is not connected to a company.",
      });
    }

    const {
      periodStartDate,
      periodEndDate,
      batchName,
    } = req.body;

    if (!periodStartDate || !periodEndDate) {
      return res.status(400).json({
        success: false,
        message: "Payroll period start and end dates are required.",
      });
    }

    const startDate = new Date(periodStartDate);
    const endDate = new Date(periodEndDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      startDate > endDate
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid payroll period dates.",
      });
    }

    session = await mongoose.startSession();

    let createdBatch;
    let approvedImport;

    await session.withTransaction(async () => {
      const payrollImport = await PayrollImport.findOne({
        _id: req.params.id,
        companyId: user.companyId,
      }).session(session);

      if (!payrollImport) {
        throw new Error("Payroll import not found.");
      }

      if (payrollImport.processingStatus !== "needs_review") {
        throw new Error("This import cannot be approved.");
      }

      const eligibleRecords = payrollImport.extractedRecords.filter(
        (record) => record.action !== "skip"
      );

      if (!eligibleRecords.length) {
        throw new Error("There are no employee records to approve.");
      }

      const codes = eligibleRecords.map(
        (record) => record.employeeCode
      );

      if (
        codes.some((code) => !code) ||
        new Set(codes).size !== codes.length
      ) {
        throw new Error(
          "Fix missing or duplicate employee codes before approval."
        );
      }

      // Validate records before database changes
      for (const record of eligibleRecords) {
        const amount = Number(record.salary?.amount);

        const valid =
          record.employeeCode?.trim() &&
          record.name?.trim() &&
          validEmail(record.email) &&
          record.country?.trim() &&
          Number.isFinite(amount) &&
          amount > 0 &&
          /^[A-Z]{3}$/.test(record.salary?.currency || "") &&
          ["weekly", "biweekly", "monthly"].includes(
            record.salary?.payFrequency
          ) &&
          ["create", "update"].includes(record.action) &&
          record.rowStatus !== "duplicate";

        if (!valid) {
          throw new Error(
            `Please correct the data in spreadsheet row ${record.rowNumber}.`
          );
        }
      }

      // Create or update employees
      for (const record of eligibleRecords) {
        const employeeData = {
          employeeCode: record.employeeCode,
          name: record.name,
          email: record.email.toLowerCase(),
          country: record.country,

          department: record.department || "",
          jobTitle: record.jobTitle || "",

          salary: {
            amount: toDecimal128(record.salary.amount),
            currency: record.salary.currency,
            payFrequency: record.salary.payFrequency,
          },

          paymentMethods: {
            provider: "paypal",
            ...(record.recipientEmail
              ? {
                  recipientEmail: record.recipientEmail.toLowerCase(),
                }
              : {}),
          },
        };

        if (record.action === "update") {
          const updated = await Employee.findOneAndUpdate(
            {
              _id: record.matchedEmployeeId,
              companyId: user.companyId,
              employeeCode: record.employeeCode,
            },
            {
              $set: employeeData,
            },
            {
              new: true,
              runValidators: true,
              session,
            }
          );

          if (!updated) {
            throw new Error(
              `Employee for row ${record.rowNumber} was not found.`
            );
          }
        } else if (record.action === "create") {
          const existing = await Employee.findOne({
            companyId: user.companyId,
            employeeCode: record.employeeCode,
          }).session(session);

          if (existing) {
            throw new Error(
              `Employee code ${record.employeeCode} already exists.`
            );
          }

          await Employee.create(
            [
              {
                ...employeeData,
                companyId: user.companyId,
              },
            ],
            {
              session,
            }
          );
        }
      }

      // Fetch imported employees
      const employees = await Employee.find({
        companyId: user.companyId,
        employeeCode: {
          $in: codes,
        },
      }).session(session);

      const employeeMap = new Map(
        employees.map((employee) => [
          employee.employeeCode,
          employee,
        ])
      );

      // Prepare payroll batch items
      const batchItems = eligibleRecords.map((record) => {
        const employee = employeeMap.get(record.employeeCode);

        if (!employee) {
          throw new Error(
            `Employee ${record.employeeCode} could not be found.`
          );
        }

        const baseAmount = toDecimal128(record.salary.amount);

        return {
          employeeId: employee._id,
          employeeName: employee.name,
          employeeCode: employee.employeeCode,
          country: employee.country,

          baseAmount,
          adjustments: [],
          finalAmount: baseAmount,
          currency: record.salary.currency,
          paymentStatus: "pending",
        };
      });

      const totals = calculateBatchTotals(batchItems);

      // Create payroll batch
      const batch = await PayrollBatch.create(
        [
          {
            companyId: user.companyId,

            batchName:
              batchName?.trim() ||
              `Payroll Import - ${payrollImport.originalFileName}`,

            period: {
              startDate,
              endDate,
            },

            items: batchItems,
            totalAmount: totals.totalAmount,
            currencyBreakdown: totals.currencyBreakdown,
            status: "draft",
            createdBy: user._id,
          },
        ],
        {
          session,
        }
      );

      createdBatch = batch[0];

      payrollImport.processingStatus = "approved";
      payrollImport.reviewedBy = user._id;
      payrollImport.reviewedAt = new Date();

      await payrollImport.save({ session });

      approvedImport = payrollImport;
    });

    return res.status(200).json({
      success: true,
      message:
        "Payroll import approved and payroll batch created successfully.",

      importId: approvedImport._id,

      batch: {
        id: createdBatch._id,
        batchName: createdBatch.batchName,
        status: createdBatch.status,
        totalEmployees: createdBatch.items.length,
        totalAmount: createdBatch.totalAmount,
        currencyBreakdown: createdBatch.currencyBreakdown,
        period: createdBatch.period,
      },
    });
  } catch (error) {
    console.error("\n========== APPROVE PAYROLL ERROR ==========");
    console.error("Message:", error.message);
    console.error("Stack:", error.stack);
    console.error("============================================\n");

    return res.status(400).json({
      success: false,
      message: error.message || "Failed to approve payroll import",
    });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
};
