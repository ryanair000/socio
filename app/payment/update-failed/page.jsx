'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// Placeholder Warning Icon
const ExclamationTriangleIcon = ({ className = 'w-16 h-16 text-yellow-500' }) => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.008v.008H12v-.008Z" /></svg>;

// Inner component that uses useSearchParams
function UpdateFailedContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center max-w-lg">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Account Update Needed</h1>
        <p className="text-gray-600 mb-6">
          Your payment was likely successful, but we encountered an issue updating your account automatically.
          Please contact support and provide your payment Order ID to activate your plan manually.
        </p>
        {orderId && (
            <p className="text-sm text-gray-500 mb-6 bg-gray-100 p-3 rounded">
                Your Order ID: <span className="font-mono font-medium text-gray-700">{orderId}</span>
            </p>
        )}
        <Link
          href="/support" // Link to your support page/contact info
          className="inline-block px-8 py-3 bg-gray-700 text-white font-semibold rounded-full hover:bg-gray-800 transition duration-150 shadow-md"
        >
          Contact Support
        </Link>
        <p className="mt-8 text-sm text-gray-500">
          <Link href="/" className="underline hover:text-accent-orange">Go back to Home</Link>.
        </p>
      </div>
    </div>
  );
}

// Main export component wraps the inner component in Suspense
export default function PaymentUpdateFailedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading details...</div>}>
        <UpdateFailedContent />
    </Suspense>
  );
} 