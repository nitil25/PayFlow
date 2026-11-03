import express from "express"
import { approvePayrollBatch, calculatePayrollBatch, createPayrollBatch, deletePayrollBatch, getPayrollBatch, submitPayrollBatch } from "../controllers/payrollBatch.controller.js"
import isAuth from "../middlewares/isAuth.js"

const payrollBatchRouter = express.Router()


payrollBatchRouter.post("/create", isAuth, createPayrollBatch)
payrollBatchRouter.get("/all",isAuth,getPayrollBatch)
payrollBatchRouter.get("/:id",isAuth,getPayrollBatch)
payrollBatchRouter.get("/calculate/:id",isAuth,calculatePayrollBatch)
payrollBatchRouter.get("/submit/:id", isAuth, submitPayrollBatch)
payrollBatchRouter.get("/approve/:id", isAuth, approvePayrollBatch)
payrollBatchRouter.get("/cancel/:id", isAuth, deletePayrollBatch)


export default payrollBatchRouter