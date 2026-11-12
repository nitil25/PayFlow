import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { handlePayPalWebhook } from "../controllers/paypalWebhook.controller.js";

const paypalWebhookRouter = express.Router();

paypalWebhookRouter.post("/", handlePayPalWebhook);

export default paypalWebhookRouter;
