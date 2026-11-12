
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";

import connectDb from "./utils/db.js";
import authRouter from "./routes/auth.routes.js";
import companyRouter from "./routes/company.routes.js";
import employeeRouter from "./routes/employee.routes.js";
import payrollRouter from "./routes/payrollImport.routes.js";
import multerConfig from "./utils/multer.js";
import payrollBatchRouter from "./routes/payrollBatch.route.js";
import salaryChangeRouter from "./routes/salaryChange.route.js";

const app = express();

const PORT = process.env.PORT || 8000;

const allowedOrigins = [
  "http://localhost:5177",
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
};

// Middlewares
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use(cors(corsOptions));
app.use(multerConfig);

// API Routes
app.use("/api/auth", authRouter);
app.use("/api/company", companyRouter);
app.use("/api/employee", employeeRouter);
app.use("/api/payroll", payrollRouter);
app.use("/api/payroll-batch", payrollBatchRouter);
app.use("/api/salary-change", salaryChangeRouter);

// Start Server
const startServer = async () => {
  try {
    await connectDb();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup failed:", error);
    process.exit(1);
  }
};

startServer();
