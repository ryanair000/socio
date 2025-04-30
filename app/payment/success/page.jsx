'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

// Placeholder Checkmark Icon
const CheckCircleIcon = ({ className = 'w-16 h-16 text-green-500' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>;

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  // Optional: Trigger confetti effect on load
  useEffect(() => {
    // Add confetti library logic here if desired
    console.log("Payment success page loaded for plan:", plan);
  }, [plan]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center max-w-lg">
        <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Payment Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your subscription to the <span className="font-semibold capitalize">{plan || 'selected'}</span> plan is now active.
          You can now access all the features included in your plan.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-accent-orange text-white font-semibold rounded-full hover:bg-amber-600 transition duration-150 shadow-md"
        >
          Start Generating Captions
        </Link>
         <p className="mt-8 text-sm text-gray-500">
          Need help? <Link href="/support" className="underline hover:text-accent-orange">Contact Support</Link>.
        </p>
      </div>
    </div>
  );
} 