import { NextResponse } from 'next/server';
// IMPORTANT: You would need to install the PayPal SDK: npm install @paypal/checkout-server-sdk
import paypal from '@paypal/checkout-server-sdk'; 

// Placeholder Plan Data (Should match pricing/checkout pages or be fetched from DB)
const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: '5.00', currency: 'KES' }, // Note: Use string for price for PayPal API
  pro: { name: 'Pro Plan', price: '15.00', currency: 'KES' }, 
  business: { name: 'Business Plan', price: '50.00', currency: 'KES' }, 
};

// --- Configure PayPal Environment ---
// Ensure these are set in your .env.local file
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("PayPal client ID or secret not found in environment variables.");
  // Optionally throw an error or handle this case appropriately
}

// Use SandboxEnvironment for testing, LiveEnvironment for production
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret); 
const client = new paypal.core.PayPalHttpClient(environment);

// --- API Route Handler ---
export async function POST(request) {
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
      intent: 'CAPTURE', // Or 'AUTHORIZE'
      purchase_units: [{
        description: `CaptionMagic Subscription - ${plan.name}`,
        amount: {
          currency_code: plan.currency, // Ensure currency matches your PayPal account settings
          value: plan.price, // Price as a string
          // Optional: breakdown for tax, shipping etc.
          // breakdown: {
          //   item_total: { currency_code: plan.currency, value: plan.price }
          // }
        },
        // Optional: Add item details
        // items: [{
        //   name: plan.name,
        //   unit_amount: { currency_code: plan.currency, value: plan.price },
        //   quantity: '1'
        // }]
      }],
      application_context: {
        // IMPORTANT: Update these URLs to your actual API endpoints
        return_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/capture-paypal-order`, // URL for successful payment capture
        cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing?payment=cancelled`, // URL if user cancels on PayPal
        brand_name: 'CaptionMagic',
        user_action: 'PAY_NOW', // Or 'CONTINUE' if you have more steps
      }
    });

    // --- Execute PayPal API Call ---
    console.log(`Creating PayPal order for ${plan.name} (${plan.price} ${plan.currency})`);
    const response = await client.execute(paypalRequest);
    console.log("PayPal Order Create Response Status:", response.statusCode);
    // console.log("PayPal Order Create Response Body:", JSON.stringify(response.result, null, 2)); // Log detailed response if needed


    // --- Extract Approval Link ---
    const approvalLink = response.result.links.find(link => link.rel === 'approve');

    if (!approvalLink) {
        console.error("No approval link found in PayPal response:", response.result);
        throw new Error('Could not get PayPal approval link.');
    }

    console.log("PayPal Approval URL:", approvalLink.href);

    // --- Return Approval Link to Frontend ---
    return NextResponse.json({ approvalLink: approvalLink.href });

  } catch (error) {
    console.error("PayPal Order Creation Error:", error);
    // Check for PayPal specific errors
    if (error.statusCode) {
        console.error("PayPal Error Details:", JSON.stringify(error.message, null, 2)); // Log PayPal's error message
        return NextResponse.json({ error: `PayPal Error: ${error.message}` }, { status: error.statusCode });
    }
    // General server error
    return NextResponse.json({ error: `Server error creating PayPal order: ${error.message}` }, { status: 500 });
  }
} 