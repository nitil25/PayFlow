import express from "express"
import { approvePayrollImport, getPayrollImportById, getPayrollImports, processPayrollImport, reviewPayrollImport, uploadPayrollFile } from "../controllers/payrollImport.controller.js"
import isAuth from '../middlewares/isAuth.js'
import upload from "../middlewares/uploadMiddleware.js"

const payrollRouter = express.Router()

payrollRouter.post("/upload", isAuth, upload.single("payrollFile") , uploadPayrollFile)
payrollRouter.get("/all",isAuth, getPayrollImports)
payrollRouter.get("/:id",isAuth, getPayrollImportById)
payrollRouter.post("/process/:id",isAuth, processPayrollImport)
payrollRouter.post("/review/:id", isAuth, reviewPayrollImport)
payrollRouter.post("/approve/:id", isAuth, approvePayrollImport) 

export default payrollRouter