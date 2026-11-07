import mongoose from "mongoose";

const payrollScheduleSchema = new mongoose.Schema(
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
    scheduledAt: {
      type: Date,
      required: true,
    },
    mode: {
      type: String,
      enum: ["manual_confirmation", "authorized_automatic"],
      default: "manual_confirmation",
    },
    status: {
      type: String,
      enum: [
        "scheduled",
        "awaiting_confirmation",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "scheduled",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastAttemptAt: {
      type: Date,
      default: null,
    },
    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    confirmedAt: {
      type: Date,
      default: null,
    },
    timezone: {
      type: String,
      required: true,
      default: "UTC",
    },
  },
  { timestamps: true },
);

payrollScheduleSchema.index({
  status: 1,
  scheduledAt: 1,
});

payrollScheduleSchema.index({
  companyId: 1,
  payrollBatchId: 1,
});

const PayrollSchedule = mongoose.model(
  "PayrollSchedule",
  payrollScheduleSchema,
);

export default PayrollSchedule;
