
import mongoose from "mongoose";
import Decimal from "decimal.js";

import PayrollBatch from "../models/payrollBatch.model.js";
import Employee from "../models/employee.model.js";
import User from "../models/user.model.js";

// Convert values safely into Decimal
const toDecimal = (value) => {
  try {
    const result = new Decimal(String(value));

    if (!result.isFinite()) {
      throw new Error();
    }

    return result;
  } catch {
    throw new Error("Please provide a valid monetary amount.");
  }
};

// Convert Decimal into MongoDB Decimal128
const toDecimal128 = (value) => {
  return mongoose.Types.Decimal128.fromString(value.toString());
};

// Find a batch belonging to a specific company
const findCompanyBatch = (id, companyId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return PayrollBatch.findOne({
    _id: id,
    companyId,
  });
};

// Calculate employee amounts and currency totals
const calculateBatchTotals = (items) => {
  const totals = new Map();

  for (const item of items) {
    const base = toDecimal(item.baseAmount);

    if (base.isNegative()) {
      throw new Error("Base salary cannot be negative.");
    }

    if (!item.currency) {
      throw new Error(`Currency is missing for ${item.employeeName}.`);
    }

    let finalAmount = base;

    for (const adjustment of item.adjustments || []) {
      const amount = toDecimal(adjustment.amount);

      if (amount.lte(0)) {
        throw new Error("Adjustment amounts must be positive.");
      }

      if (!adjustment.reason?.trim()) {
        throw new Error("Every adjustment needs a reason.");
      }

      if (adjustment.type === "deduction") {
        finalAmount = finalAmount.minus(amount);
      } else if (
        ["bonus", "overtime", "other"].includes(adjustment.type)
      ) {
        finalAmount = finalAmount.plus(amount);
      } else {
        throw new Error("Invalid adjustment type.");
      }
    }

    if (finalAmount.isNegative()) {
      throw new Error(
        `Deductions cannot exceed salary for ${item.employeeName}.`
      );
    }

    item.finalAmount = toDecimal128(finalAmount);

    const currency = item.currency.toUpperCase();

    totals.set(
      currency,
      (totals.get(currency) || new Decimal(0)).plus(finalAmount)
    );
  }

  const currencyBreakdown = Array.from(totals.entries()).map(
    ([currency, total]) => ({
      currency,
      total: toDecimal128(total),
    })
  );

  const totalAmount =
    totals.size === 1
      ? toDecimal128([...totals.values()][0])
      : null;

  return {
    currencyBreakdown,
    totalAmount,
  };
};

// Refresh and save batch totals
const refreshBatchTotals = (batch) => {
  const totals = calculateBatchTotals(batch.items);

  batch.currencyBreakdown = totals.currencyBreakdown;
  batch.totalAmount = totals.totalAmount;
};

// Get authenticated company user
const getCompanyUser = async (req) => {
  const user = await User.findById(req.userId);

  if (!user) {
    throw new Error("User not found.");
  }

  if (!user.companyId) {
    throw new Error("No company is associated with this account.");
  }

  return user;
};

// 1. CREATE PAYROLL BATCH
export const createPayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const { batchName, startDate, endDate, employeeIds } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "Payroll start date and end date are required.",
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      start > end
    ) {
      return res.status(400).json({
        message: "Please provide a valid payroll date range.",
      });
    }

    if (
      employeeIds !== undefined &&
      (
        !Array.isArray(employeeIds) ||
        employeeIds.length === 0 ||
        employeeIds.some(
          (id) => !mongoose.Types.ObjectId.isValid(id)
        )
      )
    ) {
      return res.status(400).json({
        message: "Please provide valid employee IDs.",
      });
    }

    if (
      employeeIds &&
      new Set(employeeIds.map(String)).size !== employeeIds.length
    ) {
      return res.status(400).json({
        message: "Duplicate employee IDs are not allowed.",
      });
    }

    const employeeFilter = {
      companyId: user.companyId,
      status: "active",
    };

    if (employeeIds !== undefined) {
      employeeFilter._id = { $in: employeeIds };
    }

    const employees = await Employee.find(employeeFilter);

    if (!employees.length) {
      return res.status(400).json({
        message: "No active employees were found.",
      });
    }

    if (
      employeeIds &&
      employees.length !== employeeIds.length
    ) {
      return res.status(400).json({
        message: "Some employees were not found in your company or are inactive.",
      });
    }

    const items = employees.map((employee) => ({
      employeeId: employee._id,
      employeeName: employee.name,
      employeeCode: employee.employeeCode,
      country: employee.country,
      baseAmount: employee.salary.amount,
      adjustments: [],
      finalAmount: employee.salary.amount,
      currency: employee.salary.currency,
      paymentStatus: "pending",
    }));

    const batch = await PayrollBatch.create({
      companyId: user.companyId,
      batchName: batchName?.trim() || `Payroll ${start.toLocaleDateString()}`,
      period: {
        startDate: start,
        endDate: end,
      },
      items,
      createdBy: user._id,
      status: "draft",
    });

    refreshBatchTotals(batch);
    await batch.save();

    return res.status(201).json({
      message: "Payroll batch created successfully.",
      data: batch,
    });
  } catch (error) {
    console.error("Create payroll batch error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to create payroll batch.",
    });
  }
};

// 2. GET ALL PAYROLL BATCHES
export const getPayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batches = await PayrollBatch.find({
      companyId: user.companyId,
    })
      .select("-items")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      count: batches.length,
      data: batches,
    });
  } catch (error) {
    console.error("Get payroll batches error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to fetch payroll batches.",
    });
  }
};

// 3. GET ONE PAYROLL BATCH
export const getPayrollBatchById = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    return res.status(200).json({
      data: batch,
    });
  } catch (error) {
    console.error("Get payroll batch error:", error.message);

    return res.status(400).json({
      message: "Failed to fetch payroll batch.",
    });
  }
};

// 4. UPDATE A DRAFT PAYROLL BATCH
export const updatePayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    if (batch.status !== "draft") {
      return res.status(400).json({
        message: "Only draft payroll batches can be edited.",
      });
    }

    const { batchName, startDate, endDate, items } = req.body;

    if (batchName !== undefined) {
      batch.batchName = batchName.trim();
    }

    if (startDate !== undefined || endDate !== undefined) {
      const start = new Date(
        startDate ?? batch.period.startDate
      );

      const end = new Date(
        endDate ?? batch.period.endDate
      );

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        start > end
      ) {
        return res.status(400).json({
          message: "Invalid payroll date range.",
        });
      }

      batch.period.startDate = start;
      batch.period.endDate = end;
    }

    if (items !== undefined) {
      if (!Array.isArray(items)) {
        return res.status(400).json({
          message: "Items must be an array.",
        });
      }

      for (const update of items) {
        const item = batch.items.find(
          (entry) => entry._id.toString() === update.itemId
        );

        if (!item) {
          return res.status(400).json({
            message: "Invalid payroll item.",
          });
        }

        if (update.adjustments !== undefined) {
          if (!Array.isArray(update.adjustments)) {
            return res.status(400).json({
              message: "Adjustments must be an array.",
            });
          }

          item.adjustments = update.adjustments.map(
            (adjustment) => ({
              type: adjustment.type,
              amount: adjustment.amount,
              reason: adjustment.reason,
            })
          );
        }
      }
    }

    refreshBatchTotals(batch);
    await batch.save();

    return res.status(200).json({
      message: "Payroll batch updated successfully.",
      data: batch,
    });
  } catch (error) {
    console.error("Update payroll batch error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to update payroll batch.",
    });
  }
};

// 5. CALCULATE PAYROLL
export const calculatePayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    if (batch.status !== "draft") {
      return res.status(400).json({
        message: "Only draft batches can be recalculated.",
      });
    }

    refreshBatchTotals(batch);
    await batch.save();

    return res.status(200).json({
      message: "Payroll calculated successfully.",
      data: {
        items: batch.items,
        totalAmount: batch.totalAmount,
        currencyBreakdown: batch.currencyBreakdown,
      },
    });
  } catch (error) {
    console.error("Calculate payroll error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to calculate payroll.",
    });
  }
};

// 6. SUBMIT PAYROLL FOR APPROVAL
export const submitPayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    if (batch.status !== "draft" || !batch.items.length) {
      return res.status(400).json({
        message: "Only non-empty draft batches can be submitted.",
      });
    }

    refreshBatchTotals(batch);

    for (const item of batch.items) {
      if (!item.employeeId || !item.currency) {
        return res.status(400).json({
          message: "Every payroll item needs an employee and currency.",
        });
      }
    }

    batch.approvalVersion += 1;
    batch.approvedVersion = null;
    batch.approvedBy = null;
    batch.approvedAt = null;
    batch.status = "pending_approval";

    await batch.save();

    return res.status(200).json({
      message: "Payroll submitted for approval.",
      data: batch,
    });
  } catch (error) {
    console.error("Submit payroll error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to submit payroll.",
    });
  }
};

// 7. APPROVE PAYROLL
export const approvePayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    if (batch.status !== "pending_approval") {
      return res.status(400).json({
        message: "This payroll is not waiting for approval.",
      });
    }

    refreshBatchTotals(batch);

    batch.status = "approved";
    batch.approvedBy = user._id;
    batch.approvedAt = new Date();
    batch.approvedVersion = batch.approvalVersion;

    await batch.save();

    return res.status(200).json({
      message: "Payroll batch approved successfully.",
      data: batch,
    });
  } catch (error) {
    console.error("Approve payroll error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to approve payroll.",
    });
  }
};

// 8. CANCEL PAYROLL BATCH
export const deletePayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    const cancellableStatuses = [
      "draft",
      "pending_approval",
      "approved",
      "scheduled",
    ];

    if (!cancellableStatuses.includes(batch.status)) {
      return res.status(400).json({
        message: "This payroll batch can no longer be cancelled.",
      });
    }

    batch.status = "cancelled";
    batch.approvedVersion = null;

    await batch.save();

    return res.status(200).json({
      message: "Payroll batch cancelled successfully.",
      data: batch,
    });
  } catch (error) {
    console.error("Cancel payroll error:", error.message);

    return res.status(400).json({
      message: error.message || "Failed to cancel payroll batch.",
    });
  }
};

// 9. PROCESS PAYROLL PAYMENTS (SIMULATED)
export const processPayrollBatch = async (req, res) => {
  try {
    const user = await getCompanyUser(req);

    const batch = await findCompanyBatch(
      req.params.id,
      user.companyId
    );

    if (!batch) {
      return res.status(404).json({
        message: "Payroll batch not found.",
      });
    }

    if (!["approved", "partially_failed"].includes(batch.status)) {
      return res.status(400).json({
        message: "Only approved or partially failed payroll batches can be processed.",
      });
    }

    if (!batch.items.length) {
      return res.status(400).json({
        message: "This payroll batch has no employees.",
      });
    }

    // Optional IDs allow controlled failure simulation for testing.
    const failedItemIds = req.body.failedItemIds || [];

    if (
      !Array.isArray(failedItemIds) ||
      failedItemIds.some(
        (id) => !mongoose.Types.ObjectId.isValid(id)
      )
    ) {
      return res.status(400).json({
        message: "Invalid failed employee item IDs.",
      });
    }

    const failedIds = new Set(failedItemIds.map(String));

    const matchingFailedItems = batch.items.filter((item) =>
      failedIds.has(item._id.toString())
    );

    if (matchingFailedItems.length !== failedIds.size) {
      return res.status(400).json({
        message: "One or more failed item IDs do not belong to this batch.",
      });
    }

    const eligibleItems = batch.items.filter((item) =>
      ["pending", "failed"].includes(item.paymentStatus)
    );

    if (!eligibleItems.length) {
      return res.status(400).json({
        message: "There are no pending or failed payments to process.",
      });
    }

    // First save processing status.
    batch.status = "processing";

    for (const item of eligibleItems) {
      item.paymentStatus = "processing";
    }

    await batch.save();

    // Simulate payment results and persist them.
    for (const item of eligibleItems) {
      item.paymentStatus = failedIds.has(item._id.toString())
        ? "failed"
        : "completed";
    }

    const completedCount = batch.items.filter(
      (item) => item.paymentStatus === "completed"
    ).length;

    const failedCount = batch.items.filter(
      (item) => item.paymentStatus === "failed"
    ).length;

    const pendingCount = batch.items.filter(
      (item) =>
        ["pending", "processing"].includes(item.paymentStatus)
    ).length;

    if (pendingCount > 0) {
      batch.status = "processing";
    } else if (failedCount > 0 && completedCount > 0) {
      batch.status = "partially_failed";
    } else if (failedCount > 0) {
      batch.status = "failed";
    } else {
      batch.status = "completed";
    }

    await batch.save();

    return res.status(200).json({
      message: "Simulated payroll processing completed.",
      data: {
        batchId: batch._id,
        batchStatus: batch.status,
        totalEmployees: batch.items.length,
        completedCount,
        failedCount,
        pendingCount,
        items: batch.items,
      },
    });
  } catch (error) {
    console.error("Process payroll error:", error.message);

    return res.status(500).json({
      message: error.message || "Failed to process payroll.",
    });
  }
};
