'use client'; // May not be strictly needed now, but good practice if adding interactions later

import { useState, useEffect } from 'react'; // Added hooks
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client'; // Import client
import { useRouter } from 'next/navigation'; // For redirects

// --- Icon Placeholders ---
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-tripadvisor-green"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>;
// --- Added orange check for the middle tier ---
const CheckIconOrange = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-orange-500"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>; 
const GoBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>;

// --- Pricing Card Component (Simplified Inline Structure for Clarity) ---
const PricingCard = ({ title, price, frequency, features, buttonText, buttonColor = 'bg-tripadvisor-green', CheckComponent = CheckIcon, isUnavailable = false, unavailableText = 'Coming Soon', onClick, isLoading = false, disabled = false, children }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col items-center text-center w-full max-w-sm transform transition-transform duration-300 hover:scale-[1.02] ${isUnavailable ? 'opacity-60' : ''}`}>
    {/* Placeholder for Image */}
    <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 flex items-center justify-center shadow-md">
        <div className={`w-10 h-10 rounded-full ${buttonColor} opacity-30`}></div> 
    </div>

    <h3 className="text-2xl font-semibold text-gray-800 mb-2">{title}</h3>
    <p className={`text-xl font-medium mb-6 ${buttonColor === 'bg-orange-500' ? 'text-orange-600' : 'text-tripadvisor-green'}`}>
      {price}<span className="text-sm font-normal text-gray-500">{frequency}</span>
    </p>

    {!isUnavailable ? (
      <>
        <button 
          onClick={onClick} 
          disabled={disabled || isLoading} // Disable if globally disabled or this card is loading
          className={`w-full py-3 px-6 rounded-full text-white font-semibold text-sm ${buttonColor} hover:opacity-90 transition mb-8 shadow-md disabled:opacity-70 disabled:cursor-not-allowed`}
         >
          {isLoading ? 'Processing...' : buttonText} {/* Show loading text */} 
        </button>
        <ul className="space-y-3 text-left text-gray-600 text-sm w-full">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckComponent />
              <span className="ml-2">{feature}</span>
            </li>
          ))}
        </ul>
      </>
    ) : (
      <div className="mt-8 pt-8 border-t border-gray-200 w-full">
        <p className="text-gray-500 text-sm italic">{unavailableText}</p>
      </div>
    )}
     {children}
  </div>
);

// --- Main Page Component ---
export default function PricingPage() {
  // State for user session, loading, and errors
  const [userSession, setUserSession] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(null); // Track loading for specific plan ID
  const [planError, setPlanError] = useState(null);
  
  const supabase = createClient();
  const router = useRouter();

  // Fetch user session on mount
  useEffect(() => {
    const fetchSession = async () => {
      setLoadingUser(true); // Start loading
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        setUserSession(session);
      } catch (error) {
        console.error("Error fetching user session:", error);
        setUserSession(null); // Ensure session is null on error
      } finally {
        setLoadingUser(false); // Finish loading
      }
    };
    fetchSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Features based on new markdown
  const premiumFeatures = [
    '300 captions/month (+ $0.02 per extra)',
    'All platforms (7+ including TikTok/LinkedIn)',
    '10 hashtags per caption',
    'Emoji suggestions',
    'Basic analytics (engagement score)',
    '30-day caption history',
    'Email support (24hr response)',
    'Caption Rephrasing (3 variants)', // Value-add
    'Post Calendar (basic view)' // Value-add
  ];

  const ultimateFeatures = [
    '800 captions/month (+ $0.015 per extra)',
    'Team access (2 members included)',
    'White-label branding option',
    'Scheduled posting (auto-post to 3 platforms)',
    'Advanced analytics (A/B testing, Best time)',
    'Priority support (1-hour response)',
    'AI Post Ideas Generator', // Value-add
    'Team Role Management', // Value-add
    'Custom Voice Presets' // Value-add
  ];
  
  // Handler for choosing a plan
  const handleChoosePlan = async (planId) => {
    setLoadingPlan(planId); 
    setPlanError(null);

    // Show loading indicator while checking session if needed
    if (loadingUser) return; 

    if (!userSession) {
      router.push('/auth?redirect=/pricing'); 
      // Don't reset loadingPlan here, let the redirect happen
      return;
    }

    console.log(`User ${userSession.user.id} chose plan: ${planId}`);

    try {
      // --- Updated Logic: Redirect to Checkout Page ---
      router.push(`/checkout/${planId}`); 
      // --- End Updated Logic ---

    } catch (error) {
      // This catch block might be less relevant now unless the redirect itself fails
      console.error(`Error redirecting for plan ${planId}:`, error);
      setPlanError(`Failed to proceed to checkout for ${planId}. Please try again.`);
      setLoadingPlan(null); // Stop loading on error
    }
    // Do not reset loadingPlan here if redirect is successful, 
    // as the page will navigate away.
  };

  // Display loading state while checking user session
  if (loadingUser) {
     return (
       <div className="min-h-screen flex items-center justify-center">
          <p>Loading pricing...</p> 
          {/* Add a spinner here later */}
       </div>
     );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-100">
       {/* Header/Go Back */}
       <header className="p-4 md:p-6">
         <Link href="/" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 bg-white px-3 py-1.5 rounded-full shadow-sm border border-gray-200 hover:border-gray-300 transition">
           <GoBackIcon />
           Go back
         </Link>
       </header>

      {/* Pricing Section */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 md:p-8 lg:p-12">
        {/* Plan Selection Error Display */}
        {planError && (
          <div className="mb-6 w-full max-w-md text-center text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
            {planError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Premium Tier Card - Pass handlers and loading state */}
          <PricingCard
            title="Premium"
            price="$5"
            frequency="/month"
            features={premiumFeatures}
            buttonText="Choose Premium"
            buttonColor="bg-tripadvisor-green"
            CheckComponent={CheckIcon}
            onClick={() => handleChoosePlan('premium')}
            isLoading={loadingPlan === 'premium'} // Is this specific card loading?
            disabled={loadingPlan !== null && loadingPlan !== 'premium'} // Disable if another card is loading
          />

          {/* Ultimate Tier Card - Pass handlers and loading state */}
          <PricingCard
            title="Ultimate"
            price="$10"
            frequency="/month"
            features={ultimateFeatures}
            buttonText="Choose Ultimate"
            buttonColor="bg-orange-500"
            CheckComponent={CheckIconOrange}
            onClick={() => handleChoosePlan('ultimate')}
            isLoading={loadingPlan === 'ultimate'} // Is this specific card loading?
            disabled={loadingPlan !== null && loadingPlan !== 'ultimate'} // Disable if another card is loading
          />
        </div>
      </main>

      {/* Footer (Similar to other pages) */}
      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
           <div className="flex items-center">
             <div className="flex space-x-1 mr-2">
               <div className="w-1.5 h-5 bg-tripadvisor-green"></div>
               <div className="w-1.5 h-5 bg-tripadvisor-green"></div>
             </div>
            <span className="font-semibold text-lg">CaptionMagic</span>
           </div>
           <div className="flex items-center">
             <span className="text-sm mr-2">curated by</span>
             <span className="font-semibold text-lg">Mobbin</span> 
           </div>
        </div>
      </footer>
    </div>
  );
} 