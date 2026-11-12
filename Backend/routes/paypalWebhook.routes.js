import express from "express";
import isAuth from "../middlewares/isAuth.js";
import { handlePayPalWebhook } from "../controllers/paypalWebhook.controller.js";

const paypalWebhookRouter = express.Router();

paypalWebhookRouter.post("/", isAuth, handlePayPalWebhook);

export default paypalWebhookRouter;
