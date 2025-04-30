'use client'

import Image from 'next/image'
import { useState } from 'react'
import Link from 'next/link'

// Placeholder icons - replace with actual SVGs or an icon library later
const GlobeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" /></svg>;
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 rounded-full"><path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>; // Simple user icon placeholder
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>;
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>;
const BuildingIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h18M3 21h18" /></svg>;
const TagIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" /></svg>;
const UtensilsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-4.5 3V6m0 0a1.5 1.5 0 0 1 3 0v3M3 7.5h15M9 15h1.5M12 15h1.5M15 15h1.5M9 18h1.5M12 18h1.5M15 18h1.5" /></svg>; // Simplified version
const PlaneIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" /></svg>;
const BuildingOfficeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M8.25 21v-4.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125V21M8.25 6.75h.75v.75h-.75V6.75Zm.75 2.25h.75v.75h-.75V9Zm.75 2.25h.75v.75h-.75v-.75Zm2.25-4.5h.75v.75h-.75V6.75Zm.75 2.25h.75v.75h-.75V9Zm.75 2.25h.75v.75h-.75v-.75Z" /></svg>;
const SparklesIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" /></svg>;

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

export default function Home() {
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

  // --- API Call Logic ---
  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    setImageFile(file); // Store original file
    setImagePreview(null); // Clear previous preview
    setResizedImageData(null); // Clear previous resized data
    setError(null); // Clear previous errors
    setImageCategory(null); // Reset category
    setUserKeywords(''); // Reset keywords
    
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
          keywords: userKeywords.trim() // Include keywords (will be empty string if none)
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
      setError(err.message || 'Failed to generate caption. Please try again.');
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

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
               <Image 
                  src="/socio.png"
                  alt="Socio Logo"
                  width={120}
                  height={33}
                  priority
               />
            </Link>
          </div>

          {/* Center: Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-600 hover:bg-gradient-to-r hover:from-lime-400 hover:via-yellow-300 hover:to-cyan-400 hover:bg-clip-text hover:text-transparent font-medium text-sm transition-all duration-150">
              Generator
            </Link>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center space-x-4 md:space-x-6">
            <Link 
              href="/pricing"
              className="text-sm font-medium text-gray-600 hover:bg-gradient-to-r hover:from-lime-400 hover:via-yellow-300 hover:to-cyan-400 hover:bg-clip-text hover:text-transparent transition-all duration-150"
            >
              Pricing
            </Link>
            <Link 
              href="/auth" 
              className="text-sm font-medium text-white bg-gradient-to-r from-lime-400 via-yellow-300 to-cyan-400 hover:from-lime-500 hover:via-yellow-400 hover:to-cyan-500 transition-all duration-150 px-4 py-2 rounded-full shadow-sm"
            >
              Login / Sign Up
            </Link>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col items-center">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-10 bg-gradient-to-r from-lime-400 via-yellow-300 to-cyan-400 bg-clip-text text-transparent text-center">
          Generate Your Next Caption
        </h1>

        {/* --- New Wrapper Div for Side-by-Side Layout --- */}
        <div className="w-full flex flex-col lg:flex-row gap-8 justify-center items-start">

          {/* Input Section (Card 1) */}
          {/* Adjusted width and removed bottom margin */}
          <div className="w-full lg:w-1/2 max-w-lg bg-white p-6 md:p-8 rounded-lg shadow-md space-y-5"> 
            {/* Mode Toggle */}
            <div className="flex border-b border-gray-200">
              <button 
                onClick={() => setInputMode('text')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium ${inputMode === 'text' ? 'border-b-2 border-lime-500 text-lime-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Describe Topic
              </button>
              <button 
                onClick={() => setInputMode('image')}
                className={`flex-1 py-2 px-4 text-center text-sm font-medium ${inputMode === 'image' ? 'border-b-2 border-lime-500 text-lime-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Upload Image
              </button>
            </div>

            {/* Conditional Inputs */} 
            {inputMode === 'text' ? (
              // Text Input Fields 
              <div className="space-y-4 pt-4">
                <div>
                  <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">
                    What is your caption about?
                  </label>
                  <input
                    type="text"
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., sunny beach day, new product, coffee vibes"
                    className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-lime-400 focus:border-transparent transition duration-150 ease-in-out text-gray-900"
                    required
                  />
                </div>
              </div>
            ) : (
               // Image Input Field & Category Picker & Keywords
              <div className="space-y-4 pt-4">
                 <div>
                   <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700 mb-1">
                     Upload Image
                   </label>
                   <input
                     type="file"
                     id="image-upload"
                     accept="image/png, image/jpeg, image/webp" // Specify accepted types
                     onChange={handleImageChange}
                     className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-lime-50 file:text-lime-700 hover:file:bg-lime-100"
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
                     <p className="block text-sm font-medium text-gray-700 mb-2 text-center">What's the vibe of your photo?</p>
                     <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                       {categories.map((cat) => (
                         <button
                           key={cat.name}
                           onClick={() => setImageCategory(cat.name)}
                           className={`flex items-center justify-center space-x-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all duration-150 
                             ${imageCategory === cat.name 
                               ? 'border-transparent bg-gradient-to-r from-lime-400 via-yellow-300 to-cyan-400 text-white shadow-sm' 
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

                 {/* --- Keyword Input (Optional) --- */}
                 {resizedImageData && imageCategory && ( // Show only after image and category selected
                   <div className="pt-4 border-t border-gray-100">
                      <label htmlFor="keywords" className="block text-sm font-medium text-gray-700 mb-1">
                        ✨ Add Optional Keywords?
                      </label>
                      <p className="text-xs text-gray-500 mb-2">e.g., #BirthdayFun, Teamwork, Gourmet</p>
                     <input
                       type="text"
                       id="keywords"
                       value={userKeywords}
                       onChange={(e) => setUserKeywords(e.target.value)}
                       placeholder="Type keywords here... 🎨"
                       className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-lime-400 focus:border-transparent transition duration-150 ease-in-out text-gray-900"
                     />
                   </div>
                 )}
                 {/* --- End Keyword Input --- */}
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
                   className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-lime-400 focus:border-transparent transition duration-150 ease-in-out bg-white text-gray-900"
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
                   className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-lime-400 focus:border-transparent transition duration-150 ease-in-out bg-white text-gray-900"
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
              className="w-full bg-gradient-to-r from-lime-400 via-yellow-300 to-cyan-400 hover:from-lime-500 hover:via-yellow-400 hover:to-cyan-500 text-white font-bold py-3 px-4 rounded-full transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
            >
              {isLoading ? (
                 <> <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> <span>Generating...</span> </> 
              ) : (
                 <> <SparklesIcon /> <span>Generate Caption</span> </> 
              )}
            </button>
          </div>

          {/* Output Section (Card 2) */}
          {/* Adjusted width and removed fixed min-height */}
          <div className="w-full lg:w-1/2 max-w-lg bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-lg font-semibold mb-3 text-gray-800">Generated Caption:</h3>
            {isLoading && (
              <div className="flex justify-center items-center h-20">
                   <svg className="animate-spin h-6 w-6 text-lime-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </div>
            )} 
            {error && (
               <div className="text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                   <p><span className="font-medium">Error:</span> {error}</p>
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

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
           {/* Left: Logo */}
           <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <svg width="30" height="30" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg" className="text-tripadvisor-green mr-2">
                <circle cx="128" cy="128" r="120" fill="#34E0A1" />
                <path d="M128 58c-38.6 0-70 31.4-70 70s31.4 70 70 70 70-31.4 70-70-31.4-70-70-70zm-35 70c0-19.3 15.7-35 35-35s35 15.7 35 35-15.7 35-35 35-35-15.7-35-35z" fill="#FFF" />
                <circle cx="108" cy="128" r="15" fill="#000A12" />
                <circle cx="148" cy="128" r="15" fill="#000A12" />
              </svg>
              <span className="font-bold text-xl">CaptionMagic</span> {/* Changed name */}
            </Link>
           </div>
           {/* Right: Curated By */}
           <div className="flex items-center">
             {/* <span className="text-sm mr-2">curated by</span> ... */}
           </div>
        </div>
      </footer>
    </div>
  );
} 