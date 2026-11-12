
import WebhookEvent from "../models/WebhookEvent.js";
import { verifyPayPalWebhook } from "../services/paypalWebhook.service.js";

export const handlePayPalWebhook = async (req, res) => {
  try {
    // 1. Verify PayPal signature.
    const isVerified = await verifyPayPalWebhook(
      req.headers,
      req.body
    );

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayPal webhook signature",
      });
    }

    // 2. Validate event payload.
    const event = req.body;
    const resource = event?.resource;

    if (
      !event?.id ||
      typeof event.event_type !== "string" ||
      !resource ||
      typeof resource !== "object"
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook event payload",
      });
    }

    // 3. Extract PayPal identifiers.
    const webhookData = {
      provider: "paypal",
      eventId: event.id,
      eventType: event.event_type,

      resourceId:
        resource.id ||
        resource.payout_item_id ||
        resource.transaction_id ||
        null,

      payoutBatchId:
        resource.payout_batch_id || null,

      payoutItemId:
        resource.payout_item_id || null,

      senderItemId:
        resource.payout_item?.sender_item_id ||
        resource.sender_item_id ||
        null,

      providerTransactionId:
        resource.transaction_id || null,

      providerStatus:
        resource.transaction_status ||
        resource.payout_item?.transaction_status ||
        null,

      status: "received",
    };

    // 4. Save the verified event.
    try {
      await WebhookEvent.create(webhookData);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(200).json({
          success: true,
          message: "Webhook event already received",
        });
      }

      throw error;
    }

    // 5. Acknowledge receipt.
    return res.status(200).json({
      success: true,
      message: "PayPal webhook received successfully",
    });

  } catch (error) {
    console.error(
      "PayPal webhook controller error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Unable to process PayPal webhook",
    });
  }
};

