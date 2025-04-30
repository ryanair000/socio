import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server';

// --- M-Pesa Daraja Configuration ---\n// Ensure these are set in your .env.local file
const mpesaConsumerKey = process.env.MPESA_CONSUMER_KEY;
const mpesaConsumerSecret = process.env.MPESA_CONSUMER_SECRET;
const mpesaBusinessShortCode = process.env.MPESA_BUSINESS_SHORTCODE;
const mpesaPasskey = process.env.MPESA_PASSKEY;
const mpesaCallbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/mpesa-callback`; // Your callback endpoint

// Daraja API URLs (Use sandbox for testing, production URL otherwise)
const DARAJA_ENV = process.env.DARAJA_ENV || 'sandbox'; // 'sandbox' or 'production'
const DARAJA_AUTH_URL = DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
    : 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
const DARAJA_STK_PUSH_URL = DARAJA_ENV === 'production'
    ? 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
    : 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';


// Placeholder Plan Data (Should match pricing/checkout pages)
const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: 500 }, // Using numbers here, Daraja expects numbers for amount
  pro: { name: 'Pro Plan', price: 1500 },
  business: { name: 'Business Plan', price: 5000 },
};

// --- Helper Function: Get Daraja Access Token ---\nasync function getDarajaAccessToken() {\n  const auth = Buffer.from(`${mpesaConsumerKey}:${mpesaConsumerSecret}`).toString('base64');\n  try {\n    const response = await fetch(DARAJA_AUTH_URL, {\n      method: 'GET', // Daraja auth uses GET\n      headers: {\n        'Authorization': `Basic ${auth}`,\n        'Content-Type': 'application/json', // Though GET, specify type\n      },\n    });\n    const data = await response.json();\n    if (!response.ok) {\n      console.error('Daraja Auth Error Response:', data);\n      throw new Error(`Failed to get Daraja access token: ${data.errorMessage || response.statusText}`);\n    }\n    console.log(\"Daraja Access Token obtained successfully.\");\n    return data.access_token;\n  } catch (error) {\n    console.error(\"Error getting Daraja access token:\", error);\n    throw error; // Re-throw\n  }\n}\n\n// --- Helper Function: Format Phone Number ---\nfunction formatPhoneNumber(phone) {\n    if (!phone) return null;\n    // Remove spaces, +, etc.\n    let cleaned = phone.replace(/[\s+]/g, ''); \n    // If starts with 07..., replace 0 with 254\n    if (cleaned.startsWith('0')) {\n        return `254${cleaned.substring(1)}`;\n    }\n    // If starts with 254, assume it's okay\n    if (cleaned.startsWith('254') && cleaned.length === 12) {\n         return cleaned;\n    }\n    // Otherwise, invalid format for M-Pesa\n    return null; \n}\n\n// --- API Route Handler ---\nexport async function POST(request) {\n  // Check if M-Pesa config is loaded\n  if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaBusinessShortCode || !mpesaPasskey || !mpesaCallbackUrl) {\n    console.error('M-Pesa configuration missing in environment variables.');\n    return NextResponse.json({ error: 'M-Pesa configuration incomplete on server.' }, { status: 500 });\n  }\n\n  const supabase = createClient();\n\n  // 1. Authenticate User\n  const { data: { user }, error: userError } = await supabase.auth.getUser();\n  if (userError || !user) {\n    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });\n  }\n\n  // 2. Parse Request Body\n  let planId, phoneNumber;\n  try {\n    const body = await request.json();\n    planId = body.planId;\n    phoneNumber = body.phoneNumber; // Expect phone number from frontend\n\n    if (!planId || !PLAN_DETAILS[planId]) {\n      throw new Error('Invalid or missing planId');\n    }\n     if (!phoneNumber) {\n      throw new Error('Missing phone number');\n    }\n  } catch (error) {\n    return NextResponse.json({ error: `Invalid request data: ${error.message}` }, { status: 400 });\n  }\n\n  const plan = PLAN_DETAILS[planId];\n  const formattedPhone = formatPhoneNumber(phoneNumber);\n\n   if (!formattedPhone) {\n    return NextResponse.json({ error: 'Invalid phone number format. Use 07... or 254...' }, { status: 400 });\n   }\n\n  // 3. Prepare STK Push Request Data\n  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14); // YYYYMMDDHHMMSS\n  const password = Buffer.from(`${mpesaBusinessShortCode}${mpesaPasskey}${timestamp}`).toString('base64');\n\n  const stkPushPayload = {\n    BusinessShortCode: mpesaBusinessShortCode,\n    Password: password,\n    Timestamp: timestamp,\n    TransactionType: 'CustomerPayBillOnline', // Or 'CustomerBuyGoodsOnline' depending on your till/paybill\n    Amount: plan.price, // Use the plan price\n    PartyA: formattedPhone, // User's phone number (payer)\n    PartyB: mpesaBusinessShortCode, // Your shortcode (paybill/till)\n    PhoneNumber: formattedPhone, // User's phone number again\n    CallBackURL: mpesaCallbackUrl,\n    AccountReference: `CM-${planId}-${user.id.substring(0, 6)}`, // Custom reference (e.g., YourApp-Plan-UserID)\n    TransactionDesc: `Payment for CaptionMagic ${plan.name} Plan`, // Description\n  };\n\n  try {
    // 4. Get Access Token
    const accessToken = await getDarajaAccessToken();

    // 5. Send STK Push Request
    console.log(`Initiating M-Pesa STK Push to ${formattedPhone} for plan ${planId}, amount ${plan.price}`);
    console.log("Callback URL:", mpesaCallbackUrl);

    const response = await fetch(DARAJA_STK_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPushPayload),
    });

    const responseData = await response.json();

    // 6. Handle Daraja Response
    if (!response.ok || responseData.ResponseCode !== "0") {
      console.error('Daraja STK Push Error Response:', responseData);
      throw new Error(responseData.errorMessage || responseData.ResponseDescription || `Daraja API Error: ${response.statusText}`);
    }

    // Success! Daraja accepted the request.
    console.log('Daraja STK Push initiated successfully:', responseData);
    const checkoutRequestId = responseData.CheckoutRequestID;

    // --- Store Transaction Details in Supabase ---
    const { error: insertError } = await supabase
      .from('mpesa_transactions')
      .insert({
        checkout_request_id: checkoutRequestId,
        user_id: user.id,
        plan_id: planId,
        status: 'pending',
        amount: plan.price,
        phone_number: formattedPhone
      });

    if (insertError) {
      console.error(`CRITICAL: STK Push initiated (ID: ${checkoutRequestId}) but failed to insert record into mpesa_transactions!`, insertError);
    } else {
       console.log(`Stored pending transaction record for CheckoutRequestID: ${checkoutRequestId}`);
    }
    // --- End Store Transaction Details ---

    // DIAGNOSTIC LOGGING
    console.log("MPESA_ROUTE_LOG: Preparing to return success response.");

    // Return success response
    return NextResponse.json({
      message: 'STK Push initiated successfully. Please check your phone.',
      checkoutRequestId: checkoutRequestId
    });

  } catch (error) {
    // DIAGNOSTIC LOGGING
    console.log("MPESA_ROUTE_LOG: Entered catch block.");

    // Handle any error from the try block
    console.error('M-Pesa STK Push Initiation Failed:', error);
    return NextResponse.json({ error: `Failed to initiate M-Pesa payment: ${error.message}` }, { status: 500 });
  }
} 