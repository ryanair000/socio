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

// --- Helper Function: Get Daraja Access Token ---\nasync function getDarajaAccessToken() {
  const auth = Buffer.from(`${mpesaConsumerKey}:${mpesaConsumerSecret}`).toString('base64');
  try {
    const response = await fetch(DARAJA_AUTH_URL, {
      method: 'GET', // Daraja auth uses GET
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json', // Though GET, specify type
      },
    });
    const data = await response.json();
    if (!response.ok) {
      console.error('Daraja Auth Error Response:', data);
      throw new Error(`Failed to get Daraja access token: ${data.errorMessage || response.statusText}`);
    }
    console.log("Daraja Access Token obtained successfully.");
    return data.access_token;
  } catch (error) {
    console.error("Error getting Daraja access token:", error);
    throw error; // Re-throw
  }
}

// --- Helper Function: Format Phone Number ---\nfunction formatPhoneNumber(phone) {
    if (!phone) return null;
    // Remove spaces, +, etc.
    let cleaned = phone.replace(/[\s+]/g, ''); 
    // If starts with 07..., replace 0 with 254
    if (cleaned.startsWith('0')) {
        return `254${cleaned.substring(1)}`;
    }
    // If starts with 254, assume it's okay
    if (cleaned.startsWith('254') && cleaned.length === 12) {
         return cleaned;
    }
    // Otherwise, invalid format for M-Pesa
    return null; 
}

// --- API Route Handler ---\nexport async function POST(request) {
  // Check if M-Pesa config is loaded
  if (!mpesaConsumerKey || !mpesaConsumerSecret || !mpesaBusinessShortCode || !mpesaPasskey || !mpesaCallbackUrl) {
    console.error('M-Pesa configuration missing in environment variables.');
    return NextResponse.json({ error: 'M-Pesa configuration incomplete on server.' }, { status: 500 });
  }

  const supabase = createClient();

  // 1. Authenticate User
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
  }

  // 2. Parse Request Body
  let planId, phoneNumber;
  try {
    const body = await request.json();
    planId = body.planId;
    phoneNumber = body.phoneNumber; // Expect phone number from frontend

    if (!planId || !PLAN_DETAILS[planId]) {
      throw new Error('Invalid or missing planId');
    }
     if (!phoneNumber) {
      throw new Error('Missing phone number');
    }
  } catch (error) {
    return NextResponse.json({ error: `Invalid request data: ${error.message}` }, { status: 400 });
  }

  const plan = PLAN_DETAILS[planId];
  const formattedPhone = formatPhoneNumber(phoneNumber);

   if (!formattedPhone) {
    return NextResponse.json({ error: 'Invalid phone number format. Use 07... or 254...' }, { status: 400 });
   }

  // 3. Prepare STK Push Request Data
  const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, 14); // YYYYMMDDHHMMSS
  const password = Buffer.from(`${mpesaBusinessShortCode}${mpesaPasskey}${timestamp}`).toString('base64');

  const stkPushPayload = {
    BusinessShortCode: mpesaBusinessShortCode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline', // Or 'CustomerBuyGoodsOnline' depending on your till/paybill
    Amount: plan.price, // Use the plan price
    PartyA: formattedPhone, // User's phone number (payer)
    PartyB: mpesaBusinessShortCode, // Your shortcode (paybill/till)
    PhoneNumber: formattedPhone, // User's phone number again
    CallBackURL: mpesaCallbackUrl,
    AccountReference: `CM-${planId}-${user.id.substring(0, 6)}`, // Custom reference (e.g., YourApp-Plan-UserID)
    TransactionDesc: `Payment for CaptionMagic ${plan.name} Plan`, // Description
  };

  try {
    // --- Temporarily Commented Out for Build Debugging ---
    /*
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
    */
    // --- End Temporarily Commented Out ---

    // DIAGNOSTIC LOGGING (Keep this)
    console.log("MPESA_ROUTE_LOG: Preparing to return success response (DEBUG MODE).");
    const checkoutRequestId = "DEBUG_MODE_ID"; // Placeholder ID

    // Return success response (Simplified)
    return NextResponse.json({
      message: 'DEBUG: STK Push skipped, returning success.',
      checkoutRequestId: checkoutRequestId
    });

  } catch (error) {
    // DIAGNOSTIC LOGGING (Keep this)
    console.log("MPESA_ROUTE_LOG: Entered catch block (DEBUG MODE).");

    // Handle any error from the try block (Simplified)
    console.error('M-Pesa STK Push Initiation Failed (DEBUG MODE):', error);
    return NextResponse.json({ error: `DEBUG: Failed in try block: ${error.message}` }, { status: 500 });
  }
} 