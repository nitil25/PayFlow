
import axios from "axios";
import { getPayPalAccessToken } from "./paypalService.js";

export const createPayPalPayout = async (
  payoutItems,
  senderBatchId
) => {
  try {
    // 1. Validate Sandbox configuration.
    const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;

    if (
      PAYPAL_BASE_URL !==
      "https://api-m.sandbox.paypal.com"
    ) {
      throw new Error(
        "PayPilot testing requires PayPal Sandbox configuration"
      );
    }

    if (!senderBatchId) {
      throw new Error("Sender batch ID is required");
    }

    if (
      !Array.isArray(payoutItems) ||
      payoutItems.length === 0
    ) {
      throw new Error("Payout items are required");
    }

    // 2. Get PayPal access token.
    const accessToken = await getPayPalAccessToken();

    // 3. Validate and prepare payout items.
    const items = payoutItems.map((item) => {
      const amount = String(item.amount ?? "").trim();

      const currency = String(item.currency ?? "")
        .toUpperCase()
        .trim();

      const email = String(item.email ?? "").trim();

      if (
        !item.employeeId ||
        !item.payrollItemId ||
        !email ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !/^\d+(\.\d{1,2})?$/.test(amount) ||
        Number(amount) <= 0 ||
        !/^[A-Z]{3}$/.test(currency)
      ) {
        throw new Error("Invalid payout item");
      }

      return {
        recipient_type: "EMAIL",

        amount: {
          value: amount,
          currency,
        },

        receiver: email,

        note: "PayPilot AI Sandbox test",

        sender_item_id: String(item.payrollItemId),
      };
    });

    // 4. Submit Sandbox payout request.
    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/payments/payouts`,
      {
        sender_batch_header: {
          sender_batch_id: senderBatchId,
          email_subject: "PayPilot AI Sandbox Test",
          email_message: "Sandbox testing only.",
        },
        items,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );

    // 5. Return PayPal response.
    return response.data;

  } catch (error) {
    console.error(
      "PayPal payout error:",
      error.response?.data || error.message
    );

    throw new Error(
      "PayPal sandbox payout request failed"
    );
  }
};
