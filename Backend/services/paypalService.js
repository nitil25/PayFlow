
import axios from "axios";

const PAYPAL_BASE_URL = process.env.PAYPAL_BASE_URL;
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

let cachedAccessToken = null;
let tokenExpiresAt = 0;

export const getPayPalAccessToken = async () => {
  try {
    if (
      cachedAccessToken &&
      Date.now() < tokenExpiresAt
    ) {
      return cachedAccessToken;
    }

    if (
      !PAYPAL_BASE_URL ||
      !PAYPAL_CLIENT_ID ||
      !PAYPAL_CLIENT_SECRET
    ) {
      throw new Error("PayPal environment variables are missing");
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
      }
    );

    cachedAccessToken = response.data.access_token;

    // Refresh slightly before the actual expiry time.
    tokenExpiresAt =
      Date.now() + (response.data.expires_in - 60) * 1000;

    return cachedAccessToken;
  } catch (error) {
    console.error(
      "PayPal authentication failed:",
      error.response?.data || error.message
    );

    throw new Error("Unable to authenticate with PayPal");
  }
};
