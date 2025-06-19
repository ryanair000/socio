import { NextResponse } from 'next/server';
// IMPORTANT: You would need to install the PayPal SDK: npm install @paypal/checkout-server-sdk
import paypal from '@paypal/checkout-server-sdk'; 

// Placeholder Plan Data (Should match pricing/checkout pages or be fetched from DB)
const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: '5.00', currency: 'KES' }, // Note: Use string for price for PayPal API
  pro: { name: 'Pro Plan', price: '15.00', currency: 'KES' }, 
  business: { name: 'Business Plan', price: '50.00', currency: 'KES' }, 
};

// --- API Route Handler ---
export async function POST(request) {
  // --- Configure PayPal Environment ---
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error("PayPal client ID or secret not found in environment variables.");
    return NextResponse.json({ error: "Payment provider is not configured on the server." }, { status: 500 });
  }
  
  const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
  const client = new paypal.core.PayPalHttpClient(environment);

  try {
    const { planId } = await request.json();

    if (!planId || !PLAN_DETAILS[planId]) {
      return NextResponse.json({ error: 'Invalid plan ID provided.' }, { status: 400 });
    }

    const plan = PLAN_DETAILS[planId];

    // --- Create PayPal Order Request ---
    const paypalRequest = new paypal.orders.OrdersCreateRequest();
    paypalRequest.prefer("return=representation");
    paypalRequest.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        description: `CaptionMagic Subscription - ${plan.name}`,
        amount: {
          currency_code: plan.currency,
          value: plan.price,
        },
      }],
      application_context: {
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/capture-paypal-order`,
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?payment=cancelled`,
        brand_name: 'CaptionMagic',
        user_action: 'PAY_NOW',
      }
    });

    // --- Execute PayPal API Call ---
    const response = await client.execute(paypalRequest);
    const approvalLink = response.result.links.find(link => link.rel === 'approve');

    if (!approvalLink) {
        console.error("No approval link found in PayPal response:", response.result);
        throw new Error('Could not get PayPal approval link.');
    }

    // --- Return Approval Link to Frontend ---
    return NextResponse.json({ approvalLink: approvalLink.href });

  } catch (error) {
    console.error("PayPal Order Creation Error:", error);
    if (error.statusCode) {
        return NextResponse.json({ error: `PayPal Error: ${error.message}` }, { status: error.statusCode });
    }
    return NextResponse.json({ error: `Server error creating PayPal order: ${error.message}` }, { status: 500 });
  }
} 