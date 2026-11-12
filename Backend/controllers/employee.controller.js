
import mongoose from "mongoose";
import Decimal from "decimal.js";

import User from "../models/user.model.js";
import Company from "../models/company.model.js";
import Employee from "../models/employee.model.js";
import PayrollBatch from "../models/payrollBatch.model.js";

// ==================================================
// HELPER: GET USER AND COMPANY CONTEXT
// ==================================================

const getCompanyContext = async (userId) => {
  const user = await User.findById(userId).select("-password");

  if (!user) {
    return {
      error: "User not found",
      status: 404,
    };
  }

  let company = await Company.findOne({
    ownerId: userId,
  });

  if (!company && user.companyId) {
    company = await Company.findById(user.companyId);
  }

  const companyIds = [
    company?._id,
    user.companyId,
  ].filter(Boolean);

  const uniqueCompanyIds = [
    ...new Map(
      companyIds.map((id) => [id.toString(), id])
    ).values(),
  ];

  if (!uniqueCompanyIds.length) {
    return {
      error: "Create a company first",
      status: 400,
    };
  }

  return {
    user,
    company,
    companyId: company?._id || user.companyId,
    companyIds: uniqueCompanyIds,
  };
};

// ==================================================
// HELPER: RECALCULATE PAYROLL BATCH TOTALS
// ==================================================

const recalculateBatchTotals = (batch) => {
  const totals = new Map();

  for (const item of batch.items) {
    const currency = item.currency?.toUpperCase();

    if (!currency || item.finalAmount == null) {
      throw new Error(
        `Invalid payroll amount or currency for ${item.employeeName}.`
      );
    }

    const amount = new Decimal(item.finalAmount.toString());

    if (!amount.isFinite()) {
      throw new Error("Invalid payroll amount found.");
    }

    totals.set(
      currency,
      (totals.get(currency) || new Decimal(0)).plus(amount)
    );
  }

  batch.currencyBreakdown = Array.from(
    totals.entries()
  ).map(([currency, total]) => ({
    currency,
    total: mongoose.Types.Decimal128.fromString(
      total.toFixed(2)
    ),
  }));

  batch.totalAmount =
    totals.size === 1
      ? mongoose.Types.Decimal128.fromString(
          [...totals.values()][0].toFixed(2)
        )
      : null;
};

// ==================================================
// 1. ADD EMPLOYEE
// POST /api/add/employee
// ==================================================

export const addEmployee = async (req, res) => {
  try {
    const context = await getCompanyContext(req.userId);

    if (context.error) {
      return res.status(context.status).json({
        success: false,
        message: context.error,
      });
    }

    const {
      employeeCode,
      name,
      email,
      phone,
      country,
      jobTitle,
      department,
      salary,
      paymentMethods,
      status,
    } = req.body;

    if (
      !employeeCode ||
      !name ||
      !email ||
      !phone ||
      !country ||
      !jobTitle ||
      !department ||
      !salary ||
      !paymentMethods
    ) {
      return res.status(400).json({
        success: false,
        message: "All fields must be filled",
      });
    }

    const existingEmployee = await Employee.findOne({
      companyId: {
        $in: context.companyIds,
      },
      employeeCode: employeeCode.trim(),
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee code already exists",
      });
    }

    const employee = await Employee.create({
      companyId: context.companyId,
      employeeCode: employeeCode.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone,
      country,
      jobTitle,
      department,
      salary,
      paymentMethods,
      ...(status ? { status } : {}),
    });

    return res.status(201).json({
      success: true,
      message: "Employee added successfully",
      employee,
    });

  } catch (error) {
    console.error("Add employee error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add employee",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 2. GET ALL EMPLOYEES
// GET /api/employee/all
// ==================================================

export const getAllEmployees = async (req, res) => {
  try {
    const context = await getCompanyContext(req.userId);

    if (context.error) {
      return res.status(context.status).json({
        success: false,
        message: context.error,
      });
    }

    const employees = await Employee.find({
      companyId: {
        $in: context.companyIds,
      },
    }).sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      message: "Employees fetched successfully",
      count: employees.length,
      employees,
    });

  } catch (error) {
    console.error("Get all employees error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employees",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 3. GET EMPLOYEE BY ID
// GET /api/employee/:id
// ==================================================

export const getEmployeeById = async (req, res) => {
  try {
    const context = await getCompanyContext(req.userId);

    if (context.error) {
      return res.status(context.status).json({
        success: false,
        message: context.error,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: {
        $in: context.companyIds,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Employee fetched successfully",
      employee,
    });

  } catch (error) {
    console.error("Get employee by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch employee",
    });
  }
};

// ==================================================
// 4. UPDATE EMPLOYEE DETAILS
// POST /api/employee/:id
// ==================================================

export const updateEmployeeDetails = async (req, res) => {
  try {
    const context = await getCompanyContext(req.userId);

    if (context.error) {
      return res.status(context.status).json({
        success: false,
        message: context.error,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: {
        $in: context.companyIds,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const allowedFields = [
      "name",
      "email",
      "phone",
      "country",
      "jobTitle",
      "department",
      "salary",
      "paymentMethods",
      "status",
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        employee[field] = req.body[field];
      }
    }

    await employee.save();

    return res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });

  } catch (error) {
    console.error("Update employee details error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update employee",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

// ==================================================
// 5. REMOVE EMPLOYEE
// DELETE /api/employee/remove/:id
// ==================================================

export const removeEmployee = async (req, res) => {
  try {
    const context = await getCompanyContext(req.userId);

    if (context.error) {
      return res.status(context.status).json({
        success: false,
        message: context.error,
      });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const employee = await Employee.findOne({
      _id: req.params.id,
      companyId: {
        $in: context.companyIds,
      },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Find editable payroll batches
    const batches = await PayrollBatch.find({
      companyId: {
        $in: context.companyIds,
      },
      status: {
        $in: ["draft", "pending_approval"],
      },
      "items.employeeId": employee._id,
    });

    let updatedBatchCount = 0;

    for (const batch of batches) {
      batch.items.pull({
        employeeId: employee._id,
      });

      recalculateBatchTotals(batch);

      await batch.save();

      updatedBatchCount++;
    }

    // Delete employee after batch cleanup
    await Employee.findOneAndDelete({
      _id: employee._id,
      companyId: {
        $in: context.companyIds,
      },
    });

    return res.status(200).json({
      success: true,
      message:
        "Employee removed successfully from the company and eligible payroll batches.",
      employeeId: employee._id,
      updatedBatchCount,
    });

  } catch (error) {
    console.error("Remove employee error:", error);

    return res.status(500).json({
      success: false,
      message:
        error.message || "Unable to remove employee.",
    });
  }
};
