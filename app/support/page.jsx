'use client';

import Link from 'next/link';

export default function SupportPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 md:p-12 text-center max-w-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Support</h1>
        <p className="text-gray-600 mb-6">
          Need help with your account, payments, or using CaptionMagic?
          Please reach out to us!
        </p>
        <div className="space-y-4">
            <p>
               <strong>Email:</strong> <a href="mailto:support@captionmagic.example.com" className="text-accent-orange hover:underline">support@captionmagic.example.com</a>
            </p>
             {/* Add other contact methods if desired (e.g., phone, chat link) */}
             <p className="text-sm text-gray-500">
                We aim to respond within 24 business hours.
             </p>
        </div>
        <div className="mt-8">
             <Link
                href="/"
                className="text-sm text-gray-600 hover:text-accent-orange transition-colors duration-150"
                >
                    &larr; Back to Generator
            </Link>
        </div>
      </div>
    </div>
  );
} 