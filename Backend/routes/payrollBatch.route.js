
import express from "express";

import {
  approvePayrollBatch,
  calculatePayrollBatch,
  createPayrollBatch,
  deletePayrollBatch,
  getPayrollBatch,
  getPayrollBatchById,
  updatePayrollBatch,
  submitPayrollBatch,
  processPayrollBatch,
} from "../controllers/payrollBatch.controller.js";

import isAuth from "../middlewares/isAuth.js";

const payrollBatchRouter = express.Router();

payrollBatchRouter.post("/create", isAuth, createPayrollBatch);

payrollBatchRouter.get("/all", isAuth, getPayrollBatch);

payrollBatchRouter.get("/:id", isAuth, getPayrollBatchById);

payrollBatchRouter.patch("/:id", isAuth, updatePayrollBatch);

payrollBatchRouter.post("/calculate/:id", isAuth, calculatePayrollBatch);

payrollBatchRouter.post("/submit/:id", isAuth, submitPayrollBatch);

payrollBatchRouter.post("/approve/:id", isAuth, approvePayrollBatch);

payrollBatchRouter.post("/process/:id", isAuth, processPayrollBatch);

payrollBatchRouter.post("/cancel/:id", isAuth, deletePayrollBatch);

export default payrollBatchRouter;
