'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client'; // Adjusted path
import { CheckCircleIcon as CheckCircleIconSolid, LockClosedIcon as LockClosedIconSolid } from '@heroicons/react/20/solid'; // Assuming solid variants might be used elsewhere
import { DevicePhoneMobileIcon, CreditCardIcon } from '@heroicons/react/24/outline'; // Import needed icons

// --- Icon Placeholders ---
// const CheckCircleIcon = ({ className = 'w-6 h-6' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
// const LockClosedIcon = ({ className = 'w-4 h-4 mr-1' }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>;

// --- Updated Plan Details (Match pricing page) ---
const PLAN_DETAILS = {
  basic: { name: 'Basic Plan', price: 500, currency: 'KSH' },
  pro: { name: 'Pro Plan', price: 1500, currency: 'KSH' },
  business: { name: 'Business Plan', price: 5000, currency: 'KSH' },
};

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const planId = params.planId;
  // Use updated PLAN_DETAILS
  const selectedPlan = PLAN_DETAILS[planId] || null; 

  // Removed step logic, simplified to show both buttons
  const [userSession, setUserSession] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState(null);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState(''); // State for M-Pesa phone number
  const [isLoadingMpesa, setIsLoadingMpesa] = useState(false);
  const [isLoadingPaypal, setIsLoadingPaypal] = useState(false);
  const [statusMessage, setStatusMessage] = useState(''); // For user feedback (e.g., STK push sent)


  useEffect(() => {
    const fetchSessionAndRedirect = async () => {
      setLoadingUser(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          // Redirect to login if not authenticated, passing the intended checkout page
          router.push(`/auth?redirect=/checkout/${planId}`); 
        } else {
          setUserSession(session);
        }
      } catch (err) {
        console.error("Error fetching user session:", err);
        setError("Failed to load user session. Please try logging in again.");
      } finally {
        setLoadingUser(false);
      }
    };
    // Check planId validity before fetching session
    if (planId && PLAN_DETAILS[planId]) {
        fetchSessionAndRedirect();
    } else {
        setLoadingUser(false); // Don't show loading if plan is invalid
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]); // Rerun if planId changes

  // --- M-Pesa Payment Handler --- 
  const handleMpesaPayment = async () => {
    if (!mpesaPhoneNumber) {
        setError("Please enter your M-Pesa phone number (e.g., 07...).");
        return;
    }
    // Basic format check (starts with 07 or 254 and has reasonable length)
    if (!/^(07|2547)\d{8}$/.test(mpesaPhoneNumber.replace(/\s+/g, ''))) {
         setError("Invalid phone number format. Please use 07... or 254...");
        return;
    }

    setIsLoadingMpesa(true);
    setError(null);
    setStatusMessage(''); // Clear previous status
    console.log('Initiating M-Pesa payment for plan:', planId, 'to phone:', mpesaPhoneNumber);

    try {
        const response = await fetch('/api/initiate-mpesa-stk', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                planId: planId, 
                phoneNumber: mpesaPhoneNumber 
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to initiate M-Pesa STK push.');
        }

        console.log('M-Pesa STK Response:', data);
        setStatusMessage(data.message || 'STK push initiated. Check your phone.'); // Show success message

    } catch (err) { 
        console.error("M-Pesa Initiation Error:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`M-Pesa Error: ${errorMessage}`);
        setStatusMessage(''); // Clear status on error
    } finally {
       setIsLoadingMpesa(false);
    }
  };

  // --- PayPal Payment Handler --- 
  const handlePaypalPayment = async () => {
    setIsLoadingPaypal(true);
    setError(null);
    setStatusMessage(''); // Clear previous status
    console.log('Initiating PayPal payment for plan:', planId);
    
    try {
        const response = await fetch('/api/create-paypal-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ planId: planId }),
        });

        const data = await response.json();

        if (!response.ok || !data.approvalLink) {
            console.error('PayPal API Error Response:', data);
            throw new Error(data.error || 'Failed to start PayPal payment process.');
        }
        
        console.log('Redirecting to PayPal:', data.approvalLink);
        // Redirect the user to PayPal
        window.location.href = data.approvalLink;
        // Keep loading state true as the redirect will take over

    } catch (err) {
        console.error("PayPal Initiation Error:", err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`PayPal Error: ${errorMessage}`);
        setIsLoadingPaypal(false); // Stop loading only on error before redirect
        setStatusMessage('');
    }
    // No finally block to reset loading on success, as page redirects
  };

  // --- Render Logic ---
  if (loadingUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        {/* Add a spinner here */} 
        <p>Loading checkout...</p>
      </div>
    );
  }

  if (!userSession) {
     // This case should ideally be handled by the redirect in useEffect,
     // but adding a fallback message.
     return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
            <p>You need to be logged in to proceed to checkout.</p>
            <Link href={`/auth?redirect=/checkout/${planId}`} className="ml-2 font-medium text-accent-orange hover:underline">
                Login or Sign Up
            </Link>
        </div>
     );
  }

  if (!selectedPlan) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Invalid Plan Selected</h1>
        <p className="text-gray-700 mb-6">The pricing plan ID in the URL is not valid.</p>
        <Link href="/pricing" className="text-accent-orange hover:underline">
          &larr; Go back to Pricing
        </Link>
      </div>
    );
  }

  // --- Main Checkout View ---
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Simple Header */} 
      <header className="bg-white shadow-sm sticky top-0 z-10">
         <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
             <Link href="/pricing" className="flex items-center text-sm text-gray-600 hover:text-gray-900">
                 &larr; Back to Pricing
             </Link>
             {/* Optional: Add logo or user info */} 
             <span className="font-semibold text-gray-800">Checkout</span>
             <div>{/* Placeholder for right side alignment */}</div>
         </nav>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 md:p-8">
            <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Confirm Your Purchase</h1>
            <p className="text-center text-gray-600 mb-6">You're upgrading to the <span className="font-semibold text-accent-orange">{selectedPlan.name}</span>.</p>
            
            <div className="bg-gray-50 rounded-md p-4 mb-6 text-center">
                <p className="text-sm text-gray-500">Total Amount</p>
                <p className="text-3xl font-extrabold text-gray-900">{selectedPlan.price} <span className="text-lg font-medium">{selectedPlan.currency}</span></p>
                <p className="text-xs text-gray-500">per month</p>
            </div>

            {/* Status & Error Messages */} 
            {error && (
               <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-800 rounded-md text-sm">
                  {error}
               </div>
            )}
             {statusMessage && !error && (
               <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-800 rounded-md text-sm">
                  {statusMessage}
               </div>
            )}

            {/* --- Payment Options --- */} 
            <div className="space-y-6">
              {/* --- M-Pesa Section --- */}
              <div className="border rounded-md p-4 space-y-3">
                  <label htmlFor="mpesaPhone" className="flex items-center text-sm font-medium text-gray-700">
                     <DevicePhoneMobileIcon className="w-5 h-5 mr-2 text-green-600" /> M-Pesa Payment
                  </label>
                  <input
                    type="tel"
                    id="mpesaPhone"
                    value={mpesaPhoneNumber}
                    onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                    placeholder="07XX XXX XXX or 254..."
                    disabled={isLoadingMpesa || isLoadingPaypal}
                    className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-orange focus:border-transparent transition duration-150 ease-in-out text-gray-900 disabled:opacity-60"
                  />
                  <button 
                    onClick={handleMpesaPayment}
                    disabled={isLoadingMpesa || isLoadingPaypal || !mpesaPhoneNumber}
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                     {isLoadingMpesa ? 'Processing...' : 'Pay with M-Pesa'}
                  </button>
                  <p className="text-xs text-gray-500 text-center">You will receive an STK push to confirm.</p>
              </div>

              {/* Divider */}
               <div className="relative my-4">
                 <div className="absolute inset-0 flex items-center" aria-hidden="true"><div className="w-full border-t border-gray-300" /></div>
                 <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or</span></div>
               </div>

              {/* --- PayPal Section --- */}
              <div className="border rounded-md p-4">
                  <button 
                    onClick={handlePaypalPayment}
                    disabled={isLoadingPaypal || isLoadingMpesa} // Disable if either is loading
                    className="w-full flex items-center justify-center py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                      <CreditCardIcon className="w-5 h-5 mr-2" /> {/* Changed from PayPalIcon */} 
                     {isLoadingPaypal ? 'Redirecting to PayPal...' : 'Pay with PayPal'}
                  </button>
                   <p className="text-xs text-gray-500 text-center mt-3">Securely pay using your PayPal account.</p>
              </div>
            </div>

            {/* Security Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
                 <LockClosedIconSolid className="w-4 h-4 inline-block mr-1 align-text-bottom" /> Secure Checkout
             </div>

          </div>
      </main>
    </div>
  );
} 