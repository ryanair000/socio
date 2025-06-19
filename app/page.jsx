'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import RedeemKeyDialog from './components/RedeemKeyDialog' // Updated path for app directory
import { createClient } from '../lib/supabase/client'
import {
  ChatBubbleLeftRightIcon,
  PhotoIcon,
  TagIcon,
  UserCircleIcon,
  BoltIcon,
  ClipboardDocumentIcon,
  InformationCircleIcon,
  ArrowUturnLeftIcon,
  IdentificationIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  CalendarDaysIcon,
  ArrowUpCircleIcon,
  ArrowLeftOnRectangleIcon,
  ArrowRightOnRectangleIcon,
  CheckIcon as HeroCheckIcon,
  BriefcaseIcon,
  MegaphoneIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import CreditTopUpPopup from '../components/CreditTopUpPopup'

// Simple Check Icon for Pricing Section
const CheckIcon = () => <HeroCheckIcon className="w-4 h-4 mr-2 text-green-500 flex-shrink-0" />;

// Placeholder icons - replace with actual SVGs or an icon library later
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 rounded-full"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; // Simple user icon placeholder
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const BuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18M3 21h18" /></svg>;
const UtensilsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-4.5 3V6m0 0a1.5 1.5 0 0 1 3 0v3M3 7.5h15M9 15h1.5M12 15h1.5M15 15h1.5M9 18h1.5M12 18h1.5M15 18h1.5" /></svg>; // Simplified version
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>;
const BuildingOfficeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.25 21v-4.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21M8.25 6.75h.75v.75h-.75V6.75Zm.75 2.25h.75v.75h-.75V9Zm.75 2.25h.75v.75h-.75v-.75Zm2.25-4.5h.75v.75h-.75V6.75Zm.75 2.25h.75v.75h-.75V9Zm.75 2.25h.75v.75h-.75v-.75Z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>;

// --- NEW SOCIAL ICONS ---
const FacebookIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.688.235 2.688.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.099 24 12.073Z"/></svg>;
const TwitterIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0023.953 4.57z"/></svg>;
const InstagramIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>;
const LinkedinIcon = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>;
// --- END SOCIAL ICONS ---

// Helper function to read file as data URL
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- NEW: Helper function to resize image using Canvas ---
function resizeImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Get the data URL of the resized image
        // Use JPEG format with quality setting for compression
        resolve(canvas.toDataURL('image/jpeg', quality)); 
      };
      img.onerror = reject;
      img.src = event.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
// --- END NEW HELPER ---

// --- NEW: Plan Limits (for display) ---
// Match the limits defined in the API route
const PLAN_LIMITS = {
  // Free plan now represents the post-signup limits
  free: { text: 50, image: 30 },
  // Basic plan is removed, Pro/Business remain
  pro: { text: Infinity, image: 200 },
  business: { text: Infinity, image: 500 },
};

// Define trial limits separately for ungated access
const TRIAL_LIMITS = {
  text: 5, // New user trial: 5 text generations
  image: 5, // New user trial: 5 image generations
};

const SIGNUP_LIMITS = {
  text: 20,
  image: 15,
};

export default function Home() {
  // ...existing state
  const [kenyanize, setKenyanize] = useState(false);
  const [showRedeemDialog, setShowRedeemDialog] = useState(false);
  const supabase = createClient(); // <-- Initialize Supabase client
  const router = useRouter(); // <-- Add useRouter for logout redirect

  // Caption Generation State
  const [topic, setTopic] = useState('');
  const [platform, setPlatform] = useState('Instagram'); // Default platform
  const [tone, setTone] = useState('Casual'); // Default tone
  const [generatedCaption, setGeneratedCaption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // New state for image/text mode and image data
  const [inputMode, setInputMode] = useState('text'); // 'text' or 'image'
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [resizedImageData, setResizedImageData] = useState(null); // Store resized data URL
  const [imageCategory, setImageCategory] = useState(null); // New state for selected category
  const [userKeywords, setUserKeywords] = useState(''); // New state for keywords
  const [subjectName, setSubjectName] = useState(''); // New state for name

  // --- NEW: Newsletter State ---
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [newsletterMessage, setNewsletterMessage] = useState({ type: '', text: '' }); // type: 'success' or 'error'

  // --- NEW: User Profile State ---
  const [userProfile, setUserProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // --- NEW: State for ungated trial usage ---
  const [trialTextUsed, setTrialTextUsed] = useState(0);
  const [trialImageUsed, setTrialImageUsed] = useState(0);

  // --- NEW: State for Top-Up Popup ---
  const [showTopUpPopup, setShowTopUpPopup] = useState(false);

  // --- Load trial usage from localStorage on mount ---
  useEffect(() => {
    const savedText = localStorage.getItem('socioTrialTextUsed');
    const savedImage = localStorage.getItem('socioTrialImageUsed');
    if (savedText) setTrialTextUsed(parseInt(savedText, 10) || 0);
    if (savedImage) setTrialImageUsed(parseInt(savedImage, 10) || 0);
  }, []);

  // --- Save trial usage to localStorage when it changes ---
  useEffect(() => {
    localStorage.setItem('socioTrialTextUsed', trialTextUsed.toString());
  }, [trialTextUsed]);

  useEffect(() => {
    localStorage.setItem('socioTrialImageUsed', trialImageUsed.toString());
  }, [trialImageUsed]);

  // --- Fetch User Profile on Mount ---
  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoadingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('plan, monthly_text_generations_used, monthly_image_generations_used, usage_reset_date')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching user profile:", profileError);
          setUserProfile({ userOnly: true }); // Set a placeholder if profile fetch fails but user exists
        } else {
           // Add plan limits to the profile data for easier display
          const plan = profileData.plan || 'free';
          profileData.limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
          profileData.userOnly = false; // Indicate full profile loaded
          setUserProfile(profileData);
        }
      } else {
         // User not logged in, clear profile
         setUserProfile(null);
      }
      setLoadingProfile(false);
    };

    fetchUserProfile();

    // Optional: Listen for auth changes to update profile if user logs in/out
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // If session exists, user is logged in/updated. If null, user logged out.
      fetchUserProfile();
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // --- NEW: Logout Handler ---
  const handleLogout = async () => {
    setIsLoading(true); // Reuse loading state
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      setUserProfile(null); // Clear profile immediately
      router.push('/auth'); // Redirect to auth page after logout
    } catch (signOutError) {
      console.error("Error signing out:", signOutError);
      setError("Failed to sign out. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  // --- END Logout Handler ---

  // --- NEW: Newsletter Submit Handler ---
  const handleNewsletterSubmit = async (event) => {
    event.preventDefault(); // Prevent default form submission
    setIsSubscribing(true);
    setNewsletterMessage({ type: '', text: '' }); // Clear previous messages

    if (!newsletterEmail || !newsletterEmail.includes('@')) {
      setNewsletterMessage({ type: 'error', text: 'Please enter a valid email address.' });
      setIsSubscribing(false);
      return;
    }

    try {
      // TODO: Replace with actual Supabase insert/function call
      console.log('Subscribing email:', newsletterEmail);
      // Example: await supabase.from('newsletter_subscriptions').insert({ email: newsletterEmail })
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      setNewsletterMessage({ type: 'success', text: 'Thanks for subscribing!' });
      setNewsletterEmail(''); // Clear input on success
    } catch (error) {
      console.error('Newsletter subscription error:', error);
      setNewsletterMessage({ type: 'error', text: 'Subscription failed. Please try again later.' });
    } finally {
      setIsSubscribing(false);
    }
  };
  // --- END Newsletter Submit Handler ---

  // --- Signup Prompt Modal ---
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  // --- API Call Logic ---
  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    setImageFile(file); // Store original file
    setImagePreview(null); // Clear previous preview
    setResizedImageData(null); // Clear previous resized data
    setError(null); // Clear previous errors
    setImageCategory(null); // Reset category
    setUserKeywords(''); // Reset keywords
    setSubjectName(''); // Reset name
    
    if (file) {
      setIsLoading(true); // Show loading while resizing
      try {
        // Resize the image and get data URL
        const resizedDataUrl = await resizeImage(file); 
        setImagePreview(resizedDataUrl); // Use resized image for preview
        setResizedImageData(resizedDataUrl); // Store resized data for sending
      } catch (err) {
        console.error("Error resizing image:", err);
        setError("Could not process image. Please try a different one.");
        setImageFile(null); // Clear file state on error
      } finally {
        setIsLoading(false);
      }
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleGenerateCaption = async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedCaption('');

    // --- NEW: Check ungated trial limits if user is not logged in ---
    if (!userProfile) {
      if (inputMode === 'text' && trialTextUsed >= TRIAL_LIMITS.text) {
        setShowSignupPrompt(true);
        setIsLoading(false);
        return;
      }
      if (inputMode === 'image' && trialImageUsed >= TRIAL_LIMITS.image) {
        setShowSignupPrompt(true);
        setIsLoading(false);
        return;
      }
    }
    // --- END NEW ---

    // --- NEW: Check for low credits on free plan BEFORE API call ---
    const LOW_TEXT_THRESHOLD = 3; // Show popup if text credits <= this
    const LOW_IMAGE_THRESHOLD = 1; // Show popup if image credits <= this

    if (userProfile && userProfile.plan === 'free' && !userProfile.userOnly) {
        const textCreditsLeft = (userProfile.limits.text ?? 0) - (userProfile.monthly_text_generations_used ?? 0);
        const imageCreditsLeft = (userProfile.limits.image ?? 0) - (userProfile.monthly_image_generations_used ?? 0);

        if (inputMode === 'text' && textCreditsLeft <= LOW_TEXT_THRESHOLD) {
            setShowTopUpPopup(true);
            // Optional: Prevent generation if you want popup to block
            // setError({ message: "You are low on text credits. Please top up.", isLimitError: true });
            // setIsLoading(false);
            // return;
        } else if (inputMode === 'image' && imageCreditsLeft <= LOW_IMAGE_THRESHOLD) {
            setShowTopUpPopup(true);
            // Optional: Prevent generation if you want popup to block
            // setError({ message: "You are low on image credits. Please top up.", isLimitError: true });
            // setIsLoading(false);
            // return;
        }
    }
    // --- END NEW CREDIT CHECK ---

    let requestBody = {};
    // Add kenyanize flag to request body
    if (kenyanize) {
      requestBody.kenyanize = true;
    }

    if (inputMode === 'text') {
    if (!topic.trim()) {
      setError("Please enter a topic for the caption.");
        setIsLoading(false);
        return;
      }
      requestBody = {
        type: 'text',
        prompt: {
          topic: topic,
          platform: platform,
          tone: tone,
        }
      };
    } else if (inputMode === 'image') {
      if (!resizedImageData) {
        setError("Please select and process an image file.");
        setIsLoading(false);
        return;
      }
      if (!imageCategory) {
        setError("Please select an image category/vibe.");
        setIsLoading(false);
        return;
      }
      requestBody = {
        type: 'image',
        imageData: resizedImageData,
        prompt: {
          platform: platform,
          tone: tone,
          category: imageCategory,
          keywords: userKeywords.trim(),
          name: subjectName.trim() // Include name (optional)
        }
      };
    } else {
      setError("Invalid input mode selected.");
      setIsLoading(false);
      return;
    }

    // API Call (no changes needed here, sends requestBody)
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      let finalCaption = data.caption.trim(); 
      if (finalCaption.startsWith('"') && finalCaption.endsWith('"')) {
        finalCaption = finalCaption.slice(1, -1); 
      }
      
      setGeneratedCaption(finalCaption); 

      // --- NEW: Increment trial counter if not logged in ---
      if (!userProfile) {
        if (inputMode === 'text') {
          setTrialTextUsed(prev => prev + 1);
        } else if (inputMode === 'image') {
          setTrialImageUsed(prev => prev + 1);
        }
      }
      // --- END NEW ---

    } catch (err) {
      console.error("API call failed:", err);
      // Modify error state based on whether it's a limit error
      const errorMessage = err.message || 'Failed to generate caption. Please try again.';
      const isLimitError = errorMessage.includes("limit reached"); // Check for specific wording from API
      setError({
          message: errorMessage,
          isLimitError: isLimitError 
      });
    } finally {
      setIsLoading(false);
    }
  };
  // --- End API Call Logic ---

  // Define categories
  const categories = [
    { name: 'Party', emoji: '🎉' },
    { name: 'Office', emoji: '🏢' },
    { name: 'Kitchen', emoji: '🍳' },
    { name: 'Advertisement', emoji: '📢' },
    { name: 'Nature', emoji: '🌳' }, // Example: Added more
    { name: 'Food', emoji: '🍕' },
    { name: 'Travel', emoji: '✈️' }
  ];

  // --- Helper to format date ---
  const formatDate = (dateString) => {
      if (!dateString) return 'N/A';
      try {
          const date = new Date(dateString);
          return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      } catch (e) {
          return dateString; // Return original if formatting fails
      }
  };

  // --- NEW: Function to close the popup ---
  const handleClosePopup = () => {
    setShowTopUpPopup(false);
  };

  // --- NEW: Placeholder for purchase action (closes popup for now) ---
  const handlePurchaseClick = () => {
    // TODO: Implement actual purchase logic (e.g., redirect to checkout)
    console.log("Purchase button clicked - initiating purchase flow...");
    handleClosePopup(); // Close the popup after clicking purchase
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
       {/* Header */}
      <header className="sticky top-0 z-30 w-full bg-white/80 backdrop-blur-sm shadow-sm py-3 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/socio.png"
              alt="Socio Logo"
              width={120} // Adjusted size slightly
              height={33}
              priority
            />
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-4 md:space-x-6">
             <Link href="/" className="text-sm font-medium text-gray-600 hover:text-accent transition-colors">Home</Link>
             <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-accent transition-colors">Pricing</Link>
             <Link href="/support" className="text-sm font-medium text-gray-600 hover:text-accent transition-colors">Support</Link>

             {/* Auth Link/Button */}
             <div className="border-l border-gray-200 pl-4 md:pl-6">
              {loadingProfile ? (
  <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div> // Loading state
) : userProfile ? (
  <button
    onClick={handleLogout}
    disabled={isLoading}
    className="flex items-center text-sm font-medium text-gray-600 hover:text-accent transition-colors disabled:opacity-50"
  >
    <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-1" />
    Logout
  </button>
) : (
  <button
    onClick={() => setShowRedeemDialog(true)}
    className="flex items-center text-sm font-medium text-white bg-accent hover:bg-accent-dark px-4 py-2 rounded shadow transition-colors"
  >
    <BoltIcon className="w-5 h-5 mr-1" />
    Redeem Key
  </button>
)}
             </div>
          </nav>
        </div>
      </header>
<RedeemKeyDialog open={showRedeemDialog} onClose={() => setShowRedeemDialog(false)} userProfile={userProfile} setUserProfile={setUserProfile} />

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {/* Main Heading */}
        <div className="text-center mb-10 md:mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }} // Start hidden and slightly down
            animate={{ opacity: 1, y: 0 }} // Animate to visible and original position
            transition={{ duration: 0.6, ease: "easeOut" }} // Animation duration and easing
            className="text-4xl md:text-5xl font-extrabold text-accent mb-2"
          >
             🎨 Snap, Caption, Share!
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }} // Add a small delay
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
             Generate captivating social media captions from your text ideas or photos in seconds.
          </motion.p>
        </div>

        {/* --- Wrapper Div for Side-by-Side Layout --- */}
        <div className="w-full flex flex-col lg:flex-row gap-8 justify-center items-start">

          {/* Input Section (Card 1) */}
          {/* Adjusted width and removed bottom margin */}
          <div className="w-full lg:w-1/2 max-w-lg bg-white p-6 md:p-8 rounded-lg shadow-md space-y-5"> 
            {/* Mode Toggle */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium ${inputMode === 'text' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}
              >
                💡 Idea to Caption
              </button>
              <button 
                onClick={() => setInputMode('image')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium ${inputMode === 'image' ? 'border-b-2 border-accent text-accent' : 'text-gray-500 hover:text-gray-700'}`}
              >
                 📸 Photo to Caption
              </button>
            </div>

            {/* Conditional Inputs */} 
            {inputMode === 'text' ? (
              // Text Input Fields 
              <div className="space-y-4 pt-4">
          <div>
            <label htmlFor="topic" className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <ChatBubbleLeftRightIcon className="w-4 h-4 mr-1.5 text-gray-400" />
              Text Topic / Description
            </label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., A beautiful sunset over the mountains..."
                    className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent transition duration-150 ease-in-out text-gray-900"
              required
            />
          </div>
              </div>
            ) : (
               // Image Input Field & Category Picker & Optional Inputs
              <div className="space-y-4 pt-4">
                 <div>
                   <label htmlFor="image-upload" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                     <PhotoIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                     Upload Image
                   </label>
                   <input
                     type="file"
                     id="image-upload"
                     accept="image/png, image/jpeg, image/webp" // Specify accepted types
                     onChange={handleImageChange}
                     className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                   />
                 </div>
                 {/* Image Preview */}
                 {imagePreview && (
                    <div className="mt-4 border rounded-md overflow-hidden bg-gray-100 flex justify-center items-center min-h-[200px]"> {/* Added styling */}
                       <Image 
                         src={imagePreview}
                         alt="Image preview"
                         width={400} 
                         height={300} 
                         style={{ objectFit: 'contain', width: '100%', height: 'auto', maxHeight: '300px' }} 
                       />
                    </div>
                 )}
                 {/* Add loading indicator during resize */} 
                 {isLoading && inputMode === 'image' && !imagePreview && (
                    <div className="flex justify-center items-center h-20 text-gray-500">
                       Processing image...
                    </div>
                 )}

                 {/* --- Category Picker --- */}
                 {resizedImageData && ( // Show only after image is processed
                   <div className="pt-4 border-t border-gray-100">
                     <p className="flex items-center text-sm font-medium text-gray-700 mb-2 text-center">
                        <TagIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                        What's the vibe of your photo?
                     </p>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {categories.map((cat) => (
                         <button
                           key={cat.name}
                           onClick={() => setImageCategory(cat.name)}
                           className={`flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 
                             ${imageCategory === cat.name 
                               ? 'border-accent bg-accent text-white shadow-sm' 
                               : 'border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400'}`}
                         >
                           <span>{cat.emoji}</span>
                           <span>{cat.name}</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 )}
                 {/* --- End Category Picker --- */}

                 {/* --- Optional Inputs Section --- */}
                 {resizedImageData && imageCategory && ( 
                   <div className="pt-4 border-t border-gray-100 space-y-4">
                      {/* --- Subject Name Input (Optional) --- */}
                      <div>
                         <label htmlFor="subjectName" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                            <UserCircleIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                           Name (Optional)
                         </label>
                         <p className="text-xs text-gray-500 mb-2">Person, Pet, Product, Company?</p>
                        <input
                          type="text"
                          id="subjectName"
                          value={subjectName}
                          onChange={(e) => setSubjectName(e.target.value)}
                          placeholder="e.g., Luna the Dog, Acme Corp, Birthday Cake..."
                          className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent transition duration-150 ease-in-out text-gray-900"
                        />
                      </div>
                      {/* --- End Subject Name Input --- */}

                      {/* --- Keyword Input (Optional) --- */}
                      <div>
                         <label htmlFor="keywords" className="flex items-center text-sm font-medium text-gray-700 mb-1">
                           <TagIcon className="w-4 h-4 mr-1.5 text-gray-400" />
                           Add Keywords? (Optional)
                         </label>
                         <p className="text-xs text-gray-500 mb-2">e.g., #BirthdayFun, Teamwork, Gourmet</p>
                        <input
                          type="text"
                          id="keywords"
                          value={userKeywords}
                          onChange={(e) => setUserKeywords(e.target.value)}
                          placeholder="Type keywords here... 🎨"
                          className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent transition duration-150 ease-in-out text-gray-900"
                        />
                      </div>
                      {/* --- End Keyword Input --- */}
                   </div>
                 )}
                 {/* --- End Optional Inputs Section --- */}
              </div>
            )}

            {/* Common Fields: Platform & Tone */} 
            <div className="space-y-4 border-t border-gray-200 pt-4">
          {/* Platform Selection */}
          <div>
            <label htmlFor="platform" className="block text-sm font-medium text-gray-700 mb-1">
              Platform
            </label>
            <select
              id="platform"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
                   className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent transition duration-150 ease-in-out bg-white text-gray-900"
            >
              <option>Instagram</option>
              <option>Twitter</option>
              <option>Facebook</option>
              <option>LinkedIn</option>
              <option>TikTok</option>
            </select>
          </div>

          {/* Tone Selection */}
          <div>
            <label htmlFor="tone" className="block text-sm font-medium text-gray-700 mb-1">
              Tone
            </label>
            <select
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
                   className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent transition duration-150 ease-in-out bg-white text-gray-900"
            >
              <option>Casual</option>
              <option>Professional</option>
              <option>Energetic</option>
              <option>Witty</option>
              <option>Formal</option>
              <option>Friendly</option>
              <option>Humorous</option>
            </select>
               </div>
          </div>

            {/* Kenyanize Toggle */}
<div className="flex items-center space-x-2 mb-2">
  <input
    id="kenyanize-toggle"
    type="checkbox"
    checked={kenyanize}
    onChange={e => setKenyanize(e.target.checked)}
    className="accent-accent h-4 w-4 rounded border-gray-300 focus:ring-accent"
  />
  <label htmlFor="kenyanize-toggle" className="text-sm font-medium text-gray-700 select-none cursor-pointer">
    Kenyanize (use Kenyan slang & local style)
  </label>
</div>
{/* Generate Button - Gradient Background */}
          <button
            onClick={handleGenerateCaption} 
              disabled={isLoading || (inputMode === 'text' && !topic.trim()) || (inputMode === 'image' && (!resizedImageData || !imageCategory))}
              className="w-full bg-accent hover:bg-accent-dark text-white font-bold py-3 px-4 rounded-full transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
          >
            {isLoading ? (
               <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>Generating...</span> </> 
            ) : (
               <> <SparklesIcon className="w-5 h-5" /> <span>Generate Caption</span> </> 
            )}
          </button>
        </div>

          {/* Output Section (Card 2) */}
          {/* Adjusted width and removed fixed min-height */}
          <div className="w-full lg:w-1/2 max-w-lg bg-white p-6 rounded-lg shadow-md">
          <h3 className="flex items-center text-lg font-semibold mb-3 text-gray-800">
             <ClipboardDocumentIcon className="w-5 h-5 mr-2 text-gray-500" />
             Generated Caption:
          </h3>
          {isLoading && (
            <div className="flex justify-center items-center h-20">
                   <svg className="animate-spin h-6 w-6 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
          )} 
          {error && (
             <div className="text-red-600 bg-red-50 p-3 rounded-md border border-red-200 text-center">
                 <p className="mb-3"><span className="font-medium">Error:</span> {error.message}</p>
                 {/* Conditionally show Upgrade button for limit errors */} 
                 {error.isLimitError && (
                     <Link 
                         href="/pricing"
                         className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-150"
                     >
                       Upgrade Plan
                     </Link>
                 )}
                 {/* --- NEW: Show Signup button for trial limit errors --- */}
                 {error.isSignupPrompt && (
                     <Link 
                         href="/redeem"
                         className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent hover:bg-accent-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors duration-150"
                     >
                       Redeem Key
                     </Link>
                 )}
                 {/* --- END NEW --- */}
            </div>
          )}
          {generatedCaption && !isLoading && !error && (
              <p className="text-gray-700 whitespace-pre-wrap text-base break-words">{generatedCaption}</p> /* Added break-words */
          )}
          {!isLoading && !error && !generatedCaption && (
            <p className="text-gray-400 italic">Your AI-generated caption will appear here once generated.</p>
          )}
        </div>
          {/* --- End Output Section --- */}

        </div>
        {/* --- End Wrapper Div --- */}

        {/* --- NEW: Usage Info Display --- */}
        {/* --- USER USAGE DASHBOARD --- */}
{userProfile && !loadingProfile && (
  <section className="w-full max-w-3xl mx-auto mb-10 p-6 bg-gradient-to-br from-amber-50 via-white to-accent/10 rounded-2xl shadow-lg border border-accent/10">
    <h3 className="text-xl md:text-2xl font-bold text-accent mb-6 flex items-center justify-center gap-2">
      <SparklesIcon className="w-6 h-6 text-accent" /> Your Usage This Month
    </h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      {/* Text Generations */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <ChatBubbleOvalLeftEllipsisIcon className="w-6 h-6 text-accent" />
          <span className="text-md font-medium text-gray-700">Text Generations</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-1 overflow-hidden">
          <div
            className="bg-accent h-4 rounded-full transition-all duration-500"
            style={{ width: `${
              userProfile.limits.text === Infinity
                ? 100
                : Math.min(100, Math.round(((userProfile.monthly_text_generations_used ?? 0) / userProfile.limits.text) * 100))
            }%` }}
          ></div>
        </div>
        <span className="text-gray-600 text-sm">
          <span className="font-semibold text-accent text-lg">{userProfile.monthly_text_generations_used ?? 0}</span>
          {" / "}
          {userProfile.limits.text === Infinity ? <span className="text-green-700 font-semibold">Unlimited</span> : userProfile.limits.text}
        </span>
      </div>
      {/* Image Generations */}
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-2 mb-2">
          <PhotoIcon className="w-6 h-6 text-accent" />
          <span className="text-md font-medium text-gray-700">Image Generations</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-1 overflow-hidden">
          <div
            className="bg-amber-400 h-4 rounded-full transition-all duration-500"
            style={{ width: `${
              userProfile.limits.image === Infinity
                ? 100
                : Math.min(100, Math.round(((userProfile.monthly_image_generations_used ?? 0) / userProfile.limits.image) * 100))
            }%` }}
          ></div>
        </div>
        <span className="text-gray-600 text-sm">
          <span className="font-semibold text-amber-600 text-lg">{userProfile.monthly_image_generations_used ?? 0}</span>
          {" / "}
          {userProfile.limits.image === Infinity ? <span className="text-green-700 font-semibold">Unlimited</span> : userProfile.limits.image}
        </span>
      </div>
    </div>
    <div className="mt-6 flex flex-col items-center gap-2">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <CalendarDaysIcon className="w-5 h-5 text-accent" />
        Usage resets on
        <span className="font-semibold text-gray-800">{formatDate(userProfile.usage_reset_date)}</span>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center mt-1 px-4 py-2 text-sm font-medium rounded-md bg-accent text-white hover:bg-accent-dark transition-colors shadow"
      >
        <ArrowUpCircleIcon className="w-5 h-5 mr-1" /> Upgrade Plan
      </Link>
    </div>
  </section>
)}
{/* --- END USER USAGE DASHBOARD --- */}

      </main>

      {/* --- Signup Prompt Modal --- */}
{showSignupPrompt && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 relative animate-fade-in flex flex-col items-center">
      <button
        className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-2xl font-bold focus:outline-none"
        onClick={() => setShowSignupPrompt(false)}
        aria-label="Close dialog"
      >
        ×
      </button>
      <h2 className="text-2xl font-extrabold text-accent mb-2 text-center flex items-center gap-2">
        <SparklesIcon className="w-6 h-6 text-accent" /> Sign Up for More Generations
      </h2>
      <p className="text-gray-700 text-center mb-4">
        You have used your <span className="font-semibold text-accent">5 free text</span> and <span className="font-semibold text-amber-600">5 free image</span> generations.<br/>
        <span className="block mt-2">Sign up to unlock <span className="font-semibold text-accent">20 text</span> and <span className="font-semibold text-amber-600">15 image</span> generations!</span>
      </p>
      <a
        href="https://qybrrlabs.africa/login"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full text-center bg-accent hover:bg-accent-dark text-white font-bold py-3 px-4 rounded-full transition-colors duration-150 mb-2 shadow-lg text-lg"
      >
        Sign Up Now
      </a>
      <button
        onClick={() => setShowSignupPrompt(false)}
        className="w-full mt-2 text-sm text-gray-500 hover:text-accent underline"
      >
        Maybe later
      </button>
    </div>
  </div>
)}
{/* --- End Signup Prompt Modal --- */}

      {/* --- NEW: User Usage Dashboard (v2) --- */}
      {userProfile && (
        <section id="usage-dashboard" className="py-12 bg-white border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                Your Usage Dashboard
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                Track your monthly credits and see when they reset.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Text Generations Card */}
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <ChatBubbleOvalLeftEllipsisIcon className="w-8 h-8 text-accent mr-4" />
                  <h3 className="text-xl font-bold text-gray-800">Text Generations</h3>
                </div>
                <p className="text-gray-600 text-sm mb-2">
                  {`${userProfile.monthly_text_generations_used} / ${PLAN_LIMITS[userProfile.plan_id]?.text ?? SIGNUP_LIMITS.text}`}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-accent h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((userProfile.monthly_text_generations_used ?? 0) / (PLAN_LIMITS[userProfile.plan_id]?.text ?? SIGNUP_LIMITS.text)) * 100)}%` }}
                  ></div>
                </div>
              </div>

              {/* Image Generations Card */}
              <div className="bg-gray-50 rounded-xl p-6 shadow-sm">
                <div className="flex items-center mb-4">
                  <PhotoIcon className="w-8 h-8 text-accent-orange mr-4" />
                  <h3 className="text-xl font-bold text-gray-800">Image Generations</h3>
                </div>
                <p className="text-gray-600 text-sm mb-2">
                   {`${userProfile.monthly_image_generations_used} / ${PLAN_LIMITS[userProfile.plan_id]?.image ?? SIGNUP_LIMITS.image}`}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-accent-orange h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, ((userProfile.monthly_image_generations_used ?? 0) / (PLAN_LIMITS[userProfile.plan_id]?.image ?? SIGNUP_LIMITS.image)) * 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            <div className="text-center mt-8 text-sm text-gray-500">
                <p className="flex items-center justify-center">
                    <CalendarDaysIcon className="w-4 h-4 mr-2" />
                    Your credits reset on {formatDate(userProfile.usage_reset_date)}
                </p>
                <p className="mt-2">
                    Need more credits? 
                    <Link href="#pricing" className="font-medium text-accent hover:underline ml-1">
                        Upgrade your plan
                    </Link>
                </p>
            </div>
          </div>
        </section>
      )}

{/* --- Simple Pricing Overview Section --- */}
      <section className="bg-white py-16 px-4 md:px-8">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-gray-800 mb-3">Find the Perfect Plan</h2>
          <p className="text-gray-600 mb-10">
            Choose the plan that best fits your needs. More details on our <Link href="/pricing" className="text-accent hover:underline">pricing page</Link>.
          </p>

          {/* Pricing Grid - Animate */}
          {(() => {
            // Define animation variants locally
            const listVariants = {
              visible: { opacity: 1, transition: { when: "beforeChildren", staggerChildren: 0.15, ease: "easeOut", duration: 0.5 } },
              hidden: { opacity: 0, transition: { when: "afterChildren" } }
            };
            const itemVariants = {
              visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
              hidden: { opacity: 0, y: 30 }
            };

            return (
              <motion.div 
                className="grid grid-cols-1 md:grid-cols-3 gap-8"
                variants={listVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }} // Trigger once when 20% visible
              >
                {/* Free Plan Card */}
                <motion.div 
                  className="border border-gray-200 rounded-lg p-6 flex flex-col items-center transition-all duration-200 hover:scale-[1.03] hover:shadow-lg" // Added transition/hover
                  variants={itemVariants}
                >
                  <h3 className="text-xl font-semibold mb-2 text-gray-700">Free</h3>
                  <p className="text-3xl font-bold text-accent mb-4">$0<span className="text-sm font-normal text-gray-500">/month</span></p>
                  <ul className="text-gray-600 text-sm space-y-2 mb-6 text-left">
                    <li className="flex items-center"><CheckIcon /> {PLAN_LIMITS.free.text} Text Generations</li>
                    <li className="flex items-center"><CheckIcon /> {PLAN_LIMITS.free.image} Image Generations</li>
                    <li className="flex items-center"><CheckIcon /> Basic Support</li>
                  </ul>
                  <Link href="/redeem" className="mt-auto w-full text-center bg-accent hover:bg-accent-dark text-white font-medium py-2 px-4 rounded-md transition-colors duration-150">
  Redeem Key
</Link>
                </motion.div>

                {/* Pro Plan Card (Example) */}
                <motion.div 
                  className="border border-accent rounded-lg p-6 flex flex-col items-center shadow-lg relative transition-all duration-200 hover:scale-[1.03] hover:shadow-xl" // Added transition/hover
                  variants={itemVariants}
                >
                  <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">Popular</span>
                  <h3 className="text-xl font-semibold mb-2 text-gray-700">Pro</h3>
                  <p className="text-3xl font-bold text-accent mb-4">$29<span className="text-sm font-normal text-gray-500">/month</span></p> {/* Placeholder Price */}
                  <ul className="text-gray-600 text-sm space-y-2 mb-6 text-left">
                    <li className="flex items-center"><CheckIcon /> Unlimited Text Generations</li>
                    <li className="flex items-center"><CheckIcon /> {PLAN_LIMITS.pro.image} Image Generations</li>
                    <li className="flex items-center"><CheckIcon /> Dedicated Support</li>
                    <li className="flex items-center"><CheckIcon /> Early Access Features</li>
                  </ul>
                  <Link href="/pricing" className="mt-auto w-full text-center bg-accent hover:bg-accent-dark text-white font-bold py-2 px-4 rounded-md transition-colors duration-150">
                    Choose Pro
                  </Link>
                </motion.div>
              </motion.div>
            );
          })()}
        </div>
      </section>
      {/* --- End Simple Pricing Overview Section --- */}

      {/* --- Newsletter Section --- */}
      <section className="bg-gray-100 py-12 px-4 md:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-semibold text-gray-800 mb-3">Stay Updated!</h2>
          <p className="text-gray-600 mb-6">
            Subscribe to our newsletter for the latest features, tips, and updates.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 justify-center">
            <input
              type="email"
              placeholder="Enter your email"
              value={newsletterEmail} 
              onChange={(e) => setNewsletterEmail(e.target.value)} 
              required
              disabled={isSubscribing} // Disable input while subscribing
              className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent focus:border-transparent transition duration-150 ease-in-out text-gray-900 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSubscribing || !newsletterEmail} // Disable button while subscribing or if email is empty
              className="bg-accent hover:bg-accent-dark text-white font-bold py-3 px-6 rounded-md transition-colors duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {isSubscribing ? (
                <>
                   <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                   Subscribing...
                 </>
              ) : (
                 'Subscribe'
              )}
            </button>
          </form>
          {/* Display Success/Error Messages */}
          {newsletterMessage.text && (
            <p className={`mt-4 text-sm ${newsletterMessage.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {newsletterMessage.text}
            </p>
          )}
        </div>
      </section>
      {/* --- End Newsletter Section --- */}

      {/* Footer */}
      <footer className="bg-white text-gray-600 py-6 px-4 md:px-8 mt-auto border-t border-gray-200">
         <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            {/* Logo and Copyright */}
            <div className="flex items-center space-x-3">
                <Image
                  src="/socio.png"
                  alt="Socio Logo"
                  width={100} // Smaller logo for footer
                  height={28}
                />
                <span className="text-xs">&copy; {new Date().getFullYear()} Socio. Designed By QybrrLabs</span>
             </div>

             {/* Social Links */}
            <div className="flex items-center space-x-5">
               {/* Updated Logo Here */}
               <Image 
                 src="/qybrr.png"
                 alt="Logo"
                 width={80}
                 height={20}
               />
               <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-accent transition-colors">
                  <FacebookIcon />
               </a>
               <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-accent transition-colors">
                  <TwitterIcon />
               </a>
               <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-accent transition-colors">
                  <InstagramIcon />
               </a>
               <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-accent transition-colors">
                  <LinkedinIcon />
               </a>
            </div>
        </div>
      </footer>

      {/* --- NEW: Credit Top-Up Popup --- */}
      {showTopUpPopup && (
        <CreditTopUpPopup 
          onClose={handleClosePopup} 
          onPurchase={handlePurchaseClick} 
        />
      )}

    </div>
  );
} 