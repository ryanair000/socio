'use client';

import React from 'react';
import { XMarkIcon, CreditCardIcon } from '@heroicons/react/24/outline';

export default function CreditTopUpPopup({ onPurchase, onClose }) {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <XMarkIcon className="h-6 w-6" />
        </button>

        <div className="text-center">
          <CreditCardIcon className="w-12 h-12 mx-auto text-accent mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Running Low on Credits?</h3>
          <p className="text-gray-600 mb-4">Top up now and keep creating!</p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-md p-4 mb-6">
            <p className="font-semibold text-lg text-gray-900">Special Offer:</p>
            <p className="text-gray-700">+100 Text Credits</p>
            <p className="text-gray-700">+50 Image Credits</p>
            <p className="text-2xl font-bold text-accent mt-2">250 KSH</p>
          </div>

          <div className="flex justify-center space-x-4">
            <button
              onClick={onClose} // Or a function to remind later
              className="px-5 py-2 rounded-md text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={onPurchase} 
              className="px-5 py-2 rounded-md text-sm font-medium text-white bg-accent hover:bg-accent-dark transition-colors shadow-sm"
            >
              Purchase Credits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 