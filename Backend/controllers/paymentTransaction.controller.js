import mongoose from "mongoose";
import User from "../models/user.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import PayrollBatch from "../models/payrollBatch.model.js";
import { createPayPalPayout } from "../services/paypalPayoutService.js";
import crypto from "node:crypto";

// Get all the payment transaction
export const getPaymentTransaction = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    const companyId = user.companyId

    const {
      status,
      employeeId,
      payrollBatchId,
      currency,
      startDate,
      endDate,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit)) || 10);

    const allowedStatuses = [
      "pending",
      "processing",
      "completed",
      "failed",
      "cancelled",
      "unknown",
    ];

    const filter = {companyId}

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid payment status",
        });
      }
      filter.status = status;
    }

    if (employeeId) {
      if (!mongoose.Types.ObjectId.isValid(employeeId)) {
        return res.status(400).json({
          message: "Invaild employee ID",
        });
      }
      filter.employeeId = employeeId;
    }

    if (payrollBatchId) {
      if (!mongoose.Types.ObjectId.isValid(payrollBatchId)) {
        return res.status(400).json({
          message: "Invalid payroll batch ID",
        });
      }
      filter.payrollBatchId = payrollBatchId;
    }

    if (currency) {
      filter.currency = currency.toUpperCase();
    }

    if (startDate || endDate) {
      filter.initiatedAt = {};

      if (startDate) {
        const start = new Date(startDate);

        if (Number.isNaN(start.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid start date",
          });
        }

        filter.initiatedAt.$gte = start;
      }

      if (endDate) {
        const end = new Date(endDate);

        if (Number.isNaN(end.getTime())) {
          return res.status(400).json({
            success: false,
            message: "Invalid end date",
          });
        }

        filter.initiatedAt.$lte = end;
      }

      if (
        startDate &&
        endDate &&
        filter.initiatedAt.$gte > filter.initiatedAt.$lte
      ) {
        return res.status(400).json({
          success: false,
          message: "Start date cannot be after end date",
        });
      }
    }

    const [transaction, total] = await Promise.all([
      PaymentTransaction.find(filter)
        .populate("employeeId", "name email employeeCode")
        .populate("payrollBatchId", "status period")
        .sort({ initiatedAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),

      PaymentTransaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      data: transaction,
    });
  } catch (error) {
    console.log(`Get payment transaction error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to get all the payment transaction",
    });
  }
};

// Get a single payment transaction
export const getPaymentTransactionById = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: "Invalid transaction ID",
      });
    }

    const transaction = await PaymentTransaction.findOne({
      _id: id,
      companyId: user.companyId,
    })
      .populate("employeeId", "name email employeeCode")
      .populate("payrollBatchId")
      .populate("companyId", "name");

    if (!transaction) {
      return res.status(404).json({
        message: "Payment transaction not found",
      });
    }

    return res.status(200).json({
      data: transaction,
    });
  } catch (error) {
    console.log(`Get payment trasaction by id error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to get the payment transaction",
    });
  }
};

// Get payment statistics
export const getPaymentStatistics = async (req, res) => {
  try {
    const userId = req.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const companyId = new mongoose.Types.ObjectId(companyId);

    const statistics = await PaymentTransaction.aggregate([
      {
        $match: { companyId },
      },
      {
        $group: {
          _id: {
            status: "$status",
            currency: "$currency",
          },
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
      {
        $sort: {
          "_id.currency": 1,
          "_id.status": 1,
        },
      },
    ]);

    const summary = statistics.map((item) => ({
      status: item._id.status,
      currency: item._id.currency,
      count: item.count,
      totalAmount: item.totalAmount.toString(),
    }));

    const totalTransactions = statistics.reduce(
      (total, item) => total + item.count,
      0,
    );

    const successfulPayments = statistics
      .filter((item) => item._id.status === "completed")
      .reduce((total, item) => total + item.count, 0);

    const failedPayments = statistics
      .filter((item) => item._id.status === "failed")
      .reduce((total, item) => total + item.count, 0);

    return res.status(200).json({
      data: {
        totalTransactions,
        successfulPayments,
        failedPayments,
        statusCurrencyBreakdown: summary,
      },
    });
  } catch (error) {
    console.log(`Get payment statistics error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to get the payment statistics",
    });
  }
};

// Initiate payroll payments
export const initiatePayrollPayments = async (req, res) => {
  let companyId;
  let claimedBatchId;
  let senderBatchId;
  let providerBatchId;
  let providerRequestStarted = false;

  try {
    // 1. Authenticate and authorize user
    const user = await User.findById(req.userId).select("-password");

    if (!user || !user.isActive) {
      return res.status(401).json({ message: "Active user account required" });
    }

    if (!["owner", "admin"].includes(user.role)) {
      return res.status(403).json({
        message: "You are not authorized to initiate payroll payments",
      });
    }

    companyId = user.companyId;

    if (!companyId) {
      return res.status(400).json({
        message: "User is not associated with a company",
      });
    }

    const { payrollBatchId } = req.body;

    if (!mongoose.isValidObjectId(payrollBatchId)) {
      return res.status(400).json({
        message: "A valid payroll batch ID is required",
      });
    }

    // 2. Load approved batch
    const payrollBatch = await PayrollBatch.findOne({
      _id: payrollBatchId,
      companyId,
      status: "approved",
    }).populate("items.employeeId");

    if (!payrollBatch) {
      return res.status(404).json({
        message: "Approved payroll batch not found",
      });
    }

    if (
      payrollBatch.approvedVersion == null ||
      payrollBatch.approvedVersion !== payrollBatch.approvalVersion
    ) {
      return res.status(409).json({
        message: "Payroll approval is outdated. Review and approve again.",
      });
    }

    if (!payrollBatch.items?.length) {
      return res.status(400).json({
        message: "Payroll batch has no payment items",
      });
    }

    // 3. Validate payout details before claiming the batch
    const payoutItems = payrollBatch.items.map((item) => {
      const employee = item.employeeId;

      if (
        !employee ||
        employee.companyId?.toString() !== companyId.toString() ||
        employee.isActive === false
      ) {
        throw new Error("Invalid or inactive employee in payroll batch");
      }

      const email = employee.paymentMethod?.recipientEmail;
      const amount = item.finalAmount?.toString();
      const currency = item.currency?.toUpperCase();

      if (
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !amount ||
        !/^\d+(\.\d{1,2})?$/.test(amount) ||
        Number(amount) <= 0 ||
        !currency ||
        !/^[A-Z]{3}$/.test(currency)
      ) {
        throw new Error(`Invalid payout information for employee ${employee._id}`);
      }

      return {
        employeeId: employee._id.toString(),
        payrollItemId: item._id.toString(),
        email,
        amount,
        currency,
      };
    });

    // 4. Prepare local transaction records
    senderBatchId = `PAYROLL_${crypto.randomUUID()}`;

    const transactionRecords = payoutItems.map((item) => ({
      companyId,
      payrollBatchId: payrollBatch._id,
      payrollItemId: item.payrollItemId,
      employeeId: item.employeeId,
      amount: mongoose.Types.Decimal128.fromString(item.amount),
      currency: item.currency,
      provider: "paypal",
      idempotencyKey: `${payrollBatch._id}_${item.payrollItemId}`,
      status: "pending",
      senderBatchId,
    }));

    // 5. Atomically claim batch and create transactions
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const claimedBatch = await PayrollBatch.findOneAndUpdate(
          {
            _id: payrollBatch._id,
            companyId,
            status: "approved",
            approvalVersion: payrollBatch.approvedVersion,
            approvedVersion: payrollBatch.approvedVersion,
          },
          {
            $set: { status: "processing" },
          },
          {
            new: true,
            session,
          }
        );

        if (!claimedBatch) {
          throw new Error("Payroll batch changed or was already claimed");
        }

        claimedBatchId = claimedBatch._id;

        const existing = await PaymentTransaction.countDocuments({
          companyId,
          payrollBatchId: payrollBatch._id,
        }).session(session);

        if (existing > 0) {
          throw new Error("Payment transactions already exist for this batch");
        }

        await PaymentTransaction.insertMany(transactionRecords, {
          session,
          ordered: true,
        });
      });
    } finally {
      await session.endSession();
    }

    // 6. Submit payout request to PayPal Sandbox
    providerRequestStarted = true;

    const paypalResponse = await createPayPalPayout(
      payoutItems,
      senderBatchId
    );

    providerBatchId = paypalResponse.batch_header?.payout_batch_id;

    if (!providerBatchId) {
      throw new Error("PayPal did not return a payout batch ID");
    }

    // 7. Save provider batch ID and update local status
    const updateResult = await PaymentTransaction.updateMany(
      {
        companyId,
        payrollBatchId: payrollBatch._id,
        senderBatchId,
      },
      {
        $set: {
          providerBatchId,
          status: "processing",
        },
      }
    );

    if (updateResult.matchedCount !== payoutItems.length) {
      throw new Error("Transaction update incomplete. Reconciliation required.");
    }

    await PayrollBatch.updateOne(
      {
        _id: payrollBatch._id,
        companyId,
      },
      {
        $set: {
          "items.$[].paymentStatus": "processing",
        },
      }
    );

    return res.status(202).json({
      message: "Payout request accepted by PayPal Sandbox",
      payrollBatchId: payrollBatch._id,
      providerBatchId,
      transactionCount: transactionRecords.length,
      providerStatus: paypalResponse.batch_header?.batch_status,
    });

  } catch (error) {
    console.error("Payroll payment error:", error);

    // 8. Never automatically retry an uncertain provider request
    if (providerRequestStarted && senderBatchId) {
      await PaymentTransaction.updateMany(
        {
          companyId,
          senderBatchId,
          status: { $in: ["pending", "processing"] },
        },
        {
          $set: {
            status: "unknown",
            ...(providerBatchId ? { providerBatchId } : {}),
            failureReason:
              "Payout outcome uncertain. Provider reconciliation required.",
          },
        }
      ).catch((updateError) => {
        console.error("Unable to mark transactions unknown:", updateError);
      });

      return res.status(202).json({
        message:
          "Payout outcome is uncertain. Reconcile with PayPal Sandbox before retrying.",
        payrollBatchId: claimedBatchId,
        providerBatchId: providerBatchId || null,
      });
    }

    return res.status(500).json({
      message: error.message || "Unable to initiate payroll payments",
    });
  }
};







