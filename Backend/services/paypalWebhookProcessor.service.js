
import mongoose from "mongoose";

import WebhookEvent from "../models/webhookEvents.model.js";
import PaymentTransaction from "../models/paymentTransaction.model.js";
import PayrollBatch from "../models/payrollBatch.model.js";

const EVENT_STATUS_MAP = {
  "PAYMENT.PAYOUTS-ITEM.SUCCEEDED": "completed",
  "PAYMENT.PAYOUTS-ITEM.FAILED": "failed",
  "PAYMENT.PAYOUTS-ITEM.BLOCKED": "failed",
  "PAYMENT.PAYOUTS-ITEM.CANCELED": "cancelled",
};

export const processPayPalWebhookEvent = async (eventId) => {
  const webhookEvent = await WebhookEvent.findOne({
    provider: "paypal",
    eventId,
  });

  if (!webhookEvent) {
    throw new Error("Webhook event not found");
  }

  // Do not process an event twice.
  if (webhookEvent.status === "processed") {
    return {
      success: true,
      message: "Event already processed",
    };
  }

  const newStatus = EVENT_STATUS_MAP[webhookEvent.eventType];

  if (!newStatus) {
    return {
      success: true,
      message: "Event type does not require transaction updates",
    };
  }

  // Claim the event atomically.
  const claimedEvent = await WebhookEvent.findOneAndUpdate(
    {
      _id: webhookEvent._id,
      status: { $in: ["received", "failed"] },
    },
    {
      $set: {
        status: "processing",
        lastError: null,
      },
      $inc: {
        attemptCount: 1,
      },
    },
    {
      new: true,
    }
  );

  if (!claimedEvent) {
    return {
      success: false,
      message: "Event is already being processed",
    };
  }

  try {
    const resource = claimedEvent.toObject();

    if (!resource.payoutBatchId || !resource.payoutItemId) {
      throw new Error(
        "Missing PayPal payout batch or payout item ID"
      );
    }

    // Find the corresponding transaction.
    const transaction = await PaymentTransaction.findOne({
      provider: "paypal",
      providerBatchId: resource.payoutBatchId,
      payrollItemId: new mongoose.Types.ObjectId(
        resource.payoutItemId
      ),
    });

    if (!transaction) {
      throw new Error("Matching payment transaction not found");
    }

    // Avoid allowing an old event to overwrite a final status.
    if (
      ["completed", "failed", "cancelled"].includes(
        transaction.status
      ) &&
      transaction.status !== newStatus
    ) {
      throw new Error(
        "Conflicting event received for a finalized transaction"
      );
    }

    transaction.status = newStatus;

    if (resource.providerTransactionId) {
      transaction.providerTransactionId =
        resource.providerTransactionId;
    }

    if (newStatus === "completed") {
      transaction.paidAt = new Date();
      transaction.failureReason = null;
    }

    if (newStatus === "failed") {
      transaction.failureReason =
        "PayPal reported that the payout item failed";
    }

    await transaction.save();

    // Update the matching payroll item.
    await PayrollBatch.updateOne(
      {
        _id: transaction.payrollBatchId,
        companyId: transaction.companyId,
        "items._id": transaction.payrollItemId,
      },
      {
        $set: {
          "items.$.paymentStatus": newStatus,
        },
      }
    );

    await WebhookEvent.updateOne(
      {
        _id: claimedEvent._id,
        status: "processing",
      },
      {
        $set: {
          status: "processed",
          processedAt: new Date(),
        },
      }
    );

    return {
      success: true,
      message: "PayPal webhook event processed successfully",
    };

  } catch (error) {
    await WebhookEvent.updateOne(
      {
        _id: claimedEvent._id,
        status: "processing",
      },
      {
        $set: {
          status: "failed",
          lastError: error.message,
        },
      }
    );

    throw error;
  }
};
