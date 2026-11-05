import User from "../models/user.model.js";
import PayrollBatch from "../models/payrollBatch.model.js";
import Employee from "../models/employee.model.js";
import SalaryChange from "../models/salaryChange.model.js";
import mongoose from "mongoose";

// create a salary change request
export const createSalaryChange = async (req, res) => {
  try {
    const {
      employeeId,
      payrollBatchId,
      newAmount,
      reason,
      source,
      instruction,
    } = req.body;

    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    const companyId = user.companyId;
    const requestedBy = user._id;

    if (!employeeId || newAmount === undefined || !reason) {
      return res.status(400).json({
        message: "Employee, new Salary and reason are required",
      });
    }

    const amount = Number(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        message: "New salary must be a valid positive number",
      });
    }

    const employee = await Employee.findOne({ _id: employeeId, companyId });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    const currency = employee.salary.currency;

    if (payrollBatchId) {
      const batch = await PayrollBatch.findOne({
        _id: payrollBatchId,
        companyId,
      });
      if (!batch) {
        return res.status(404).json({
          message: "PAyroll batch not found",
        });
      }
    }

    const salaryChange = await SalaryChange.create({
      companyId,
      employeeId,
      payrollBatchId: payrollBatchId || null,
      requestedBy,
      source: source || "manual",
      instruction,
      oldAmount: employee.salary.amount,
      newAmount: mongoose.Types.Decimal128.fromString(amount.toString()),
      currency,
      reason,
      status: "proposed",
    });

    return res.status(201).json({
      success: true,
      message: "Salary change request created successfully",
      data: salaryChange,
    });
  } catch (error) {
    console.log(`Create salary change error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to create the change in the salary",
    });
  }
};

// Get all salary change requests for a company
export const getSalaryChange = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const companyId = user.companyId;

    const { status, employeeId, page = 1, limit = 10 } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit)) || 10);

    const filter = { companyId };

    if (status) filter.status = status;
    if (employeeId) filter.employeeId = employeeId;

    const [salaryChanges, total] = await Promise.all([
      SalaryChange.find(filter)
        .populate("employeeId", "name email employeeCode")
        .populate("requestedBy", "name email")
        .populate("approvedBy", "name email")
        .sort({ createdAt: -1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),

      SalaryChange.countDocuments(filter),
    ]);

    return res.status(200).json({
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      data: salaryChanges,
    });
  } catch (error) {
    console.log(`Get salary change error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to fatch all the request to change in the salary",
    });
  }
};

// Get a single employee salary change request
export const getSalaryChangeById = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const salaryChange = await SalaryChange.findOne({
      _id: req.params.id,
      companyId: user.companyId,
    })
      .populate("employeeId")
      .populate("requestedBy", "name email")
      .populate("approvedBy", "name email");

    if (!salaryChange) {
      return res.status(404).json({
        message: "Salary change request not found",
      });
    }

    return res.status(200).json({
      data: salaryChange,
    });
  } catch (error) {
    console.log(`Get change salary by id error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to get the salary by id",
    });
  }
};

// reject salary change request
export const rejectSalaryChange = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    const salaryChange = await SalaryChange.findOne({
      _id: req.params.id,
      companyId: user.companyId,
      status: "proposed",
    });

    if (!salaryChange) {
      return res.status(404).json({
        message: "Pending salary change request not found",
      });
    }

    salaryChange.status = "rejected";

    await salaryChange();

    return res.status(200).json({
      message: "Salary change request rejected",
      data: salaryChange,
    });
  } catch (error) {
    console.log(`Reject salary chaneg req error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to reject the salary change",
    });
  }
};

// Apply and approve salary change
export const applySalaryChange = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    let updatedSalaryChange;
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    await session.withTransaction(async () => {
      const salaryChange = await SalaryChange.findOne({
        _id: req.params.id,
        companyId: user.companyId,
        status: "proposed",
      }).session(session);

      if (salaryChange) {
        salaryChange.approvedBy = user._id;
        salaryChange.approvedAt = Date.now();
      }

      if (!salaryChange) {
        throw new Error("Approved salary change request not found");
      }

      // Update only if the employee still has the original salary.
      // This prevents an outdated request overwriting a newer salary.
      const employee = await Employee.findOneAndUpdate(
        {
          _id: salaryChange.employeeId,
          companyId: user.companyId,
          "salary.amount": salaryChange.oldAmount,
          "salary.currency": salaryChange.currency,
        },
        {
          $set: {
            "salary.amount": salaryChange.newAmount,
          },
        },
        {
          new: true,
          runValidators: true,
          session,
        },
      );

      if (!employee) {
        throw new Error(
          "Employee salary has changed since this request was created. Create a new request.",
        );
      }

      salaryChange.status = "applied";
      salaryChange.appliedAt = new Date();

      await salaryChange.save({ session });

      updatedSalaryChange = salaryChange;
    });

    return res.status(200).json({
      message: "Salary change applied successfully",
      data: updatedSalaryChange,
    });
  } catch (error) {
    console.log(`Salary approved change error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to approve the salary change",
    });
  } finally {
    await session.endSession();
  }
};

// Approve all salary change
export const approveAllSalaryChanges = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    console.log(userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const companyId = user.companyId;
    const approvedBy = user._id;

    const result = await SalaryChange.updateMany(
      { companyId, status: "proposed" },
      { $set: { status: "approved", approvedBy, approvedAt: new Date() } },
    );

    return res.status(200).json({
      message: `${result.modifiedCount} salary change requests approved`,
      summary: result,
      data: SalaryChange,
    });
  } catch (error) {
    console.log(`Approve all salary change error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to approve all the salary changes",
    });
  }
};

// Applied all salary change
export const applyAllSalaryChanges = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const companyId = user.companyId;
    const approvedChanges = await SalaryChange.find({
      companyId,
      status: "approved",
    }).select("_id");

    const results = {
      total: approvedChanges.length,
      applied: [],
      failed: [],
    };

    for (const item of approvedChanges) {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          const salaryChange = await SalaryChange.findOne({
            _id: item._id,
            companyId,
            status: "approved",
          }).session(session);

          if (!salaryChange) {
            throw new Error("Request is no longer approved");
          }

          const employee = await Employee.findOneAndUpdate(
            {
              _id: salaryChange.employeeId,
              companyId,
              "salary.amount": salaryChange.oldAmount,
              "salary.currency": salaryChange.currency,
            },
            {
              $set: {
                "salary.amount": salaryChange.newAmount,
              },
            },
            {
              new: true,
              runValidators: true,
              session,
            }
          );
          if (!employee) {
            throw new Error(
              "Employee salary has changed. A new request is required."
            );
          }

          salaryChange.status = "applied";
          salaryChange.appliedAt = new Date();

          await salaryChange.save({ session });
        });

        results.applied.push({
          salaryChangeId: item._id,
          status: "applied",
        });

      } catch (error) {
        results.failed.push({
          salaryChangeId: item._id,
          reason: error.message,
        });
      } finally {
        await session.endSession();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Bulk salary change processing completed",
      summary: {
        total: results.total,
        applied: results.applied.length,
        failed: results.failed.length,
      },
      results,
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
