"use client";
import { useState } from "react";

export default function RedeemKeyDialog({ open, onClose, onRedeem }) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    // Validate 12-digit code
    if (!/^\d{12}$/.test(key)) {
      setMessage("Key must be exactly 12 digits.");
      setLoading(false);
      return;
    }
    // Simulate redeem logic
    if (onRedeem) {
      await onRedeem(key, setMessage, setLoading);
    } else {
      setTimeout(() => {
        setLoading(false);
        setMessage("Key redeemed! (Demo only)");
      }, 1200);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-sm w-full p-6 relative">
        <button
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
          onClick={onClose}
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold mb-4 text-accent">Redeem Access Key</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={key}
            onChange={e => setKey(e.target.value.replace(/\D/g, '').slice(0, 12))}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent mb-4 tracking-widest text-lg text-center"
            placeholder="12-digit code"
            required
            inputMode="numeric"
            pattern="\d{12}"
            maxLength={12}
            minLength={12}
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-accent text-white font-bold py-2 px-4 rounded hover:bg-accent-dark transition-colors disabled:opacity-60"
            disabled={loading || key.length !== 12}
          >
            {loading ? "Redeeming..." : "Redeem Key"}
          </button>
        </form>
        {message && <div className="mt-4 text-red-600 font-medium">{message}</div>}
      </div>
    </div>
  );
}
