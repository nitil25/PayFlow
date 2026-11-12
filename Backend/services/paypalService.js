
import axios from "axios";

let cachedAccessToken = null;
let tokenExpiresAt = 0;

export const getPayPalAccessToken = async () => {
  try {
    // Read environment variables when the function runs.
    const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

    // Sandbox-only protection.
    if (
      PAYPAL_BASE_URL !==
      "https://api-m.sandbox.paypal.com"
    ) {
      throw new Error(
        "PayPilot testing requires PayPal Sandbox configuration"
      );
    }

    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      throw new Error("PayPal credentials are missing");
    }

    // Reuse cached token if it is still valid.
    if (
      cachedAccessToken &&
      Date.now() < tokenExpiresAt
    ) {
      return cachedAccessToken;
    }

    const response = await axios.post(
      `${PAYPAL_BASE_URL}/v1/oauth2/token`,
      new URLSearchParams({
        grant_type: "client_credentials",
      }).toString(),
      {
        auth: {
          username: PAYPAL_CLIENT_ID,
          password: PAYPAL_CLIENT_SECRET,
        },
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        timeout: 15000,
      }
    );

    const accessToken = response.data.access_token;
    const expiresIn = Number(response.data.expires_in);

    if (!accessToken || !Number.isFinite(expiresIn) || expiresIn <= 60) {
      throw new Error("Invalid PayPal OAuth response");
    }

    cachedAccessToken = accessToken;

    // Refresh 60 seconds before expiration.
    tokenExpiresAt = Date.now() + (expiresIn - 60) * 1000;

    return cachedAccessToken;

  } catch (error) {
    console.error(
      "PayPal authentication failed:",
      error.response?.data || error.message
    );

    throw new Error("Unable to authenticate with PayPal");
  }
};
