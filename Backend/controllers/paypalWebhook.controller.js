
import WebhookEvent from "../models/webhookEvents.model.js";
import { verifyPayPalWebhook } from "../services/verifyPaypalWebhook.js";

export const handlePayPalWebhook = async (req, res) => {
  try {
    // 1. Verify the webhook signature
    const isVerified = await verifyPayPalWebhook(
      req.headers,
      req.body
    );

    console.log("========== PAYPAL WEBHOOK RECEIVED ==========");
    console.log("Event ID:", req.body?.id);
    console.log("Event Type:", req.body?.event_type);


    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayPal webhook signature",
      });
    }

    // 2. Extract event information
    const event = req.body;

    if (!event.id || !event.event_type) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook event payload",
      });
    }

    // 3. Save the verified event
    try {
      await WebhookEvent.create({
        provider: "paypal",
        eventId: event.id,
        eventType: event.event_type,
        resourceId: event.resource?.id || null,
        status: "received",
      });
    } catch (error) {
      // Duplicate event: already received
      if (error.code === 11000) {
        return res.status(200).json({
          success: true,
          message: "Webhook event already received",
        });
      }

      throw error;
    }

    // 4. Acknowledge successful receipt
    return res.status(200).json({
      success: true,
      message: "PayPal webhook received successfully",
    });

  } catch (error) {
    console.error("PayPal webhook controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process PayPal webhook",
    });
  }
};
