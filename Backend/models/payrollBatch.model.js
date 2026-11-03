import mongoose from "mongoose";

// 1. Salary adjustments for an employee
const adjustmentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["bonus", "deduction", "overtime", "other"],
      required: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    reason: {
      type: String,
      trim: true,
      required: true,
    },
  },
  { _id: true }
);

// 2. Individual employee payroll details
const payrollItemSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    // Snapshot: preserves employee details at payroll creation
    employeeName: {
      type: String,
      required: true,
    },

    employeeCode: {
      type: String,
      required: true,
    },

    country: {
      type: String,
    },

    baseAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    adjustments: [adjustmentSchema],

    finalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "pending",
    },
  },
  { _id: true }
);

// 3. Main payroll batch schema
const payrollBatchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    batchName: {
      type: String,
      trim: true,
    },

    period: {
      startDate: {
        type: Date,
        required: true,
      },

      endDate: {
        type: Date,
        required: true,
      },
    },

    items: [payrollItemSchema],

    totalAmount: {
      type: mongoose.Schema.Types.Decimal128,
      default: 0,
    },

    // Separate totals for different currencies
    currencyBreakdown: [
      {
        currency: {
          type: String,
          required: true,
        },

        total: {
          type: mongoose.Schema.Types.Decimal128,
          required: true,
        },

        _id: false,
      },
    ],

    status: {
      type: String,
      enum: [
        "draft",
        "pending_approval",
        "approved",
        "scheduled",
        "processing",
        "completed",
        "partially_failed",
        "failed",
        "cancelled",
      ],
      default: "draft",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    approvedAt: {
      type: Date,
      default: null,
    },

    // Approval version protects against changes after approval
    approvalVersion: {
      type: Number,
      default: 0,
    },

    approvedVersion: {
      type: Number,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for company-specific payroll history
payrollBatchSchema.index({
  companyId: 1,
  createdAt: -1,
});

const PayrollBatch = mongoose.model("PayrollBatch",payrollBatchSchema);

export default PayrollBatch;
