import express from "express"
import { createPayrollSchedule,getPayrollSchedules,getPayrollScheduleById, updatePayrollSchedule, cancelPayrollSchedule,confirmPayrollSchedule } from "../controllers/payrollSchedule.controller.js"
import isAuth from "../middlewares/isAuth.js"

const payrollScheduleRouter = express.Router()

payrollScheduleRouter.post("/create",isAuth,createPayrollSchedule)
payrollScheduleRouter.get("/get/all", isAuth, getPayrollSchedules)
payrollScheduleRouter.get("/get/:id", isAuth, getPayrollScheduleById)
payrollScheduleRouter.post("/update/:id",isAuth,updatePayrollSchedule)
payrollScheduleRouter.get("/confirm/:id", isAuth, confirmPayrollSchedule)
payrollScheduleRouter.delete("/delete/:id", isAuth, cancelPayrollSchedule)

export default payrollScheduleRouter