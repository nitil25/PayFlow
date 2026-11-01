import mongoose from "mongoose";

const extractedRecordSchema = new mongoose.Schema({
    rowNumber:{
        type:Number,
        required:true
    },
    employeeCode:{
        type:String,
        trim:true
    },
    name:{
        type:String,
        trim:true,
    },
    email:{
        type:String,
        lowercase:true,
        trim:true
    },
    country:{
        type:String,
        trim:true
    },


    salary: {
      amount: {
        type: mongoose.Schema.Types.Decimal128,
      },
      currency: {
        type: String,
        uppercase: true,
        trim: true,
      },
      payFrequency: {
        type: String,
        enum: ["weekly", "biweekly", "monthly"],
      },
    },


    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    matchedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    action: {
      type: String,
      enum: ["create", "update", "skip"],
      default: "create",
    },


    rowStatus: {
      type: String,
      enum: ["pending", "valid", "invalid", "duplicate"],
      default: "pending",
    },

    validationErrors: [
      {
        type: String,
      },
    ],
},{_id:true})


const validationErrorSchema = new mongoose.Schema(
  {
    rowNumber: Number,
    field: String,
    code: String,
    message: String,
    severity: {
      type: String,
      enum: ["warning", "error"],
      default: "error",
    },
  },
  { _id: false }
);

const payrollImportSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileType: {
      type: String,
      enum: ["csv", "xlsx", "xls", "pdf"],
      required: true,
    },

    storageKey: {
      type: String,
      required: true,
      select: false,
    },

    fileSize: {
      type: Number,
      required: true,
    },

    processingStatus: {
      type: String,
      enum: [
        "uploaded",
        "processing",
        "needs_review",
        "approved",
        "failed",
        "archived",
      ],
      default: "uploaded",
    },

    extractedRecords: [extractedRecordSchema],

    validationErrors: [validationErrorSchema],

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    processingStartedAt: Date,

    processingCompletedAt: Date,
  },
  {
    timestamps: true,
  }
);

payrollImportSchema.index({ companyId: 1, createdAt: -1 });

const PayrollImport = mongoose.model("PayrollImport", payrollImportSchema)

export default PayrollImport