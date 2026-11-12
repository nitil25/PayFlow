import "dotenv/config";
import { getPayPalAccessToken } from "../services/paypalService.js";

const testPayPalConnection = async () => {
  try {
    const accessToken = await getPayPalAccessToken();

    if (accessToken) {
      console.log("PayPal connection successful!");
      console.log("OAuth access token received.");
    }
  } catch (error) {
    console.error("PayPal connection test failed:", error.message);
  }
};

testPayPalConnection();