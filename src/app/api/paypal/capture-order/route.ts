
import { NextResponse } from 'next/server';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const base = "https://api-m.paypal.com";

/**
 * Captures a payment for an order.
 */
async function captureOrder(orderId: string) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders/${orderId}/capture`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const data = await response.json();
  return data;
}

/**
 * Generates an access token for the PayPal API.
 */
async function generateAccessToken() {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ":" + PAYPAL_SECRET).toString("base64");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    body: "grant_type=client_credentials",
    headers: {
      Authorization: `Basic ${auth}`,
    },
  });
  const data = await response.json();
  return data.access_token;
}


// POST handler for capturing the order
export async function POST(req: Request) {
    try {
        const { orderId } = await req.json();
        
        if (!orderId) {
            return NextResponse.json({ message: "Order ID is required" }, { status: 400 });
        }

        const captureData = await captureOrder(orderId);

        // Check if capture was successful
        if (captureData.status === 'COMPLETED') {
            return NextResponse.json({ success: true, ...captureData });
        } else {
             // Return the detailed error from PayPal
            return NextResponse.json({ success: false, details: captureData }, { status: 400 });
        }

    } catch (error: any) {
        console.error("API Error in capture-order:", error);
        return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
