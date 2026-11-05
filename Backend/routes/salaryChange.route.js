import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { applyAllSalaryChanges, applySalaryChange, approveAllSalaryChanges, createSalaryChange, getSalaryChange, getSalaryChangeById } from "../controllers/salaryChange.controller.js"

const salaryChangeRouter = express.Router()

salaryChangeRouter.post("/create",isAuth,createSalaryChange)

salaryChangeRouter.get("/",isAuth,getSalaryChange)

salaryChangeRouter.get("/:id",isAuth,getSalaryChangeById)

salaryChangeRouter.get("/approve/all",isAuth,approveAllSalaryChanges)

salaryChangeRouter.get("/approve/:id",isAuth,applySalaryChange)

salaryChangeRouter.get("/apply/all",isAuth,applyAllSalaryChanges)

salaryChangeRouter.get("/apply/:id",isAuth,applySalaryChange)

export default salaryChangeRouter