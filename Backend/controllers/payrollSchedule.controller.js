import mongoose from "mongoose";
import PayrollSchedule from "../models/payrollSchedule.model.js";
import User from "../models/user.model.js";
import PayrollBatch from "../models/payrollBatch.model.js"

// Helper : validate IANA timezone
const isValid = (timezone) => {
  try {
    Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true
  } catch (error) {
    return false;
  }
};

// Create payroll schedule
export const createPayrollSchedule = async (req, res) => {
  try {
    const { payrollBatchId, scheduledAt, timezone, mode } = req.body;

    const userId = req.userId;

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    const companyId = user.companyId;
    const createdBy = user._id;

    if (!payrollBatchId || !scheduledAt) {
      return res.status(400).json({
        message: "Payroll batch and schedule date are required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(payrollBatchId)) {
      return res.status(400).json({
        message: "Invalid payroll batch Id",
      });
    }

    const scheduleDate = new Date(scheduledAt);

    if (Number.isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        message: "Invalid schedule date",
      });
    }

    if (scheduleDate <= new Date()) {
      return res.status(400).json({
        message: "Schedule date must be in the future",
      });
    }

    const selectedTimezone = timezone || "UTC";
    const selectedMode = mode || "manual_confirmation";

    if (
      !["manual_confirmation", "authorized_automatic"].includes(selectedMode)
    ) {
      return res.status(400).json({
        message: "Invalid scheduling mode",
      });
    }

    // Verify that the batch belongs to this company
    const batch = await PayrollBatch.findOne({
      _id: payrollBatchId,
      companyId,
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: "Payroll batch not found",
      });
    }

    // Only approved batches can be scheduled
    if (!["approved", "scheduled"].includes(batch.status)) {
      return res.status(400).json({
        success: false,
        message: "Only approved payroll batches can be scheduled",
      });
    }

    // Prevent multiple active schedules for the same batch
    const existingSchedule = await PayrollSchedule.findOne({
      companyId,
      payrollBatchId,
      status: {
        $in: ["scheduled", "awaiting_confirmation", "processing"],
      },
    });

    if (existingSchedule) {
      return res.status(409).json({
        success: false,
        message: "This payroll batch already has an active schedule",
      });
    }

    const schedule = await PayrollSchedule.create({
      companyId,
      payrollBatchId,
      scheduledAt: scheduleDate,
      timezone: selectedTimezone,
      mode: selectedMode,
      status: "scheduled",
      createdBy,
    });

    // Mark the batch as scheduled
    if (batch.status === "approved") {
      batch.status = "scheduled";
      await batch.save();
    }

    return res.status(201).json({
      success: true,
      message: "Payroll schedule created successfully",
      data: schedule,
    });

  } catch (error) {
    console.log(`Create payroll schedule error : ${error.message}`);
    return res.status(400).json({
      message: "Failed to create the payroll schedule",
    });
  }
};

// GET ALL PAYROLL SCHEDULES
export const getPayrollSchedules = async (req, res) => {
  try {

    const userId = req.userId

    const user = await User.findById(userId).select("-password")

    if(!user){
      return res.status(400).json({
        message:"User not found"
      })
    }

    const companyId = user.companyId;

    const {
      status,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNumber = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(limit) || 10));

    const filter = { companyId };

    if (status) {
      const allowedStatuses = [
        "scheduled",
        "awaiting_confirmation",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid schedule status",
        });
      }

      filter.status = status;
    }

    const [schedules, total] = await Promise.all([
      PayrollSchedule.find(filter)
        .populate("payrollBatchId")
        .populate("createdBy", "name email")
        .sort({ scheduledAt: 1 })
        .skip((pageNumber - 1) * pageSize)
        .limit(pageSize),

      PayrollSchedule.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / pageSize),
      data: schedules,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch payroll schedules",
      error: error.message,
    });
  }
};

// GET A SINGLE PAYROLL SCHEDULE
export const getPayrollScheduleById = async (req, res) => {
  try {

    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    if(!user){
      return res.status(404).json({
        message:"User not found"
      })
    }

    const schedule = await PayrollSchedule.findOne({
      _id: req.params.id,
      companyId:user.companyId,
    })
      .populate("payrollBatchId")
      .populate("createdBy", "name email");

    if (!schedule) {
      return res.status(404).json({
        message: "Payroll schedule not found",
      });
    }

    return res.status(200).json({
      data: schedule,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch payroll schedule",
      error: error.message,
    });
  }
};

// UPDATE / RESCHEDULE PAYROLL
export const updatePayrollSchedule = async (req, res) => {
  try {

    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    if(!user){
      return res.status(404).json({
        message:"User not found"
      })
    }

    const { scheduledAt, timezone, mode } = req.body;

    const schedule = await PayrollSchedule.findOne({
      _id: req.params.id,
      companyId: user.companyId,
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Payroll schedule not found",
      });
    }

    // Only pending schedules can be changed
    if (schedule.status !== "scheduled") {
      return res.status(400).json({
        message: "Only scheduled payrolls can be updated",
      });
    }

    if (scheduledAt !== undefined) {
      const newDate = new Date(scheduledAt);

      if (
        Number.isNaN(newDate.getTime()) ||
        newDate <= new Date()
      ) {
        return res.status(400).json({
          message: "Please provide a valid future date",
        });
      }

      schedule.scheduledAt = newDate;
    }

    if (timezone !== undefined) {
      if (!isValid(timezone)) {
        return res.status(400).json({
          message: "Invalid timezone",
        });
      }

      schedule.timezone = timezone;
    }

    if (mode !== undefined) {
      if (
        !["manual_confirmation", "authorized_automatic"].includes(mode)
      ) {
        return res.status(400).json({
          message: "Invalid scheduling mode",
        });
      }

      schedule.mode = mode;
    }

    await schedule.save();

    return res.status(200).json({
      success: true,
      message: "Payroll schedule updated successfully",
      data: schedule,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to update payroll schedule",
      error: error.message,
    });
  }
};

// CANCEL PAYROLL SCHEDULE
export const cancelPayrollSchedule = async (req, res) => {
  try {

    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    if(!user){
      return res.status(404).json({
        message:"User not found"
      })
    }

    const schedule = await PayrollSchedule.findOne({
      _id: req.params.id,
      companyId: user.companyId,
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Payroll schedule not found",
      });
    }

    if (
      !["scheduled", "awaiting_confirmation"].includes(schedule.status)
    ) {
      return res.status(400).json({
        message: "This payroll schedule can no longer be cancelled",
      });
    }

    schedule.status = "cancelled";
    schedule.cancelledAt = new Date();

    await schedule.save();

    // Return the batch to approved so it can be scheduled again
    await PayrollBatch.updateOne(
      {
        _id: schedule.payrollBatchId,
        companyId: req.user.companyId,
        status: "scheduled",
      },
      {
        $set: { status: "approved" },
      }
    );

    return res.status(200).json({
      message: "Payroll schedule cancelled successfully",
      data: schedule,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to cancel payroll schedule",
      error: error.message,
    });
  }
};

// CONFIRM A SCHEDULE WAITING FOR ONLY MANUAL APPROVAL
export const confirmPayrollSchedule = async (req, res) => {
  try {

    const userId = req.userId
    const user = await User.findById(userId).select("-password")

    if(!user){
      return res.status(404).json({
        message:"User not found"
      })
    }

    const schedule = await PayrollSchedule.findOne({
      _id: req.params.id,
      companyId: user.companyId,
      status: "awaiting_confirmation",
      mode: "manual_confirmation",
    });

    if (!schedule) {
      return res.status(404).json({
        message: "Schedule awaiting confirmation not found",
      });
    }

    // Recheck that its payroll batch is still approved/scheduled
    const batch = await PayrollBatch.findOne({
      _id: schedule.payrollBatchId,
      companyId: req.user.companyId,
      status: "scheduled",
    });

    if (!batch) {
      return res.status(400).json({
        message: "Payroll batch is not ready for processing",
      });
    }

    // The background worker can now pick up this confirmed schedule
    schedule.status = "scheduled";

    await schedule.save();

    return res.status(200).json({
      message: "Payroll schedule confirmed. It is ready for processing.",
      data: schedule,
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to confirm payroll schedule",
      error: error.message,
    });
  }
};