import User from "../models/user.model.js"
import Employee from "../models/employee.model.js"
import Company from "../models/company.model.js"


// add an employee POST method /api/add/employee
export const addEmployee = async(req,res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const company = await Company.findOne({ownerId:userId})

        if(!company){
            return res.status(400).json({
                message:"Create a company first"
            })
        }

        const {employeeCode, name, email, phone, country, jobTitle, department, salary, paymentMethods, status} = req.body

        if(!employeeCode || !name || !email || !phone || !country || !jobTitle || !department || !salary || !paymentMethods){
            return res.status(400).json({
                message:"All fields must be filled"
            })
        }

        const employee = await Employee.create({
            companyId:company._id,
            employeeCode,
            name,
            email,
            phone,
            country,
            jobTitle,
            department,
            salary,
            paymentMethods,
        })

        return res.status(201).json({
            message:"Employee added successfully",
            employee
        })

    } catch (error) {
        console.log(`Add employee error : ${error.message}`)
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

// get all employees GET method /api/employees
export const getAllEmployees = async(req,res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const company = await Company.findOne({ownerId:userId})

        if(!company){
            return res.status(400).json({
                message:"Create a company first"
            })
        }

        const employees = await Employee.find({companyId:company._id})  

        return res.status(200).json({
            message:"Employees fetched successfully",
            employees
        })
    }
    catch(error){
        console.log(`Get all employee error : ${error.message}`)
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

// get employee by id GET method /api/employee/:id
export const getEmployeeById = async(req,res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const company = await Company.findOne({ownerId:userId})

        if(!company){
            return res.status(400).json({
                message:"Create a company first"
            })
        }

        const employee = await Employee.findById(req.params.id)

        if(!employee){
            return res.status(404).json({
                message:"Employee not found"
            })
        }

        return res.status(200).json({
            message:"Employee fetched successfully",
            employee
        })
    } catch (error) {
        console.log(`Get employee by id error : ${error.message}`)
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

// update employee details POST method /api/employee/:id
export const updateEmployeeDetails = async(req,res)=>{
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const company = await Company.findOne({ownerId:userId})

        if(!company){
            return res.status(400).json({
                message:"Create a company first"
            })
        }

        const employee = await Employee.findById(req.params.id)

        if(!employee){
            return res.status(404).json({
                message:"Employee not found"
            })
        }

        // Update employee details
        const { name, email, phone, country, jobTitle, department, salary, paymentMethods, status } = req.body

        const updatedEmployee = await Employee.findByIdAndUpdate(
            req.params.id,
            { name, email, phone, country, jobTitle, department, salary, paymentMethods, status },
            { new: true }
        )

        return res.status(200).json({
            message:"Employee updated successfully",
            employee: updatedEmployee
        })
    } catch (error) {
        console.log(`Update employee details error : ${error.message}`)
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}

// remove an employee DELETE method /api/employee/:id
export const removeEmployee = async(req,res)=>{
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const company = await Company.findOne({ownerId:userId})

        if(!company){
            return res.status(400).json({
                message:"Create a company first"
            })
        }

        const employee = await Employee.findById(req.params.id)

        if(!employee){
            return res.status(404).json({
                message:"Employee not found"
            })
        }

        await Employee.findByIdAndDelete(req.params.id)

        return res.status(200).json({
            message:"Employee removed successfully"
        })
    } catch (error) {
        console.log(`Remove employee error : ${error.message}`)
        return res.status(500).json({
            message:"Internal server error"
        })
    }
}
