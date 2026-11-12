
import mongoose from "mongoose";

const paymentTransactionSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    payrollBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PayrollBatch",
      required: true,
    },

    payrollItemId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    amount: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },

    provider: {
      type: String,
      required: true,
      enum: ["paypal"],
      default: "paypal",
    },

    idempotencyKey: {
      type: String,
      required: true,
      immutable: true,
    },

    providerTransactionId: {
      type: String,
      default: null,
    },

    providerBatchId: {
      type: String,
      default: null,
    },

    senderBatchId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "unknown",
      ],
      default: "pending",
    },

    failureReason: {
      type: String,
      default: null,
      trim: true,
    },

    initiatedAt: {
      type: Date,
      default: Date.now,
    },

    paidAt: {
      type: Date,
      default: null,
    },

    lastProviderCheckAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate transactions within a company.
paymentTransactionSchema.index(
  {
    companyId: 1,
    idempotencyKey: 1,
  },
  { unique: true }
);

// Prevent duplicate PayPal transaction IDs.
paymentTransactionSchema.index(
  {
    provider: 1,
    providerTransactionId: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      providerTransactionId: { $type: "string" },
    },
  }
);

paymentTransactionSchema.index({
  companyId: 1,
  createdAt: -1,
});

paymentTransactionSchema.index({
  payrollBatchId: 1,
  employeeId: 1,
});

const PaymentTransaction = mongoose.model(
  "PaymentTransaction",
  paymentTransactionSchema
);

export default PaymentTransaction;
