import express from "express"
import isAuth from "../middlewares/isAuth.js"
import { createCompany, getMyCompany, updateCompanyDetails, updatePayoutPreferences } from "../controllers/company.controller.js"

const companyRouter = express.Router()

companyRouter.post("/create", isAuth, createCompany)
companyRouter.get("/me", isAuth ,getMyCompany)
companyRouter.post("/me",isAuth, updateCompanyDetails)
companyRouter.post("/me/payout-settings", isAuth, updatePayoutPreferences)

export default companyRouter