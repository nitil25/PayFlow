import mongoose from "mongoose"

const companySchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, "Company name is required"],
        minlength:2
    },
    ownerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true,
        index:true
    },
    email:{
        type:String,
        required:true,
    },
    country:{
        type:String,
        required:[true, "Company country is required"],
    },
    baseCurrency:{
        type:String,
        required:true,
        default:"USD"
    },

    address:{
        street:{
            type:String,
            default:""
        },
        city: {
        type: String,
        default: "",
      },
      state: {
        type: String,
        default: "",
      },
      postalCode: {
        type: String,
        default: "",
      }
    },

    settings: {
      payrollApprovalRequired: {
        type: Boolean,
        default: true,
      },

      defaultPaymentProvider: {
        type: String,
        enum: ["paypal"],
        default: "paypal",
      },

      automaticPayoutEnabled: {
        type: Boolean,
        default: false,
      },
    },

    dashboardDefaultSettings: {
      type:String,
      enum:["30_days","3_months","6_months","12_months"],
      default:"30_days"
    },
    notificationsEnabled:{
      type:Boolean,
      default:true
    },
    status:{
        type:String,
        enum:["active", "suspended", "inactive"],
        default:"active",
        required:true
    }

},{timestamps:true})

const Company = mongoose.models.Company || mongoose.model("Company", companySchema)

export default Company