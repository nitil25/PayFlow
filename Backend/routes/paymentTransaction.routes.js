import express from "express"
import { getPaymentTransaction, getPaymentTransactionById, getPaymentStatistics, initiatePayrollPayments } from "../controllers/paymentTransaction.controller.js"
import isAuth from "../middlewares/isAuth.js"

const paymentTransactionRouter = express.Router()

paymentTransactionRouter.get("/",isAuth, getPaymentTransaction)
paymentTransactionRouter.get("/statistics",isAuth, getPaymentStatistics)
paymentTransactionRouter.get("/:id",isAuth, getPaymentTransactionById)
paymentTransactionRouter.post("/initiate-payroll-payments", isAuth, initiatePayrollPayments)

export default paymentTransactionRouter