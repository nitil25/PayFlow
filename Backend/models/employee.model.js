import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Company",
        required:true
    },
    employeeCode:{
        type:String,
        required:true,
        trim:true
    },
    name:{
        type:String,
        required:true,
    },
    email:{
        type:String,
        lowercase:true,
    },
    phone:{
        type:String,
    },
    country:{
        type:String,
        required:true,
        minlength:2
    },
    jobTitle:{
        type:String,
    },
    department:{
        type:String
    },
    

    // salary info
    salary:{
        amount:{
            type:mongoose.Schema.Types.Decimal128,
            required:true
        },
        currency:{
            type:String,
            required:true,
        },
    },

    // Payment information
    paymentMethods:{
        provider:{
            type:String,
            enum:["paypal"],
            default:"paypal"
        },
        recipientEmail:{
            type:String,
            lowercase:true
        },
        recipientRefrence:{
            type:String
        }
    },

    // Employee status
    status:{
        type:String,
        enum:["active", "inactive", "on_leave"],
        default:"active"
    }

},{timestamps:true})

employeeSchema.index(
    {companyId:1, employeeCode:1},{unique:true}
)

const Employee = mongoose.models.Employee || mongoose.model("Employee", employeeSchema)

export default Employee