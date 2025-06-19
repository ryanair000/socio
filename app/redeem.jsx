"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RedeemPage() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  const handleRedeem = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      });
      const data = await res.json();
      setLoading(false);
      if (!res.ok) {
        setMessage(data.error || 'Redeem failed.');
        return;
      }
      setMessage('Key redeemed! +20 text, +15 image generations.');
      setKey("");
      // Optionally redirect after a short delay
      // setTimeout(() => router.push('/'), 1200);
    } catch (err) {
      setLoading(false);
      setMessage('Server error. Try again.');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh]">
      <h2 className="text-2xl font-bold mb-4 text-accent">Redeem Access Key</h2>
      <form className="w-full max-w-sm bg-white p-6 rounded-lg shadow-lg" onSubmit={handleRedeem}>
        <label className="block text-gray-700 font-medium mb-2" htmlFor="redeem-key">
          Enter your key
        </label>
        <input
          id="redeem-key"
          type="text"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-accent mb-4"
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
        {message && <div className="mt-4 text-green-600 font-medium">{message}</div>}
      </form>
    </div>
  );
}
