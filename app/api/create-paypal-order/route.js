import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server'; // Use server client for backend

// --- PayPal Configuration ---
// Make sure these are in your .env.local
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
// Use sandbox environment for testing, live for production
const PAYPAL_API_BASE = process.env.NODE_ENV === 'production' 
    ? 'https://api-m.paypal.com' 
    : 'https://api-m.sandbox.paypal.com';

// --- Plan Details Mapping (Should match frontend/database) ---
// IMPORTANT: Use currency code (e.g., USD) and ensure prices match
const PLAN_PRICE_DETAILS = {
    premium: { name: 'Premium Plan', price_value: '5.00', currency_code: 'USD' },
    ultimate: { name: 'Ultimate Plan', price_value: '10.00', currency_code: 'USD' },
};

// Function to get PayPal Access Token
async function getPayPalAccessToken() {
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    try {
        const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Accept-Language': 'en_US',
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'grant_type=client_credentials',
        });
        const data = await response.json();
        if (!response.ok) {
            console.error('PayPal Auth Error Response:', data);
            throw new Error(`Failed to get PayPal access token: ${data.error_description || response.statusText}`);
        }
        console.log("PayPal Access Token obtained successfully.");
        return data.access_token;
    } catch (error) {
        console.error("Error getting PayPal access token:", error);
        throw error; // Re-throw to be caught by the main handler
    }
}

export async function POST(req) {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
        console.error('PayPal Client ID or Secret not configured in environment variables.');
        return NextResponse.json({ error: 'PayPal configuration missing.' }, { status: 500 });
    }

    const supabase = createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        console.error('User not authenticated:', userError);
        return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    let planId;
    try {
        const body = await req.json();
        planId = body.planId;

        if (!planId || !PLAN_PRICE_DETAILS[planId]) {
            throw new Error('Invalid or missing planId');
        }
    } catch (error) {
        console.error('Error parsing request body or invalid planId:', error);
        return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const planDetails = PLAN_PRICE_DETAILS[planId];
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    // Define return/cancel URLs for PayPal redirect
    // These pages need to be created later
    const returnUrl = `${siteUrl}/payment/paypal-success`; 
    const cancelUrl = `${siteUrl}/payment/paypal-cancel`;

    try {
        const accessToken = await getPayPalAccessToken();

        console.log(`Creating PayPal order for user ${user.id}, plan: ${planId}`);

        const orderPayload = {
            intent: 'CAPTURE', // Or 'AUTHORIZE' if you capture later
            purchase_units: [{
                description: `CaptionMagic - ${planDetails.name}`, // Add description
                // You can add a custom ID to track the order, linking it to your internal system
                // custom_id: `user-${user.id}-plan-${planId}-${Date.now()}`,
                amount: {
                    currency_code: planDetails.currency_code,
                    value: planDetails.price_value, 
                    // Optional: Breakdown if you have tax/shipping
                    // breakdown: {
                    //   item_total: {
                    //     currency_code: planDetails.currency_code,
                    //     value: planDetails.price_value,
                    //   }
                    // }
                },
                // Optional: Add items array for more detailed breakdown
                // items: [
                //   {
                //     name: planDetails.name,
                //     quantity: '1',
                //     unit_amount: {
                //       currency_code: planDetails.currency_code,
                //       value: planDetails.price_value,
                //     },
                //     category: 'DIGITAL_GOODS' // Or 'PHYSICAL_GOODS'
                //   }
                // ]
            }],
            application_context: {
                brand_name: 'CaptionMagic', // Your brand name shown on PayPal page
                landing_page: 'LOGIN', // Or 'BILLING' - controls initial state of PayPal page
                user_action: 'PAY_NOW', // Action button text
                return_url: returnUrl, 
                cancel_url: cancelUrl,
            }
        };

        const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${accessToken}`,
                // Optional: Add a unique ID for idempotency
                // 'PayPal-Request-Id': `unique-id-${Date.now()}` 
            },
            body: JSON.stringify(orderPayload),
        });

        const orderData = await response.json();

        if (!response.ok) {
            console.error('PayPal Order Creation Error Response:', orderData);
            const errorDetails = orderData.details?.[0]?.description || orderData.message || response.statusText;
            throw new Error(`Failed to create PayPal order: ${errorDetails}`);
        }

        // Find the approval link
        const approvalLink = orderData.links?.find(link => link.rel === 'approve');

        if (!approvalLink || !approvalLink.href) {
             console.error('PayPal Order Response missing approval link:', orderData);
            throw new Error('Could not find PayPal approval link in the response.');
        }
        
        console.log(`PayPal order created successfully: ${orderData.id}. Approval URL: ${approvalLink.href}`);

        // Return the approval link to the frontend
        return NextResponse.json({ approvalLink: approvalLink.href });

    } catch (error) {
        console.error('PayPal order creation failed:', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: `Failed to create PayPal order: ${errorMessage}` }, { status: 500 });
    }
} 