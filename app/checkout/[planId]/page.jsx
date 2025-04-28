'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '../../../lib/supabase/client'; // Adjusted path

// --- Icon Placeholders ---
const CheckCircleIcon = ({ className = 'w-6 h-6' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;
const LockClosedIcon = ({ className = 'w-4 h-4 mr-1' }) => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>;

// --- Placeholder Icons for Payment Methods ---
const PayPalIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#00457C]" viewBox="0 0 24 24" fill="currentColor"><path d="M8.382 20.172a.96.96 0 0 0 .95.797h2.087a.64.64 0 0 0 .63-.571l.706-4.212a.96.96 0 0 1 .95-.797h2.174c3.08 0 4.53-1.49 5.075-4.046.356-1.67-.27-3.087-1.24-4.046C21.723 6.27 20.373 5.5 18.05 5.5h-4.298a.64.64 0 0 0-.63.571l-.705 4.212a.96.96 0 0 1-.95.797H9.291c-2.176 0-3.487.94-3.84 2.812-.28.98-.106 1.96.53 2.778zm6.99-10.86h2.174c1.794 0 2.684.653 2.934 2.034.294 1.38-.344 2.43-1.31 2.43h-1.847a.64.64 0 0 0-.63.571l-.353 2.106a.96.96 0 0 1-.95.797H14.2a.64.64 0 0 0-.63.571l-.565 3.369a.96.96 0 0 1-.95.797h-1.67a.64.64 0 0 1-.63-.571l-.706-4.212a.96.96 0 0 0-.95-.797H6.877c-1.294 0-1.907-.547-2.08-1.63-.19-.98.28-1.8.997-2.21.723-.41 1.614-.61 2.505-.61h2.174a.64.64 0 0 0 .63-.571l.706-4.212A.96.96 0 0 1 12.7 3.828h2.672a.96.96 0 0 1 .949.784z"/></svg>; // Basic PayPal Logo

// Plan details (replace with actual fetching or static data)
const PLAN_DETAILS = {
  premium: { name: 'Premium Plan', price: 5, frequency: '/ month' },
  ultimate: { name: 'Ultimate Plan', price: 10, frequency: '/ month' }
};

export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();

  const planId = params.planId;
  const plan = PLAN_DETAILS[planId] || { name: 'Selected Plan', price: 'N/A', frequency: '' };

  const [currentStep, setCurrentStep] = useState(1); // 1: Contact, 2: Payment
  const [userSession, setUserSession] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState(null);

  // Contact Details State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  // Payment Details State
  const [isProcessingPayment, setIsProcessingPayment] = useState(false); 

  useEffect(() => {
    const fetchSessionAndRedirect = async () => {
      setLoadingUser(true);
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;
        if (!session) {
          router.push(`/auth?redirect=/checkout/${planId}`); // Redirect if not logged in
        } else {
          setUserSession(session);
          // Pre-fill email if available
          setEmail(session.user.email || ''); 
        }
      } catch (err) {
        console.error("Error fetching user session:", err);
        setError("Failed to load user session. Please try logging in again.");
        // Optional: Redirect to auth on error too
        // router.push('/auth');
      } finally {
        setLoadingUser(false);
      }
    };
    fetchSessionAndRedirect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId]); // Re-check session if planId changes (though unlikely)

  const handleContactSubmit = (e) => {
      e.preventDefault();
      // Add validation here if needed
      setCurrentStep(2); // Move to payment step
  };

  const handlePaymentSubmit = async (e) => {
      e.preventDefault();
      setError(null);
      setIsProcessingPayment(true);

      if (!planId) {
        setError('No plan selected.');
        setIsProcessingPayment(false);
        return;
      }

      try {
          // 1. Call API route to create PayPal order
          console.log('Calling /api/create-paypal-order for plan:', planId);
          const response = await fetch('/api/create-paypal-order', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ planId: planId }),
          });

          const data = await response.json();

          if (!response.ok || !data.approvalLink) {
              console.error('API Error Response:', data);
              throw new Error(data.error || 'Failed to start PayPal payment process.');
          }
          
          console.log('Received PayPal approval link:', data.approvalLink);
          // 2. Redirect the user to PayPal
          window.location.href = data.approvalLink;
          // Keep loading state true as the redirect will take over

      } catch (err) {
          console.error('PayPal Payment initiation error:', err);
          const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
          setError(`Payment initiation failed: ${errorMessage}`);
          setIsProcessingPayment(false); // Stop loading only on error before redirect
      }
  };

  if (loadingUser) {
    return <div className="min-h-screen flex items-center justify-center">Loading Checkout...</div>;
  } 
  
  if (!planId || !PLAN_DETAILS[planId]) {
     return <div className="min-h-screen flex items-center justify-center">Invalid plan selected. <Link href="/pricing" className='ml-2 underline'>Go back to pricing</Link>.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Header */} 
      <header className="bg-white shadow-sm">
         <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
             <Link href="/" className="flex items-center">
                 {/* Using simple square placeholders for the || logo like ElevenLabs */}
                 <div className="flex space-x-1 mr-2">
                   <div className="w-1.5 h-5 bg-tripadvisor-green"></div>
                   <div className="w-1.5 h-5 bg-tripadvisor-green"></div>
                 </div>
                <span className="font-semibold text-lg text-gray-800">CaptionMagic Checkout</span>
             </Link>
             {/* Optional: Add user info or logout here */}
         </nav>
      </header>

      {/* Main Content */} 
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left/Main Column (Form) */} 
            <div className="md:col-span-2 bg-white p-6 md:p-8 rounded-lg shadow-md">
                {/* Step Indicator */}
                <div className="flex items-center justify-center space-x-4 mb-8">
                    <div className={`flex items-center ${currentStep >= 1 ? 'text-tripadvisor-green' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 1 ? 'bg-tripadvisor-green border-tripadvisor-green text-white' : 'border-gray-300'}`}>1</div>
                        <span className={`ml-2 text-sm font-medium ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>Contact Details</span>
                    </div>
                    <div className={`flex-1 h-px ${currentStep >= 2 ? 'bg-tripadvisor-green' : 'bg-gray-200'}`}></div>
                    <div className={`flex items-center ${currentStep >= 2 ? 'text-tripadvisor-green' : 'text-gray-400'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${currentStep >= 2 ? 'bg-tripadvisor-green border-tripadvisor-green text-white' : 'border-gray-300'}`}>2</div>
                        <span className={`ml-2 text-sm font-medium ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>Payment Details</span>
                    </div>
                </div>

                {/* Display Errors */}
                {error && (
                   <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                      {error}
                   </div>
                )}

                {/* Step 1: Contact Details Form */}
                {currentStep === 1 && (
                    <form onSubmit={handleContactSubmit} className="space-y-5">
                        <h2 className="text-xl font-semibold mb-4">Contact Details</h2>
                        <p className="text-sm text-gray-600 mb-6">We'll use this information if we need to contact you about your subscription.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div>
                                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                                <input type="text" id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-gray-900" />
                            </div>
                            <div>
                                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                                <input type="text" id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-gray-900" />
                            </div>
                        </div>
                         <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input type="email" id="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 text-gray-900 bg-gray-50" readOnly={!!userSession?.user?.email} /> {/* Readonly if prefilled */} 
                        </div>
                        {/* Add other fields like phone if needed */}
                        <div className="pt-5">
                           <button type="submit" className="w-full md:w-auto float-right py-3 px-8 border border-transparent rounded-full shadow-sm text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition duration-150">
                               Next: Payment Details
                            </button>
                        </div>
                    </form>
                )}

                {/* Step 2: Payment Details Form (Simplified for PayPal) */} 
                {currentStep === 2 && (
                   <form onSubmit={handlePaymentSubmit} className="space-y-6"> 
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold">Payment Details</h2>
                            <button type="button" onClick={() => setCurrentStep(1)} className="text-sm text-gray-600 hover:underline">&larr; Back to Contact</button>
                        </div>
                        
                        {/* Display PayPal Option */}
                       <div className="space-y-3">
                         <p className="block text-sm font-medium text-gray-700 mb-1">Pay with:</p>
                         
                         {/* PayPal Info Display (Not a radio button anymore) */}
                         <div className="relative flex items-center border rounded-md p-4 border-gray-300 bg-gray-50">
                             <PayPalIcon /> 
                             <span className="ml-3 block text-sm font-medium text-gray-900">PayPal</span>
                             {/* Optionally add text like "You will be redirected to PayPal." */}
                         </div>
                       </div>
                       
                       <div className="pt-6 border-t border-gray-200">
                          <p className="text-xs text-gray-500 mb-4">You will be redirected to PayPal to complete your purchase securely. By clicking below, you acknowledge CaptionMagic's Terms & Privacy Policy.</p>
                           <button 
                             type="submit" 
                             disabled={isProcessingPayment} // Only disable while processing
                             className="w-full flex justify-center items-center py-3 px-8 border border-transparent rounded-full shadow-sm text-sm font-semibold text-white bg-[#0070ba] hover:bg-[#005ea6] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0070ba] transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                               {isProcessingPayment ? (
                                 <>
                                   <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                   </svg>
                                   Processing...
                                 </>
                               ) : (
                                 <>
                                   <PayPalIcon />
                                   <span className="ml-2">Proceed to PayPal</span> 
                                 </>
                               )}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {/* Right Column (Order Summary) */} 
            <div className="md:col-span-1">
                <div className="bg-white p-6 rounded-lg shadow-md sticky top-24"> {/* Sticky summary */}
                   <h3 className="text-lg font-semibold mb-4 border-b pb-3">Order Summary</h3>
                   <div className="space-y-2 text-sm mb-4">
                      <div className="flex justify-between">
                         <span className="text-gray-600">Plan:</span>
                         <span className="font-medium text-gray-900">{plan.name}</span>
                      </div>
                      <div className="flex justify-between">
                         <span className="text-gray-600">Billing:</span>
                         <span className="font-medium text-gray-900">Monthly</span> {/* Or adjust based on plan freq */} 
                      </div>
                       {/* Add promo code section if needed */}
                   </div>
                   <div className="border-t pt-4 space-y-2">
                      <div className="flex justify-between text-sm text-gray-600">
                         <span>Subtotal</span>
                         <span>${plan.price.toFixed(2)}</span>
                      </div>
                      {/* Add taxes if applicable */}
                      <div className="flex justify-between text-base font-semibold text-gray-900">
                         <span>Total (USD)</span>
                         <span>${plan.price.toFixed(2)}</span>
                      </div>
                   </div>
                  
                   <div className="mt-6 border-t pt-4 text-xs text-gray-500 space-y-2">
                       <p className="flex items-center"><LockClosedIcon className="text-gray-400"/> Secure SSL Encryption</p>
                       <p>Your subscription will auto-renew monthly. Cancel anytime.</p>
                   </div>
                </div>
            </div>
        </div>
      </main>
    </div>
  );
} 