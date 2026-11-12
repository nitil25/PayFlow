import dotenv from "dotenv";
dotenv.config()
import express from "express"
import cookieParser from "cookie-parser"
import connectDb from "./utils/db.js";
import authRouter from "./routes/auth.routes.js";
import companyRouter from "./routes/company.routes.js";
import employeeRouter from "./routes/employee.routes.js";
import payrollRouter from "./routes/payrollImport.routes.js";
import cors from "cors"
import multerConfig from "./utils/multer.js";
import payrollBatchRouter from "./routes/payrollBatch.route.js";
import salaryChangeRouter from "./routes/salaryChange.route.js";
import payrollScheduleRouter from "./routes/payrollSchedule.routes.js";
import paymentTransactionRouter from "./routes/paymentTransaction.routes.js";
import paypalWebhookRouter from "./routes/paypalWebhook.routes.js";

const app = express()

const PORT = process.env.PORT || 8000

const corsOption = {
    origin:"http://localhost:5176",
    credentials:true
}


// All the middlewares
app.use(express.json())
app.use(cookieParser())
app.use(express.urlencoded({extended:true}))
app.use(cors(corsOption))
app.use(multerConfig)


// All the apis routes
app.use("/api/auth",authRouter)
app.use("/api/company", companyRouter)
app.use("/api/employee", employeeRouter)
app.use("/api/payroll",payrollRouter)
app.use("/api/payroll-batch",payrollBatchRouter)
app.use("/api/salary-change",salaryChangeRouter)
app.use("/api/payroll-schedule",payrollScheduleRouter)
app.use("/api/payment",paymentTransactionRouter)

// Paypal Webhook
app.use("/api/webhooks/paypal", paypalWebhookRouter)




app.listen(PORT, ()=>{
    connectDb()
    console.log(`Server is running on the PORT ${PORT}`)
})