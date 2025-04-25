'use client'; // May not be strictly needed now, but good practice if adding interactions later

import Link from 'next/link';

// --- Icon Placeholders ---
const CheckIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-tripadvisor-green"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>;
// --- Added orange check for the middle tier ---
const CheckIconOrange = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 text-orange-500"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>; 
const GoBackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" /></svg>;

// --- Pricing Card Component (Simplified Inline Structure for Clarity) ---
const PricingCard = ({ title, price, frequency, features, buttonText, buttonColor = 'bg-tripadvisor-green', CheckComponent = CheckIcon, isUnavailable = false, unavailableText = 'Coming Soon', children }) => (
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
        <button className={`w-full py-3 px-6 rounded-full text-white font-semibold text-sm ${buttonColor} hover:opacity-90 transition mb-8 shadow-md`}>
          {buttonText}
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
      <main className="flex-grow flex items-center justify-center p-4 md:p-8 lg:p-12">
        {/* Centering the two cards - adjust grid columns and max-width */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          {/* Premium Tier Card */}
          <PricingCard
            title="Premium"
            price="$5"
            frequency="/month"
            features={premiumFeatures}
            buttonText="Choose Premium"
            buttonColor="bg-tripadvisor-green"
            CheckComponent={CheckIcon} // Use green check
          />

          {/* Ultimate Tier Card */}
          <PricingCard
            title="Ultimate"
            price="$10"
            frequency="/month"
            features={ultimateFeatures}
            buttonText="Choose Ultimate"
            buttonColor="bg-orange-500" // Keep orange emphasis for higher tier
            CheckComponent={CheckIconOrange} // Use orange check
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