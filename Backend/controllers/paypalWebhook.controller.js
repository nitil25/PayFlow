import WebhookEvent from "../models/WebhookEvent.js";
import { verifyPayPalWebhook } from "../services/paypalWebhook.service.js";
import { processPayPalWebhookEvent } from "../services/paypalWebhookProcessor.service.js";

export const handlePayPalWebhook = async (req, res) => {
  try {
    // 1. Verify PayPal's signature.
    const isVerified = await verifyPayPalWebhook(req.headers, req.body);

    if (!isVerified) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayPal webhook signature",
      });
    }

    // 2. Validate the event.
    const event = req.body;
    const resource = event?.resource;

    if (
      !event?.id ||
      typeof event.event_type !== "string" ||
      !resource ||
      typeof resource !== "object" ||
      Array.isArray(resource)
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

      payoutBatchId: resource.payout_batch_id || null,

      payoutItemId: resource.payout_item_id || null,

      senderItemId:
        resource.payout_item?.sender_item_id || resource.sender_item_id || null,

      providerTransactionId: resource.transaction_id || null,

      providerStatus: resource.transaction_status || null,

      status: "received",
    };

    // 4. Save the event, or retrieve it if already received.
    let savedEvent;

    try {
      savedEvent = await WebhookEvent.create(webhookData);
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      savedEvent = await WebhookEvent.findOne({
        provider: "paypal",
        eventId: event.id,
      });

      if (!savedEvent) {
        throw new Error("Unable to retrieve existing webhook event");
      }
    }

    // 5. Process the saved event.
    const result = await processPayPalWebhookEvent(savedEvent.eventId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: result.message,
      });
    }

    // 6. Acknowledge successful processing.
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("PayPal webhook controller error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to process PayPal webhook",
    });
  }
};
