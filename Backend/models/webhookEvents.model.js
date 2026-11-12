import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      enum: ["paypal"],
      default: "paypal",
    },

    eventId: {
      type: String,
      required: true,
      trim: true,
    },

    eventType: {
      type: String,
      required: true,
      trim: true,
    },

    resourceId: {
      type: String,
      default: null,
    },

    status: {
      type: String,
      enum: ["received", "processing", "processed", "failed"],
      default: "received",
      required: true,
    },

    attemptCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    payoutBatchId: {
      type: String,
      default: null,
    },

    payoutItemId: {
      type: String,
      default: null,
    },

    providerTransactionId: {
      type: String,
      default: null,
    },

    senderItemId: {
      type: String,
      default: null,
    },

    providerStatus: {
      type: String,
      default: null,
    },

    lastError: {
      type: String,
      default: null,
    },

    receivedAt: {
      type: Date,
      default: Date.now,
    },

    processedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

// Prevent duplicate webhook events
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });

const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

export default WebhookEvent;
