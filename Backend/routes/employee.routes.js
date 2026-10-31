import express from "express"
import { addEmployee, getAllEmployees, getEmployeeById, removeEmployee ,updateEmployeeDetails } from "../controllers/employee.controller.js"
import isAuth from "../middlewares/isAuth.js"

const employeeRouter = express.Router()

employeeRouter.post("/add",isAuth, addEmployee)
employeeRouter.get("/all",isAuth, getAllEmployees)
employeeRouter.get("/:id",isAuth, getEmployeeById)
employeeRouter.post("/edit/:id",isAuth, updateEmployeeDetails)
employeeRouter.delete("/remove/:id",isAuth, removeEmployee)

export default employeeRouter