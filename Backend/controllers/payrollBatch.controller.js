import mongoose from "mongoose";
import Decimal from "decimal.js";

import PayrollBatch from "../models/payrollBatch.model.js";
import Employee from "../models/employee.model.js";
import User from "../models/user.model.js"

// Helper: convert a value into Decimal safely
const toDecimal = (value) => {
  try {
    const result = new Decimal(String(value));

    if (!result.isFinite()) {
      throw new Error("Invalid amount");
    }

    return result;
  } catch {
    throw new Error("Please provide a valid monetary amount.");
  }
};

// Helper: convert Decimal into MongoDB Decimal128
const toDecimal128 = (value) => {
  return mongoose.Types.Decimal128.fromString(
    value.toString()
  );
};

// Helper: get a company's payroll batch
const findCompanyBatch = (id, companyId) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return null;
  }

  return PayrollBatch.findOne({
    _id: id,
    companyId,
  });
};

// Helper: calculate every employee's final amount and currency totals
const calculateBatchTotals = (items) => {
  const totals = new Map();

  for (const item of items) {
    const base = toDecimal(item.baseAmount);

    if (base.isNegative()) {
      throw new Error("Base salary cannot be negative.");
    }

    let finalAmount = base;

    for (const adjustment of item.adjustments || []) {
      const amount = toDecimal(adjustment.amount);

      if (!amount.isFinite() || amount.lte(0)) {
        throw new Error("Adjustment amounts must be positive.");
      }

      if (adjustment.type === "deduction") {
        finalAmount = finalAmount.minus(amount);
      } else {
        finalAmount = finalAmount.plus(amount);
      }
    }

    if (finalAmount.isNegative()) {
      throw new Error(
        `Deductions cannot exceed salary for ${item.employeeName}.`
      );
    }

    item.finalAmount = toDecimal128(finalAmount);

    const currency = item.currency.toUpperCase();

    totals.set(
      currency,
      (totals.get(currency) || new Decimal(0)).plus(finalAmount)
    );
  }

  const currencyBreakdown = Array.from(
    totals.entries()
  ).map(([currency, total]) => ({
    currency,
    total: toDecimal128(total),
  }));

  // totalAmount is meaningful only when there is one currency
//   const totalAmount =
//     totals.size === 1
//       ? toDecimal128([...totals.values()][0])
//       : toDecimal128(new Decimal(0));


  const totalAmount =
    totals.size === 1
        ? toDecimal128([...totals.values()][0])
        : null;

  return {
    currencyBreakdown,
    totalAmount,
  };
};

// Helper: calculate and save totals
const refreshBatchTotals = (batch) => {
  const totals = calculateBatchTotals(batch.items);

  batch.currencyBreakdown = totals.currencyBreakdown;
  batch.totalAmount = totals.totalAmount;
};

// Create Payroll Batch  POST method
export const createPayrollBatch = async(req, res) => {
    try {

        const userId = req.userId

        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({
                message: "User not found"
            })
        }

        const {batchName, startDate, endDate, employeeIds} = req.body

        if(!startDate || !endDate){
            return res.status(400).json({
                message:"Payroll start date and end date are required"
            })
        }

        const start = new Date(startDate)
        const end = new Date(endDate)

        if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end){
            message:"Please provide a valid payroll date"
        }


        if(employeeIds !== undefined  && (!Array.isArray(employeeIds) || employeeIds.length === 0 || employeeIds.some((id) => !mongoose.Types.ObjectId.isValid(id)))){
            return res.status(400).json({
                message:"Please provide valid employee IDs"
            })
        }

        const employeeFilter = {
            companyId : user.companyId,
            status : "active"
        }

        if(employeeIds){
            employeeFilter._id = {$in : employeeIds}
        }

        const employees = await Employee.find(employeeFilter)

        if(!employees.length){
            return res.status(400).json({
                message:"No active employee were found"
            })
        }

        if(employeeIds && employees.length !== new Set(employeeIds).size){
            return res.status(400).json({
                message:"Some employees were not found in your company or are incative"
            })
        }

        const items = employees.map((employee) => ({
            employeeId:employee._id,
            employeeName: employee.name,
            employeeCode: employee.employeeCode,
            country:employee.country,
            baseAmount:employee.salary.amount,
            adjustments: [],
            finalAmount: employee.salary.amount,
            currency: employee.salary.currency,
            paymentStatus: "pending"
        }))

        const batch = await PayrollBatch.create({
            companyId: user.companyId,
            batchName,
            period:{
                startDate:start,
                endDate:end
            },
            items,
            createdBy:user._id,
            status:"draft"
        })

        refreshBatchTotals(batch)

        await batch.save()

        return res.status(201).json({
            message:"Payroll batch created successfully",
            data:batch
        })

    } catch (error) {
        console.log(`Create payroll batch error : ${error.message}`)
        return res.status(400).json({
            message:"Internal server error"
        })
    }
}

// Get all the payroll batched GET method
export const getPayrollBatch = async(req, res) => {
    try {
        const userId = req.userId

        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const batches = await PayrollBatch.find({
            companyId:user.companyId
        }).select("-items").sort({createdAt: -1})

        return res.status(200).json({
            count:batches.length,
            data:batches
        })

    } catch (error) {
        console.log(`Get all payroll error : ${error.message}`)
        return res.status(400).json({
            message: "Failed to fetch payroll batches"
        })
    }
}

// Get payroll batch by id  GET method
export const getPayrollBatchById = async(req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({
                message: "User not found"
            })
        }

        const batch = await findCompanyBatch(req.paramd.id, user.companyId)

        if(!batch){
            return res.status(404).json({
                message:"Payroll batch not found"
            })
        }

        return res.status(200).json({
            data:batch
        })

    } catch (error) {
        console.log(`Get payroll batch by id error : ${error.message}`)
        return res.status(400).json({
            message: "Failed to fetch the payroll batch"
        })
    }
}

// update a draft payroll batch  POST method
export const updatePayrollBatch = async(req, res) => {
    try {
        const userId = req.userId

        const user = await User.findById(userId)

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const batch = await findCompanyBatch(req.params.id, user.companyId)

        if(!batch){
            return res.status(404).json({
                message:"Payroll batch not found"
            })
        }

        if(batch.status !== "draft"){
            return res.status(400).json({
                message:"Only draft payroll batches can be edited"
            })
        }

        const {batchName, startDate, endDate, items} = req.body

        if(batchName !== undefined){
            batch.batchName = batchName
        }

        if(startDate !== undefined || endDate !== undefined){
            const start = new Date(startDate ?? batch.period.startDate)
            const end = new Date(endDate ?? batch.period.endDate)

            if(Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end ){
                return res.status(400).json({
                    message:"Invalid payroll date range"
                })
            }

            batch.period.startDate = start
            batch.period.endDate = end
        }

        if(items !== undefined){
            if(!Array.isArray(items)){
                return res.status(400).json({
                    message:"Items must be an array"
                })
            }
        }

        for(const update of items){
            const items = batch.items.find(
                (entry) => entry._id.toString() === update.itemId
            )

            if(!items){
                return res.status(400).json({
                    message:"Invalid payroll item"
                })
            }

            if(update.adjustments !== undefined){
                if(!Array.isArray(update.adjustments)){
                    return res.status(400).json({
                        message:"Adjusments must be an array"
                    })
                }

                item.adjustments = update.adjustments.map((adjustment) => ({
                    type:adjustment.type,
                    amount: adjustment.amount,
                    reason: adjustment.reason
                }))
            }
        }

        refreshBatchTotals(batch)
        await batch.save()

        return res.status(400).json({
            message: "Payroll batch updated successfully",
            data:batch
        })

    } catch (error) {
        console.log(`update payroll batch error : ${error.message}`)
        return res.status(400).json({
            message:"Failed to update the payroll"
        })
    }
}

// Calculate payroll GET method
export const calculatePayrollBatch = async(req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId)

        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }

        const batch = await findCompanyBatch(req.params.id, user.companyId)

        if(!batch){
            return res.status(404).json({
                message:"Payroll batch not found"
            })
        }

        if(batch.status !== "draft"){
            return res.status(400).json({
                message:"Only draft batches can be recalculated"
            })
        }

        refreshBatchTotals(batch)
        await batch.save()

        return res.status(200).json({
            message:"Payroll calculated successfully",
            data:{
                items:batch.items,
                totalAmount: batch.totalAmount,
                currencyBreakdown : batch.currencyBreakdown
            }
        })

    } catch (error) {
        console.log(`Calculate the payroll batch error : ${error.message}`)
        return res.status(400).json({
            message:"Failed to calculate the payroll"
        })
    }
}

// Submit payroll for the approval
// need to 3 more i am tired now and i need sleep
export const submitPayrollBatch = async(req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(400).json({
                message:"User not found"
            })
        }

        const batch = await findCompanyBatch(req.params.id, user.companyId)

        if(!batch){
            return res.status(404).json({
                message:"Payroll batch not found"
            })
        }

        if(batch.status !== "draft" || !batch.items.length){
            return res.status(400).json({
                message:"Only non-empty draft batched can be submiitted"
            })
        }

        refreshBatchTotals(batch)

        for(const item of batch.items){
            if(!item.employeeId || !item.currency){
                return res.status(400).json({
                    message:"Every payroll items need an employee and currency"
                })
            }
        }

        batch.approvalVersion += 1
        batch.approvedVersion = null
        batch.approvedBy = null
        batch.approvedAt = null
        batch.status = "pending_approval"


        await batch.save()

        return res.status(200).json({
            message:"Payroll submitted for approval",
            data:batch
        })

    } catch (error) {
        console.log(`Submit payroll error : ${error.message}`)
        return res.status(400).json({
            message:"Failed to submit the payroll batch for approval"
        })
    }
}

// Approve the payroll 
export const approvePayrollBatch = async(req, res) => {
    try {
        const userId = req.userId
        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const batch = await findCompanyBatch(req.params.id, user.companyId)

        if(!batch){
            return res.status(404).json({
                message:"Payroll batch not found"
            })
        }

        if(batch.status !== "pending_approval"){
            return res.status(400).json({
                message:"This payroll is not waiting for approval"
            })
        }

        refreshBatchTotals(batch)

        batch.status = "approved"
        batch.approvedBy = user._id
        batch.approvedAt = new Date()
        batch.approvedVersion = batch.approvalVersion

        await batch.save()

        return res.status(200).json({
            message:"Payroll batch approved successfully"
        })

    } catch (error) {
        console.log(`Failed to approve the payroll : ${error.message}`)
        return res.status(400).json({
            message:"Failed to approve the payroll batch"
        })
    }
}

// delete the payroll batch
export const deletePayrollBatch = async(req, res) => {
    try {
        const userId = req.userId

        const user = await User.findById(userId).select("-password")

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        const batch = await findCompanyBatch(req.params.id, user.companyId)

        if(!batch){
            return res.status(404).json({
                message: "Payroll batch not found"
            })
        }

        const cancellableStatuses = ["draft","pending_approval","approved","scheduled"]

        if(!cancellableStatuses.includes(batch.status)){
            return res.status(400).json({
                message:"This payroll batch is no longer be cancelled"
            })
        }

        batch.status = "cancelled"
        batch.approvedVersion = null

        await batch.save()

        return res.status(200).json({
            message:"Payroll batch cancelled successfully"
        })

    } catch (error) {
        console.log(`Delete payroll batch error : ${error.message}`)
        return res.status(404).json({
            message:"Failed to delete the payroll batch"
        })
    }
}