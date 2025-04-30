import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server'; // Use server client for backend actions
// IMPORTANT: Ensure PayPal SDK is installed: npm install @paypal/checkout-server-sdk
import paypal from '@paypal/checkout-server-sdk';

// --- Configure PayPal Environment ---
// Ensure these are set in your .env.local file
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("PayPal client ID or secret not found in environment variables.");
  // Handle missing config - perhaps redirect to an error page immediately
}

// Use SandboxEnvironment for testing, LiveEnvironment for production
const environment = new paypal.core.SandboxEnvironment(clientId, clientSecret);
const client = new paypal.core.PayPalHttpClient(environment);

// Placeholder Plan Mapping (based on price - adjust if needed)
// It's better to store planId with orderId if possible, 
// but mapping price back is a fallback. Ensure prices are unique enough.
const PRICE_TO_PLAN = {
    '5.00': 'basic',
    '15.00': 'pro',
    '50.00': 'business',
};

export async function GET(request) {
  const supabase = createClient();
  const siteUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

  // 1. Get User Session
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error('Capture Order Error: User not authenticated.', userError);
    // Redirect to login, maybe with a message
    return NextResponse.redirect(`${siteUrl}/auth?error=Authentication required to complete purchase.`);
  }

  // 2. Extract PayPal Order Token from URL
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token'); // PayPal Order ID
  // const payerId = searchParams.get('PayerID'); // May not be needed for capture with SDK v2

  if (!token) {
    console.error('Capture Order Error: Missing PayPal order token in redirect URL.');
    return NextResponse.redirect(`${siteUrl}/pricing?payment=failed&reason=missing_token`);
  }

  try {
    // 3. Create Capture Request
    const captureRequest = new paypal.orders.OrdersCaptureRequest(token);
    captureRequest.requestBody({}); // Empty body for capture

    console.log(`Capturing PayPal order: ${token} for user: ${user.id}`);

    // 4. Execute Capture Request
    const captureResponse = await client.execute(captureRequest);
    console.log("PayPal Capture Response Status:", captureResponse.statusCode);
    // console.log("PayPal Capture Response Body:", JSON.stringify(captureResponse.result, null, 2)); // Log details if needed

    // 5. Verify Capture Status
    const captureResult = captureResponse.result;
    if (captureResult.status !== 'COMPLETED') {
      console.error(`Capture Order Error: PayPal capture status is ${captureResult.status}.`, captureResult);
      let reason = 'payment_not_completed';
      if (captureResult.status === 'PENDING') reason = 'payment_pending';
      // Handle other statuses like VOIDED, FAILED etc.
      return NextResponse.redirect(`${siteUrl}/pricing?payment=failed&reason=${reason}`);
    }

    // --- Payment Successfully Captured ---
    console.log(`PayPal Order ${token} successfully CAPTURED.`);

    // 6. Determine the Plan Purchased (Using amount as fallback)
    const purchaseUnit = captureResult.purchase_units?.[0];
    const capturedAmount = purchaseUnit?.payments?.captures?.[0]?.amount?.value;
    const currency = purchaseUnit?.payments?.captures?.[0]?.amount?.currency_code;

    if (!capturedAmount || !currency) {
        console.error(`Capture Order Error: Could not extract captured amount/currency for order ${token}.`);
        // Maybe grant manually or redirect with specific error
        return NextResponse.redirect(`${siteUrl}/pricing?payment=failed&reason=capture_details_missing`);
    }

    const purchasedPlanId = PRICE_TO_PLAN[capturedAmount];

    if (!purchasedPlanId) {
        console.error(`Capture Order Error: Could not map captured amount ${capturedAmount} ${currency} to a known plan for order ${token}.`);
        // Grant manually or redirect
        return NextResponse.redirect(`${siteUrl}/pricing?payment=failed&reason=unknown_plan`);
    }

    console.log(`User ${user.id} purchased plan: ${purchasedPlanId} (Amount: ${capturedAmount} ${currency})`);

    // 7. Update User Profile/Subscription in Supabase
    // IMPORTANT: Replace 'profiles' and 'plan' with your actual table and column names
    const { error: updateError } = await supabase
      .from('profiles') // Your user profiles or subscriptions table
      .update({ plan: purchasedPlanId, updated_at: new Date() }) // Update the plan column
      .eq('id', user.id); // Match the authenticated user's ID

    if (updateError) {
      console.error(`Capture Order Error: Failed to update user ${user.id}'s plan to ${purchasedPlanId} in Supabase for order ${token}.`, updateError);
      // CRITICAL: Payment succeeded, but DB update failed. Needs manual intervention or retry logic.
      // Redirect to a specific error page indicating this.
      return NextResponse.redirect(`${siteUrl}/payment/update-failed?orderId=${token}`);
    }

    console.log(`Successfully updated Supabase profile for user ${user.id} to plan ${purchasedPlanId}.`);

    // 8. Redirect to Success Page
    return NextResponse.redirect(`${siteUrl}/payment/success?plan=${purchasedPlanId}`);

  } catch (error) {
    console.error(`Capture Order Error: Failed to capture PayPal order ${token}.`, error);
     // Check for PayPal specific errors
     if (error.statusCode) {
        console.error("PayPal Capture Error Details:", JSON.stringify(error.message, null, 2)); 
        // Potentially map PayPal error details (like INSTRUMENT_DECLINED) to a user-friendly reason
        let reason = 'paypal_error';
        try { // Safely parse PayPal error message
           const paypalError = JSON.parse(error.message);
           if (paypalError.details?.[0]?.issue === 'INSTRUMENT_DECLINED') {
              reason = 'payment_declined';
           }
        } catch (parseError) { /* Ignore if parsing fails */ }
        return NextResponse.redirect(`${siteUrl}/pricing?payment=failed&reason=${reason}`);
     }
    // General server error
    return NextResponse.redirect(`${siteUrl}/pricing?payment=failed&reason=capture_exception`);
  }
} 