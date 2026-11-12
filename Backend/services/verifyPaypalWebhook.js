
import axios from "axios";
import { getPayPalAccessToken } from "./paypalService.js";

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;

export const verifyPayPalWebhook = async (headers, webhookEvent) => {
  try {
    if (!PAYPAL_BASE_URL) {
      throw new Error("PayPal base URL is missing");
    }

    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      throw new Error("PayPal webhook ID is missing");
    }

    const requiredHeaders = [
      "paypal-auth-algo",
      "paypal-cert-url",
      "paypal-transmission-id",
      "paypal-transmission-sig",
      "paypal-transmission-time",
    ];

    for (const header of requiredHeaders) {
      if (!headers[header]) {
        return false;
      }
    }

    if (!webhookEvent || typeof webhookEvent !== "object") {
      return false;
    }

    const accessToken = await getPayPalAccessToken();

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: headers["paypal-auth-algo"],
        cert_url: headers["paypal-cert-url"],
        transmission_id: headers["paypal-transmission-id"],
        transmission_sig: headers["paypal-transmission-sig"],
        transmission_time: headers["paypal-transmission-time"],
        webhook_id: webhookId,
        webhook_event: webhookEvent,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return response.data?.verification_status === "SUCCESS";
  } catch (error) {
    console.error(
      "PayPal webhook verification error:",
      error.response?.data || error.message
    );

    throw new Error("Unable to verify PayPal webhook signature");
  }
};
