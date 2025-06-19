"use client";

import { useState } from "react";

// Accept userProfile and setUserProfile as optional props for credit update
export default function RedeemKeyDialog({ open, onClose, userProfile, setUserProfile }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  if (!open) return null;

  const handleRedeem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    // Simulate redeem logic
    setTimeout(() => {
      setLoading(false);
      // Update credits if userProfile and setUserProfile are provided
      if (userProfile && setUserProfile) {
        const newText = (userProfile.monthly_text_generations_used ?? 0) + 20;
        const newImage = (userProfile.monthly_image_generations_used ?? 0) + 15;
        setUserProfile({
          ...userProfile,
          monthly_text_generations_used: newText,
          monthly_image_generations_used: newImage,
        });
        setMessage(`Key redeemed! +20 text, +15 image generations. New totals: ${newText} text, ${newImage} image.`);
      } else {
        setMessage("Key redeemed! +20 text, +15 image generations.");
      }
      // Optionally call onClose or redirect
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-sm p-6 relative animate-fade-in">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-xl font-bold focus:outline-none"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
        <h2 className="text-2xl font-bold mb-4 text-accent text-center">Redeem Access Key</h2>
        <form className="space-y-4" onSubmit={handleRedeem}>
          <label className="block text-gray-700 font-medium" htmlFor="redeem-key-modal">
            Enter your key
          </label>
          <input
            id="redeem-key-modal"
            type="text"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent"
            placeholder="Paste your access key here"
            required
          />
          <button
            type="submit"
            className="w-full bg-accent text-white font-bold py-2 px-4 rounded hover:bg-accent-dark transition-colors disabled:opacity-60"
            disabled={loading || !key}
          >
            {loading ? "Redeeming..." : "Redeem Key"}
          </button>
          {message && <div className="mt-2 text-green-600 font-medium text-center">{message}</div>}
        </form>
      </div>
    </div>
  );
}
