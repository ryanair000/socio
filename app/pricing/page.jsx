'use client'; // May not be strictly needed now, but good practice if adding interactions later

import { useState, useEffect } from 'react'; // Added hooks
import Link from 'next/link';
import { createClient } from '../../lib/supabase/client'; // Import client
import { useRouter } from 'next/navigation'; // For redirects
import Image from 'next/image';
import { CheckIcon } from '@heroicons/react/24/outline'; // Import actual Heroicon

// --- Icon Placeholders ---
// Remove placeholder CheckIcon definition
// const CheckIcon = () => (
//   <svg className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
//     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
//   </svg>
// );

// Placeholder Sparkles Icon (similar to home page)
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>;

// --- Pricing Card Component (Simplified Inline Structure for Clarity) ---
const PricingCard = ({ title, price, frequency, features, buttonText, buttonColor = 'bg-gray-800', CheckComponent = CheckIcon, isUnavailable = false, unavailableText = 'Coming Soon', onClick, isLoading = false, disabled = false, children, isFeatured = false, description = '' }) => (
  <div className={`bg-white rounded-xl shadow-lg p-6 md:p-8 flex flex-col items-center text-center w-full max-w-sm transform transition-transform duration-300 hover:scale-[1.02] ${isUnavailable ? 'opacity-60' : ''} ${isFeatured ? 'border-2 border-accent' : 'border border-gray-200'} relative`}>
    {/* Popular Badge */}
    {isFeatured && (
      <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
        MOST POPULAR
      </span>
    )}
    {/* Placeholder for Image (Optional, can be removed or customized) */}
    {/* <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full mb-6 flex items-center justify-center shadow-md">
        <div className={`w-10 h-10 rounded-full ${buttonColor} opacity-30`}></div> 
    </div> */}

    <h3 className="text-2xl font-semibold text-gray-800 mb-2 mt-4">{title}</h3> {/* Added margin-top if badge exists */} 
    <p className="text-sm text-gray-500 mb-4 min-h-[40px]">{description}</p> {/* Added description */} 
    <p className={`text-4xl font-bold mb-1 ${isFeatured ? 'text-accent' : 'text-gray-800'}`}>
      {price}
    </p>
    <p className="text-sm font-normal text-gray-500 mb-6">{frequency}</p>

    {!isUnavailable ? (
      <>
        <button 
          onClick={onClick} 
          disabled={disabled || isLoading} // Disable if globally disabled or this card is loading
          className={`w-full py-3 px-6 rounded-md text-white font-semibold text-sm ${isFeatured ? 'bg-accent hover:bg-accent-dark' : 'bg-gray-800 hover:bg-gray-700'} transition mb-6 shadow-md disabled:opacity-70 disabled:cursor-not-allowed`}
         >
          {isLoading ? 'Processing...' : buttonText} {/* Show loading text */} 
        </button>
        <ul className="space-y-3 text-left text-gray-600 text-sm w-full">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <CheckComponent className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
              <span className="ml-1">{feature}</span> {/* Adjusted margin */} 
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

  const tiers = [
    {
      name: 'Free',
      priceMonthly: 0,
      priceSuffix: '/month',
      description: 'Get started and explore basic features.',
      textGenerations: '10 generations/month',
      imageGenerations: '5 generations/month',
      features: [
        '50 Text Generations/month',
        '30 Image Generations/month',
        'Standard caption quality',
        'Basic themes & tone control',
        'Community support'
      ],
      cta: 'Sign Up for Free',
      ctaLink: '/auth',
      isFeatured: false,
    },
    {
      name: 'Pro',
      priceMonthly: 1500,
      priceSuffix: 'KSH/month',
      description: 'For power users and frequent creators.',
      textGenerations: 'Unlimited text',
      imageGenerations: '200/month',
      features: [
        'Premium themes & tone control',
        'Priority support',
        'Hashtag generator',
        'Faster, higher quality models (e.g., GPT-4 Vision)',
        '(Get 2 months free with annual plan!)'
      ],
      cta: 'Choose Pro',
      ctaLink: '/checkout/pro',
      isFeatured: true,
    },
    {
      name: 'Business',
      priceMonthly: 5000,
      priceSuffix: 'KSH/month',
      description: 'Designed for teams and businesses.',
      textGenerations: 'Unlimited text',
      imageGenerations: '500/month',
      features: [
        'Team collaboration features',
        'Custom themes/branding options',
        'Analytics dashboard',
        'Highest priority support'
      ],
      cta: 'Choose Business',
      ctaLink: '/checkout/business',
      isFeatured: false,
    },
  ];

  const payg = {
    textPrice: '10 KSH/generation',
    imagePrice: '20 KSH/generation',
    bulkDiscount: '200 KSH for 50 text + 20 image credits (20% discount)',
    description: 'Perfect for occasional use without a subscription commitment.'
  };

  const enterprise = {
    price: 'Starts at 20,000 KSH/month',
    description: 'Custom solutions for high-volume needs and integrations.',
    features: [
        'Unlimited generations',
        'Dedicated/Fine-tuned AI models',
        'API access',
        '24/7 support & SLA guarantees',
        'Custom integrations'
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:sales@captionmagic.example.com' // Replace with actual contact
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header - Assuming layout.jsx handles this */}
      
      <main className="max-w-7xl mx-auto pt-16 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
            Pricing Plans
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose the plan that fits your needs. Start for free or unlock powerful features.
          </p>
        </div>

        {/* Tiered Subscription Plans */}
        <div className="mt-12 space-y-12 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-stretch xl:grid-cols-4">
          {tiers.map((tier) => (
            <div key={tier.name} className={`relative flex flex-col rounded-lg border ${tier.isFeatured ? 'border-accent-orange shadow-xl' : 'border-gray-200'} bg-white p-8 mt-8 lg:mt-0`}>
              {tier.isFeatured && (
                  <div className="absolute top-0 py-1.5 px-4 bg-accent-orange rounded-full text-xs font-semibold uppercase tracking-wide text-white transform -translate-y-1/2">
                      Most Popular
                  </div>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{tier.name}</h3>
              <p className="mt-4 text-sm text-gray-500">{tier.description}</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-gray-900">{tier.priceMonthly === 0 ? 'Free' : tier.priceMonthly}</span>
                <span className="text-base font-medium text-gray-500">{tier.priceMonthly !== 0 ? tier.priceSuffix : ''}</span>
              </div>

              {/* Generation Limits */}
              <div className="mt-6 space-y-2 text-sm text-gray-700">
                  <p><span className="font-semibold">Text:</span> {tier.textGenerations}</p>
                  <p><span className="font-semibold">Image:</span> {tier.imageGenerations}</p>
              </div>

              {/* Features */}
              <ul role="list" className="mt-6 space-y-4 flex-grow">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Link
                href={tier.ctaLink}
                className={`mt-8 block w-full ${tier.isFeatured ? 'bg-accent-orange hover:bg-amber-600' : 'bg-gray-800 hover:bg-gray-700'} text-white text-center py-3 px-6 border border-transparent rounded-md shadow font-medium transition-colors duration-150`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* Pay-As-You-Go Section */}
        <div className="mt-20 pt-12 border-t border-gray-200">
           <div className="text-center">
              <h2 className="text-3xl font-extrabold text-gray-900">Pay As You Go</h2>
              <p className="mt-3 text-lg text-gray-600">{payg.description}</p>
           </div>
           <div className="mt-8 max-w-2xl mx-auto bg-white rounded-lg shadow p-6 flex flex-col sm:flex-row justify-around items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <div className="text-center">
                  <p className="text-sm font-medium text-gray-500 uppercase">Text Caption</p>
                  <p className="mt-1 text-2xl font-bold text-gray-900">{payg.textPrice}</p>
              </div>
              <div className="text-center">
                   <p className="text-sm font-medium text-gray-500 uppercase">Image Caption</p>
                   <p className="mt-1 text-2xl font-bold text-gray-900">{payg.imagePrice}</p>
              </div>
              <div className="text-center">
                   <p className="text-sm font-medium text-gray-500 uppercase">Bulk Credits</p>
                   <p className="mt-1 text-lg font-medium text-gray-900">{payg.bulkDiscount}</p>
              </div>
           </div>
        </div>

        {/* Enterprise Section */}
        <div className="mt-20 pt-12 border-t border-gray-200">
          <div className="lg:grid lg:grid-cols-3 lg:gap-x-8">
            <div>
              <h2 className="text-base font-semibold text-accent-orange uppercase tracking-wide">Everything you need</h2>
              <p className="mt-2 text-3xl font-extrabold text-gray-900">Enterprise Solutions</p>
              <p className="mt-4 text-lg text-gray-500">{enterprise.description}</p>
              <p className="mt-4 text-lg font-semibold text-gray-700">{enterprise.price}</p>
            </div>
            <div className="mt-12 lg:mt-0 lg:col-span-2">
              <dl className="space-y-10 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-x-6 sm:gap-y-10 lg:gap-x-8">
                {enterprise.features.map((feature) => (
                  <div key={feature} className="flex">
                    <CheckIcon className="w-5 h-5 text-green-500 mr-2 flex-shrink-0" />
                    <div className="ml-3">
                       <dt className="text-sm font-medium text-gray-900">{feature}</dt>
                       {/* Optional: Add description for enterprise features if needed */}
                    </div>
                  </div>
                ))}
              </dl>
              <div className="mt-10">
                 <Link 
                    href={enterprise.ctaLink}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-accent-orange hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-orange transition-colors duration-150"
                  >
                   {enterprise.cta}
                 </Link>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer - Assuming layout.jsx handles this */}
    </div>
  );
} 