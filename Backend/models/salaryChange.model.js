import mongoose from "mongoose"

const salaryChangeSchema = new mongoose.Schema({
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Company",
        required:true,
        index:true
    },
    employeeId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Employee",
        required:true
    },
    payrollBatchId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"PayrollBatch",
        default:null
    },
    requestedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    source:{
        type:String,
        enum:["manual", "ai_text", "ai_voice","import"],
        default:"manual"
    },
    instruction:{
        type:String,
        trim:true,
        maxlength:2000
    },
    oldAmount:{
        type:mongoose.Schema.Types.Decimal128,
        required:true
    },

    newAmount:{
        type:mongoose.Schema.Types.Decimal128,
        required:true
    },
    currency:{
        type:String,
        required:true,
        trim:true
    },
    reason:{
        type:String,
        trim:true,
        required:true
    },
    status:{
        type:String,
        enum:["proposed","approved","rejected","applied"],
        default:"proposed"
    },
    approvedBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null
    },
    approvedAt:{
        type:Date,
        default:null
    },
    appliedAt:{
        type:Date,
        default:null
    }
},{timestamps:true})


salaryChangeSchema.index({
    employeeId:1,
    createdAt:-1
})

const SalaryChange = mongoose.model("SalaryChange", salaryChangeSchema)
export default SalaryChange