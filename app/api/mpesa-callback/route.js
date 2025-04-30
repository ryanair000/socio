import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase/server'; // Use server client for backend actions

// Helper function to safely get value from M-Pesa CallbackMetadata item list
function getCallbackMetadataValue(metadata, key) {
  if (!metadata || !metadata.Item) return null;
  const item = metadata.Item.find(i => i.Name === key);
  return item ? item.Value : null;
}

// Plan mapping - Should match initiation route/pricing page
const AMOUNT_TO_PLAN = {
    500: 'basic',
    1500: 'pro',
    5000: 'business',
};

export async function POST(request) {
  const supabase = createClient();
  let callbackData;

  try {
    callbackData = await request.json();
    console.log("--- M-Pesa Callback Received ---");
    // console.log(JSON.stringify(callbackData, null, 2)); // Log the full callback data for debugging

    const stkCallback = callbackData.Body?.stkCallback;

    if (!stkCallback) {
      console.error("M-Pesa Callback Error: Invalid callback structure. 'Body.stkCallback' missing.");
      // Still acknowledge receipt to prevent retries for malformed requests
      return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
    }

    const checkoutRequestId = stkCallback.CheckoutRequestID;
    const resultCode = stkCallback.ResultCode;
    const resultDesc = stkCallback.ResultDesc;

    console.log(`Callback for CheckoutRequestID: ${checkoutRequestId}, ResultCode: ${resultCode}, ResultDesc: ${resultDesc}`);

    // --- Payment Success Scenario ---
    if (resultCode === 0) {
      console.log("Processing successful M-Pesa payment...");
      const callbackMetadata = stkCallback.CallbackMetadata;
      const amount = getCallbackMetadataValue(callbackMetadata, 'Amount');
      const mpesaReceiptNumber = getCallbackMetadataValue(callbackMetadata, 'MpesaReceiptNumber');
      const phoneNumber = getCallbackMetadataValue(callbackMetadata, 'PhoneNumber'); // Payer's phone

      if (!amount || !mpesaReceiptNumber || !phoneNumber) {
        console.error(`M-Pesa Callback Error (Success): Missing required metadata for ${checkoutRequestId}. Amount: ${amount}, Receipt: ${mpesaReceiptNumber}, Phone: ${phoneNumber}`);
        // Acknowledge, but log error - data extraction failed
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      console.log(`Details - Amount: ${amount}, Receipt: ${mpesaReceiptNumber}, Phone: ${phoneNumber}`);

      // --- Find the original transaction using CheckoutRequestID ---
      // IMPORTANT: Assumes you created an 'mpesa_transactions' table
      const { data: transaction, error: findError } = await supabase
        .from('mpesa_transactions') // Your temporary transaction table
        .select('user_id, plan_id, status')
        .eq('checkout_request_id', checkoutRequestId)
        .maybeSingle(); // Use maybeSingle() as it might have been processed already

      if (findError) {
        console.error(`M-Pesa Callback DB Error: Failed to query mpesa_transactions for ${checkoutRequestId}.`, findError);
        // Acknowledge Daraja, but log internal error
        return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      if (!transaction) {
         console.warn(`M-Pesa Callback Warning: No pending transaction found for CheckoutRequestID ${checkoutRequestId}. Might be duplicate callback or data issue.`);
          // Acknowledge, maybe it was processed already or an issue during initiation
         return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }
      
      if (transaction.status === 'completed') {
         console.log(`M-Pesa Callback Info: Transaction ${checkoutRequestId} already marked as completed. Ignoring duplicate callback.`);
         return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      const userId = transaction.user_id;
      const planId = transaction.plan_id; // Get planId from the stored transaction

      console.log(`Found matching transaction. UserID: ${userId}, PlanID: ${planId}`);

      // --- Update User's Plan in Supabase ---
      // IMPORTANT: Replace 'profiles' and 'plan' with your actual table/column names
       const { error: updateError } = await supabase
        .from('profiles')
        .update({ plan: planId, updated_at: new Date() }) // Use the planId from the transaction record
        .eq('id', userId);

      if (updateError) {
         console.error(`M-Pesa Callback DB Error: Failed to update user ${userId}'s profile to plan ${planId} for ${checkoutRequestId}.`, updateError);
         // CRITICAL: Payment succeeded, DB update failed. Manual intervention needed.
         // Update transaction status to 'update_failed' maybe?
         await supabase
             .from('mpesa_transactions')
             .update({ status: 'update_failed', mpesa_receipt: mpesaReceiptNumber, updated_at: new Date(), result_desc: 'Profile update failed' })
             .eq('checkout_request_id', checkoutRequestId);
         // Acknowledge Daraja
         return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });
      }

      console.log(`Successfully updated Supabase profile for user ${userId} to plan ${planId}.`);

      // --- Update M-Pesa Transaction Status (Optional but recommended) ---
      const { error: transUpdateError } = await supabase
        .from('mpesa_transactions')
        .update({ status: 'completed', mpesa_receipt: mpesaReceiptNumber, updated_at: new Date(), result_code: resultCode, result_desc: resultDesc })
        .eq('checkout_request_id', checkoutRequestId);

      if(transUpdateError){
           console.error(`M-Pesa Callback DB Warning: Failed to update mpesa_transactions status to completed for ${checkoutRequestId}.`, transUpdateError);
           // Non-critical error, profile was updated, but log it.
      } else {
           console.log(`Marked mpesa_transaction ${checkoutRequestId} as completed.`);
      }

    // --- Payment Failure/Cancel Scenario ---
    } else {
      console.warn(`M-Pesa payment failed or was cancelled for ${checkoutRequestId}. ResultCode: ${resultCode}, Desc: ${resultDesc}`);
      // Optional: Update your temporary transaction status to 'failed' or 'cancelled'
      const { error: transUpdateError } = await supabase
        .from('mpesa_transactions')
        .update({ status: 'failed', updated_at: new Date(), result_code: resultCode, result_desc: resultDesc })
        .eq('checkout_request_id', checkoutRequestId)
        .eq('status', 'pending'); // Only update if it was pending

       if(transUpdateError){
           console.error(`M-Pesa Callback DB Warning: Failed to update mpesa_transactions status to failed for ${checkoutRequestId}.`, transUpdateError);
       } else {
           console.log(`Marked mpesa_transaction ${checkoutRequestId} status based on ResultCode ${resultCode}.`);
       }
    }

    // --- Acknowledge Receipt to Daraja ---
    // IMPORTANT: Always respond with success to Daraja to prevent retries,
    // even if your internal processing had issues (log those issues).
    console.log(`Acknowledging M-Pesa callback for ${checkoutRequestId}.`);
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" });

  } catch (error) {
    console.error("M-Pesa Callback Error: Unhandled exception processing callback.", error);
    console.error("Callback Data at time of error:", callbackData); // Log data that caused the error
    // Even on internal server error, try to acknowledge to prevent Daraja retries
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }); // Or potentially a different code if appropriate, but 0 prevents retries
  }
} 