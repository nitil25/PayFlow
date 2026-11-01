
/*
upload payroll file
get payroll imports
get payroll import by id
process payroll import
review payroll import
approved payroll import
deleted payroll import
*/


import fs from "fs"
import path from "path"
import xlsx from "xlsx"
import PayrollImport from "../models/payrollImport.model.js"
import User from "../models/user.model.js"
import Employee from "../models/employee.model.js"
import mongoose from "mongoose"


// Helper : makes spreadsheet headers consistent
const normalizeHeader = (header) => {
    return String(header || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

// Helper : read a value using the possible column names
const getValue = (row, possibleHeaders) => {
    for(const header of possibleHeaders){
        const value = row[header]

        if(value !== undefined && value !== null && value !== ""){
            return String(value).trim()
        }
    }
    return ""
}

// upload payroll file controller POST method
export const uploadPayrollFile = async(req, res) => {
    try {

        const userId = req.userId

        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }

        if(!req.file){
            return res.status(400).json({
                message:"Please upload s payroll file"
            })
        }

        const extension = path.extname(req.file.originalname).toLowerCase().replace(".","")

        const allowedTypes = ["csv", "xlsx", "xls"]

        if(!allowedTypes.includes(extension)){
            fs.unlink(req.file.path, ()=>{})

            return res.status(400).json({
                message:"Only csv and Excel files are supported currently"
            })
        }

        const payrollImport = await PayrollImport.create({
            companyId: user.companyId,
            uploadedBy: user._id,
            originalFileName: req.file.originalname,
            fileType: extension,
            storageKey: req.file.path,
            fileSize: req.file.size,
            processingStatus: "uploaded",
        })

        return res.status(201).json({
            message:"Payroll file uploaded successfully",
            data:payrollImport
        })

    } catch (error) {
        console.log(`upload payroll file error : ${error.message}`)

        if(req.file?.path){
            fs.unlink(req.file.path, ()=>{})
        }

        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

// get all pyroll imports controller GET method 
export const getPayrollImports = async(req, res) =>{
    try {
        const userId = req.userId
        const user = await User.findById(userId)

        const imports = await PayrollImport.find({companyId:user.companyId}).select("-extractedRecords").sort({createdAt:-1})

        return res.status(200).json({
            message:"All imports found",
            count:imports.length,
            data:imports
        })

    } catch (error) {
        console.log(`Get payroll import error : ${error.message}`)
        return res.status(500).json({
            message:"Failed to fetch payroll imports"
        })
    }
}

// Get one payroll import GET method 
export const getPayrollImportById = async(req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const payroll = await PayrollImport.findOne({_id:req.params.id, companyId:user.companyId})

        if(!payroll){
            return res.status(404).json({
                message:"Payroll imports not found"
            })
        }

        return res.status(200).json({
            message:"Payroll found successfully",
            data:payroll
        })

    } catch (error) {
        console.log(`Get payroll import by ID error : ${error.message}`)

        return res.status(500).json({
            message:"Failed to get the payroll"
        })

    }
}

// process payroll file POST method
export const processPayrollImport = async (req, res) => {
  try {

    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    if(!user){
        return res.status(404).json({
            message:"User not found"
        })
    }

    const payrollImport = await PayrollImport.findOne({
      _id: req.params.id,
      companyId: user.companyId,
    }).select("+storageKey");

    if (!payrollImport) {
      return res.status(404).json({
        message: "Payroll import not found.",
      });
    }

    if (payrollImport.processingStatus !== "uploaded") {
      return res.status(400).json({
        message: "This import cannot be processed in its current state.",
      });
    }

    if (!fs.existsSync(payrollImport.storageKey)) {
      return res.status(404).json({
        message: "The uploaded file could not be found.",
      });
    }

    payrollImport.processingStatus = "processing";
    payrollImport.processingStartedAt = new Date();
    await payrollImport.save();

    const workbook = xlsx.readFile(payrollImport.storageKey, {
      cellDates: true,
    });

    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

    const rawRows = xlsx.utils.sheet_to_json(firstSheet, {
      defval: "",
      raw: false,
    });
    

    if (!rawRows.length) {
      payrollImport.processingStatus = "failed";
      payrollImport.processingCompletedAt = new Date();
      payrollImport.validationErrors = [{
        field: "file",
        code: "EMPTY_FILE",
        message: "The uploaded spreadsheet contains no records.",
        severity: "error",
      }];

      await payrollImport.save();

      return res.status(400).json({
        success: false,
        message: "The spreadsheet is empty.",
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

    // console.log("RAW ROWS:", rawRows);
    // console.log("NORMALIZED ROWS:", rows);

    // console.log(
    // "PAY FREQUENCIES:",
    // rows.map((row) => row.payfrequency)
    // );


    const employeeCodes = rows
      .map((row) =>
        getValue(row, ["employeecode", "code", "employeeid"])
      )
      .filter(Boolean);

    // Find existing employees belonging to this company
    const existingEmployees = await Employee.find({
      companyId: user.companyId,
      employeeCode: { $in: employeeCodes },
    }).select("_id employeeCode");

    const employeeMap = new Map(
      existingEmployees.map((employee) => [
        employee.employeeCode,
        employee._id,
      ])
    );

    const seenCodes = new Set();
    const extractedRecords = [];
    const fileErrors = [];

    rows.forEach((row, index) => {
      const employeeCode = getValue(row, [
        "employeecode",
        "code",
        "employeeid",
      ]);

      const name = getValue(row, ["name", "employeename"]);
      const email = getValue(row, ["email", "employeeemail"]);
      const country = getValue(row, ["country"]);
      const salaryValue = getValue(row, [
        "salary",
        "amount",
        "baseamount",
      ]);
      const currency = getValue(row, ["currency"]);
      const payFrequency = getValue(row, [
        "payfrequency",
        "frequency",
      ] || "").trim().toLowerCase();

      const recipientEmail = getValue(row, [
        "recipientemail",
        "paypalemail",
      ]);

      const errors = [];

      if (!employeeCode) errors.push("Employee code is required.");
      if (!name) errors.push("Employee name is required.");

      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push("A valid employee email is required.");
      }

      const salaryAmount = Number(salaryValue);

      if (
        !salaryValue ||
        !Number.isFinite(salaryAmount) ||
        salaryAmount <= 0
      ) {
        errors.push("Salary must be a valid positive number.");
      }

      if (!/^[A-Za-z]{3}$/.test(currency)) {
        errors.push("Currency must be a three-letter currency code.");
      }

      const allowedFrequencies = ["weekly", "biweekly", "monthly"];

      if (!allowedFrequencies.includes(payFrequency)) {
        errors.push("Pay frequency must be weekly, biweekly, or monthly.");
      }

      let rowStatus = errors.length ? "invalid" : "valid";

      if (employeeCode && seenCodes.has(employeeCode)) {
        rowStatus = "duplicate";
        errors.push("Duplicate employee code in uploaded file.");
      }

      if (employeeCode) {
        seenCodes.add(employeeCode);
      }

      const matchedEmployeeId = employeeMap.get(employeeCode) || null;

      extractedRecords.push({
        rowNumber: index + 2,
        employeeCode,
        name,
        email: email.toLowerCase(),
        country,
        salary: {
          amount: Number.isFinite(salaryAmount)
            ? String(salaryAmount)
            : undefined,
          currency: currency.toUpperCase(),
          payFrequency,
        },
        recipientEmail: recipientEmail.toLowerCase(),
        matchedEmployeeId,
        action: matchedEmployeeId ? "update" : "create",
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

    payrollImport.extractedRecords = extractedRecords;
    payrollImport.validationErrors = fileErrors;
    payrollImport.processingStatus = "needs_review";
    payrollImport.processingCompletedAt = new Date();

    await payrollImport.save();

    return res.status(200).json({
      success: true,
      message: "Payroll file processed. Please review the extracted records.",
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
    console.error("Process payroll import error:", error);
    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    await PayrollImport.findOneAndUpdate(
      {
        _id: req.params.id,
        companyId: user.companyId,
      },
      {
        processingStatus: "failed",
        processingCompletedAt: new Date(),
      }
    );

    return res.status(500).json({
      success: false,
      message: "Failed to process payroll file.",
    });
  }
};

// Review And Correct Records POST method
export const reviewPayrollImport = async (req, res) => {
  try {

    const userId = req.userId
    const user = await User.findById(userId)

    if(!user){
        return res.status(404).json({
            message:"User not found"
        })
    }

    const { records } = req.body;

    if (!Array.isArray(records)) {
      return res.status(400).json({
        message: "Records must be provided as an array.",
      });
    }

    const payrollImport = await PayrollImport.findOne({
      _id: req.params.id,
      companyId:user.companyId,
    });

    if (!payrollImport) {
      return res.status(404).json({
        message: "Payroll import not found.",
      });
    }

    if (payrollImport.processingStatus !== "needs_review") {
      return res.status(400).json({
        message: "This import is not available for review.",
      });
    }

    for (const update of records) {
      const record = payrollImport.extractedRecords.id(update.recordId);

      if (!record) continue;

      // Only allow specific fields to be edited
      const allowedFields = [
        "employeeCode",
        "name",
        "email",
        "country",
        "recipientEmail",
      ];

      for (const field of allowedFields) {
        if (update[field] !== undefined) {
          record[field] = update[field];
        }
      }

      if (update.salary && typeof update.salary === "object") {
        if (update.salary.amount !== undefined) {
          record.salary.amount = update.salary.amount;
        }

        if (update.salary.currency !== undefined) {
          record.salary.currency = update.salary.currency;
        }

        if (update.salary.payFrequency !== undefined) {
          record.salary.payFrequency = update.salary.payFrequency;
        }
      }

      if (["create", "update", "skip"].includes(update.action)) {
        record.action = update.action;
      }

      // Clear old validation messages; approval will validate again
      record.validationErrors = [];
      record.rowStatus = "pending";
    }

    payrollImport.reviewedBy = user._id;
    payrollImport.reviewedAt = new Date();

    await payrollImport.save();

    return res.status(200).json({
      message: "Payroll records updated for review.",
      data: payrollImport,
    });
  } catch (error) {
    console.error("Review payroll import error:", error);

    return res.status(500).json({
      message: "Failed to review payroll import.",
    });
  }
};

// APPROVE AND APPLY EMPLOYEE RECORDS POST method
export const approvePayrollImport = async (req, res) => {
  const session = await mongoose.startSession();

  try {

    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    if(!user){
        return res.status(404).json({
            message:"User not found"
        })
    }

    const payrollImport = await PayrollImport.findOne({
      _id: req.params.id,
      companyId:user.companyId,
    }).session(session);

    if (!payrollImport) {
      await session.endSession();

      return res.status(404).json({
        message: "Payroll import not found.",
      });
    }

    if (payrollImport.processingStatus !== "needs_review") {
      await session.endSession();

      return res.status(400).json({
        message: "This import cannot be approved.",
      });
    }

    const records = payrollImport.extractedRecords;

    const eligibleRecords = records.filter(
      (record) => record.action !== "skip"
    );

    const codes = eligibleRecords.map((record) => record.employeeCode);

    // Check for missing and duplicate employee codes
    if (
      codes.some((code) => !code) ||
      new Set(codes).size !== codes.length
    ) {
      await session.endSession();

      return res.status(400).json({
        message: "Fix missing or duplicate employee codes before approval.",
      });
    }

    for (const record of eligibleRecords) {
      const amount = Number(record.salary?.amount);

      const valid =
        record.name?.trim() &&
        record.email &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email) &&
        Number.isFinite(amount) &&
        amount > 0 &&
        /^[A-Z]{3}$/.test(record.salary?.currency || "") &&
        ["weekly", "biweekly", "monthly"].includes(
          record.salary?.payFrequency
        );

      if (!valid) {
        await session.endSession();

        return res.status(400).json({
          message: `Please correct the data in spreadsheet row ${record.rowNumber}.`,
        });
      }
    }

    await session.withTransaction(async () => {
      for (const record of eligibleRecords) {
        const employeeData = {
          employeeCode: record.employeeCode,
          name: record.name,
          email: record.email,
          country: record.country,
          salary: {
            amount: mongoose.Types.Decimal128.fromString(
              String(record.salary.amount)
            ),
            currency: record.salary.currency,
            payFrequency: record.salary.payFrequency,
          },
        };

        if (record.action === "update") {
          if (!record.matchedEmployeeId) {
            throw new Error(
              `No matched employee found for row ${record.rowNumber}.`
            );
          }

          const updated = await Employee.findOneAndUpdate(
            {
              _id: record.matchedEmployeeId,
              companyId: user.companyId,
            },
            { $set: employeeData },
            { new: true, runValidators: true, session }
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
            { session }
          );
        }
      }

      payrollImport.processingStatus = "approved";
      payrollImport.reviewedBy = user._id;
      payrollImport.reviewedAt = new Date();

      await payrollImport.save({ session });
    });

    return res.status(200).json({
      message: "Payroll import approved and employee records applied.",
    });

  } catch (error) {
    console.error("Approve payroll import error:", error);

    return res.status(400).json({
      message: error.message || "Failed to approve payroll import.",
    });
  } finally {
    await session.endSession();
  }
}