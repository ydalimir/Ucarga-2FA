
import { NextResponse } from 'next/server';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const base = "https://api-m.paypal.com";

/**
 * Creates an order and returns the order ID.
 */
async function createOrder(amount: string) {
  const accessToken = await generateAccessToken();
  const url = `${base}/v2/checkout/orders`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: {
            currency_code: "MXN",
            value: amount,
          },
        },
      ],
    }),
  });

  const data = await response.json();
  if (response.ok) {
    return data;
  }

  // Handle errors
  console.error("Failed to create order:", data);
  const error = new Error(data.details?.[0]?.issue || "Failed to create order.");
  (error as any).details = data.details;
  throw error;
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

// POST handler for creating the order
export async function POST(req: Request) {
  try {
    const { amount } = await req.json();

    if (!amount) {
      return NextResponse.json({ message: "Amount is required" }, { status: 400 });
    }

    const order = await createOrder(amount);
    return NextResponse.json({ orderId: order.id });

  } catch (error: any) {
    console.error("API Error in create-order:", error);
    return NextResponse.json({ message: error.message || 'Internal Server Error', details: error.details }, { status: 500 });
  }
}
