'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
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
} from '@heroicons/react/24/outline'
import { useRouter } from 'next/navigation'

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
  free: { text: 10, image: 5 },
  basic: { text: 100, image: 50 },
  pro: { text: Infinity, image: 200 },
  business: { text: Infinity, image: 500 },
};

export default function Home() {
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

    let requestBody = {};

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
             <Link href="/" className="text-sm font-medium text-gray-600 hover:text-accent-magenta transition-colors">Home</Link>
             <Link href="/pricing" className="text-sm font-medium text-gray-600 hover:text-accent-magenta transition-colors">Pricing</Link>
             <Link href="/support" className="text-sm font-medium text-gray-600 hover:text-accent-magenta transition-colors">Support</Link>

             {/* Auth Link/Button */}
             <div className="border-l border-gray-200 pl-4 md:pl-6">
              {loadingProfile ? (
                 <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div> // Loading state
              ) : userProfile ? (
                <button
                  onClick={handleLogout}
                  disabled={isLoading}
                  className="flex items-center text-sm font-medium text-gray-600 hover:text-accent-magenta transition-colors disabled:opacity-50"
                 >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5 mr-1" />
                  Logout
                 </button>
              ) : (
                 <Link href="/auth" className="flex items-center text-sm font-medium text-gray-600 hover:text-accent-magenta transition-colors">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 mr-1" />
                    Login / Sign Up
                 </Link>
              )}
             </div>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8 md:py-12">
        {/* Main Heading */}
        <div className="text-center mb-10 md:mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold text-accent-magenta mb-2">
             🎨 Snap, Caption, Share!
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
             Generate captivating social media captions from your text ideas or photos in seconds.
          </p>
        </div>
        
        {/* --- NEW: Usage Info Display --- */}
        {userProfile && !loadingProfile && (
             <div className="w-full max-w-4xl mb-8 p-4 bg-white rounded-lg shadow-md border border-gray-200">
                 <div className="flex flex-col sm:flex-row justify-between items-center gap-4 flex-wrap">
                     <div className="text-center sm:text-left">
                        <p className="flex items-center justify-center sm:justify-start text-sm text-gray-500">
                           <IdentificationIcon className="w-4 h-4 mr-1.5 text-gray-400" /> Current Plan
                        </p>
                         <p className="text-lg font-semibold text-accent-magenta capitalize">{userProfile.plan || 'Free'}</p>
                    </div>
                     <div className="text-center sm:text-left">
                        <p className="flex items-center justify-center sm:justify-start text-sm text-gray-500">
                           <ChatBubbleOvalLeftEllipsisIcon className="w-4 h-4 mr-1.5 text-gray-400" /> Text Generations Used
                        </p>
                         <p className="text-lg font-medium text-gray-800">
                           {userProfile.monthly_text_generations_used ?? 0} / {userProfile.limits.text === Infinity ? 'Unlimited' : userProfile.limits.text}
                         </p>
                    </div>
                     <div className="text-center sm:text-left">
                         <p className="flex items-center justify-center sm:justify-start text-sm text-gray-500">
                           <PhotoIcon className="w-4 h-4 mr-1.5 text-gray-400" /> Image Generations Used
                        </p>
                         <p className="text-lg font-medium text-gray-800">
                             {userProfile.monthly_image_generations_used ?? 0} / {userProfile.limits.image === Infinity ? 'Unlimited' : userProfile.limits.image}
                         </p>
                    </div>
                    <div className="text-center sm:text-left">
                         <p className="flex items-center justify-center sm:justify-start text-sm text-gray-500">
                            <CalendarDaysIcon className="w-4 h-4 mr-1.5 text-gray-400" /> Usage Resets On
                         </p>
                         <p className="text-lg font-medium text-gray-800">{formatDate(userProfile.usage_reset_date)}</p>
                    </div>
                    <div>
                       <Link href="/pricing" className="flex items-center text-sm font-medium text-accent-magenta hover:underline whitespace-nowrap">
                           <ArrowUpCircleIcon className="w-4 h-4 mr-1" /> Change Plan
                       </Link>
                    </div>
                 </div>
             </div>
        )}
        {/* --- END NEW: Usage Info Display --- */}

        {/* --- Wrapper Div for Side-by-Side Layout --- */}
        <div className="w-full flex flex-col lg:flex-row gap-8 justify-center items-start">

          {/* Input Section (Card 1) */}
          {/* Adjusted width and removed bottom margin */}
          <div className="w-full lg:w-1/2 max-w-lg bg-white p-6 md:p-8 rounded-lg shadow-md space-y-5"> 
            {/* Mode Toggle */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium ${inputMode === 'text' ? 'border-b-2 border-accent-magenta text-accent-magenta' : 'text-gray-500 hover:text-gray-700'}`}
              >
                💡 Idea to Caption
              </button>
              <button 
                onClick={() => setInputMode('image')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium ${inputMode === 'image' ? 'border-b-2 border-accent-magenta text-accent-magenta' : 'text-gray-500 hover:text-gray-700'}`}
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
                    className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-magenta focus:border-transparent transition duration-150 ease-in-out text-gray-900"
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
                               ? 'border-accent-magenta bg-accent-magenta text-white shadow-sm' 
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
                          className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-magenta focus:border-transparent transition duration-150 ease-in-out text-gray-900"
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
                          className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-magenta focus:border-transparent transition duration-150 ease-in-out text-gray-900"
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
                   className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-magenta focus:border-transparent transition duration-150 ease-in-out bg-white text-gray-900"
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
                   className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-magenta focus:border-transparent transition duration-150 ease-in-out bg-white text-gray-900"
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

            {/* Generate Button - Gradient Background */}
          <button
            onClick={handleGenerateCaption} 
              disabled={isLoading || (inputMode === 'text' && !topic.trim()) || (inputMode === 'image' && (!resizedImageData || !imageCategory))}
              className="w-full bg-accent-magenta hover:bg-fuchsia-700 text-white font-bold py-3 px-4 rounded-full transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
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
                   <svg className="animate-spin h-6 w-6 text-accent-magenta" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
            </div>
          )} 
          {error && (
             <div className="text-red-600 bg-red-50 p-3 rounded-md border border-red-200 text-center">
                 <p className="mb-3"><span className="font-medium">Error:</span> {error.message}</p>
                 {/* Conditionally show Upgrade button for limit errors */} 
                 {error.isLimitError && (
                     <Link 
                         href="/pricing"
                         className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-accent-magenta hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-magenta transition-colors duration-150"
                     >
                       Upgrade Plan
                     </Link>
                 )}
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

      </main>

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
              className="flex-grow p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-accent-magenta focus:border-transparent transition duration-150 ease-in-out text-gray-900 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSubscribing || !newsletterEmail} // Disable button while subscribing or if email is empty
              className="bg-accent-magenta hover:bg-fuchsia-700 text-white font-bold py-3 px-6 rounded-md transition-colors duration-150 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed flex justify-center items-center"
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
               {/* Moved QybrrLabs Logo Here */}
               <Image 
                 src="/logo.png" 
                 alt="QybrrLabs Logo" 
                 width={80} // Adjust width as needed
                 height={20} // Keep height similar to icons (h-5)
               />
               <a href="#" aria-label="Facebook" className="text-gray-400 hover:text-accent-magenta transition-colors">
                  <FacebookIcon />
               </a>
               <a href="#" aria-label="Twitter" className="text-gray-400 hover:text-accent-magenta transition-colors">
                  <TwitterIcon />
               </a>
               <a href="#" aria-label="Instagram" className="text-gray-400 hover:text-accent-magenta transition-colors">
                  <InstagramIcon />
               </a>
               <a href="#" aria-label="LinkedIn" className="text-gray-400 hover:text-accent-magenta transition-colors">
                  <LinkedinIcon />
               </a>
            </div>
        </div>
      </footer>
    </div>
  );
} 