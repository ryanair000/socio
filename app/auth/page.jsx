'use client'

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';

// --- Icon Placeholders ---
const GoogleIcon = () => <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.386-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.85l3.251-3.108C18.237 1.51 15.478 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 11.809-4.617 11.809-11.996 0-.803-.074-1.592-.205-2.364H12.24z" fill="#4285F4"/><path d="m24.11 11.188-.105-.78h-11.76v4.36h6.805c-.275 1.766-2.057 5.18-6.805 5.18-4.096 0-7.44-3.386-7.44-7.574S8.145 4.667 7.44 4.667c2.33 0 3.892.99 4.785 1.85l3.25-3.108C18.238 1.51 15.48 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 11.81-4.616 11.81-11.995 0-.803-.074-1.593-.205-2.365z" fill="#34A853"/><path d="M12.24 4.667c2.33 0 3.892.99 4.785 1.85l3.25-3.108C18.238 1.51 15.48 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 11.81-4.616 11.81-11.995 0-.803-.074-1.593-.205-2.365H12.24V4.667z" fill="#FBBC05"/><path d="M24.11 11.188c-.13.77-.205 1.56-.205 2.365 0 7.38-5.05 11.995-11.81 11.995s-12.24-5.48-12.24-12.24 5.48-12.24 12.24-12.24c3.24 0 6.008 1.51 8.005 3.732L16.985 6.517c-.893-.86-2.455-1.85-4.745-1.85-4.096 0-7.44 3.386-7.44 7.574s3.344 7.574 7.44 7.574c4.75 0 6.53-3.41 6.805-5.18h-6.805v-4.36h11.865l.105.78z" fill="#EA4335"/></svg>;
const FacebookIcon = () => <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="#1877F2" xmlns="http://www.w3.org/2000/svg"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.099 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.688.235 2.688.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.099 24 12.073Z"/></svg>;
const GithubIcon = () => <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" clipRule="evenodd" d="M12 0C5.373 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.565 21.795 24 17.3 24 12c0-6.627-5.373-12-12-12Z"/></svg>;
const ArrowLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>; 
const ArrowRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" /></svg>;

// Placeholder component for the image grid
const ImageGridPlaceholder = () => {
    // Generates a 4x4 grid of placeholders
    return (
        <div className="grid grid-cols-4 gap-4 p-4">
            {Array.from({ length: 16 }).map((_, index) => (
                <div 
                    key={index} 
                    className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg shadow-inner opacity-70 transform -rotate-6 hover:rotate-0 transition-transform duration-300 ease-in-out"
                >
                   {/* Simple visual element */}
                   <div className="w-1/3 h-1/3 m-auto bg-gray-400 rounded-full opacity-50"></div> 
                </div>
            ))}
        </div>
    );
};

export default function AuthPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true); // Toggle between Login and Sign Up
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleOAuthSignIn = async (provider) => {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`, // Callback URL after successful OAuth
        },
      });
      if (oauthError) throw oauthError;
      // Redirect happens automatically via Supabase
    } catch (oauthError) {
      console.error(`OAuth Sign In Error (${provider}):`, oauthError);
      setError(`Failed to sign in with ${provider}. ${oauthError.message || 'Please try again.'}`);
      setLoading(false); // Only set loading false on error, success leads to redirect
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });
      if (signInError) throw signInError;
      router.push('/'); // Redirect to home page on successful login
    } catch (signInError) {
      console.error('Sign In Error:', signInError);
      setError(signInError.message || 'Invalid login credentials. Please try again.');
      setLoading(false);
    }
  };
  
  const handleEmailSignUp = async (e) => {
     e.preventDefault();
     setLoading(true);
     setError(null);
     try {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            // Optional: Redirect after email confirmation if enabled in Supabase settings
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (signUpError) throw signUpError;
        // Optionally, show a message asking the user to check their email for confirmation
        alert('Sign up successful! Please check your email to confirm your account.');
        setIsLogin(true); // Switch back to login view after successful signup prompt
     } catch (signUpError) {
       console.error('Sign Up Error:', signUpError);
       setError(signUpError.message || 'Failed to sign up. Please try again.');
     } finally {
       setLoading(false);
     }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Main Content */} 
      <div className="flex-grow flex items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl flex flex-col md:flex-row bg-white rounded-xl shadow-2xl overflow-hidden">
          
          {/* Left Column: Form */}
          <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center">
            <h1 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
              {isLogin ? 'Log in to your account' : 'Create your account'}
            </h1>

            {/* Error Display */}
            {error && (
               <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                  {error}
               </div>
            )}

            {/* OAuth Buttons */}
            <div className="space-y-3 mb-6">
              <button disabled={loading} onClick={() => handleOAuthSignIn('google')} className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-150 disabled:opacity-60">
                <GoogleIcon /> Sign in with Google
              </button>
              <button disabled={loading} onClick={() => handleOAuthSignIn('github')} className="w-full flex items-center justify-center py-2.5 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition duration-150 disabled:opacity-60">
                <GithubIcon /> Sign in with GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={isLogin ? handleEmailSignIn : handleEmailSignUp} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={loading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition duration-150 ease-in-out text-gray-900 disabled:opacity-60"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  {isLogin && (
                    <div className="text-sm">
                      <a href="#" className="font-medium text-gray-600 hover:text-gray-900">
                        Forgot password?
                      </a>
                    </div>
                  )}
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  disabled={loading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-1 focus:ring-gray-500 focus:border-gray-500 transition duration-150 ease-in-out text-gray-900 disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-semibold text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 transition duration-150 disabled:opacity-60"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                   isLogin ? 'Sign in' : 'Sign up'
                )}
              </button>
            </form>
            
            {/* Toggle Link */}
            <p className="mt-8 text-center text-sm text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
              <button disabled={loading} onClick={() => setIsLogin(!isLogin)} className="font-medium text-gray-900 hover:text-gray-700 underline disabled:opacity-60">
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>

          {/* Right Column: Image Grid / Promo */}
          <div className="w-full md:w-1/2 bg-gradient-to-br from-green-100 to-cyan-100 p-8 md:p-12 flex flex-col justify-center items-center relative overflow-hidden">
             {/* Background subtle pattern or texture could go here */}
             
             {/* Image Grid Placeholder - positioned absolutely or relatively */}
             <div className="mb-8 scale-90 transform perspective-1000 rotate-y-1">
                 <ImageGridPlaceholder />
             </div>

            {/* Latest Updates Box */}
            <div className="bg-white/70 backdrop-blur-md rounded-lg p-6 shadow-lg text-center w-full max-w-sm">
              <span className="inline-block bg-gray-200 text-gray-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
                LATEST UPDATES
              </span>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                Explore our expansive library of community generated AI sound effects
              </h3>
              <div className="flex justify-center space-x-3">
                <button className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
                  <ArrowLeftIcon />
                </button>
                <button className="p-2 rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 transition">
                  <ArrowRightIcon />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
           {/* Left: Logo (Use CaptionMagic green) */}
           <div className="flex items-center">
            {/* Using simple square placeholders for the || logo like ElevenLabs */}
             <div className="flex space-x-1 mr-2">
               <div className="w-1.5 h-5 bg-tripadvisor-green"></div>
               <div className="w-1.5 h-5 bg-tripadvisor-green"></div>
             </div>
            <span className="font-semibold text-lg">CaptionMagic</span>
           </div>
           {/* Right: Curated By */}
           <div className="flex items-center">
             <span className="text-sm mr-2">curated by</span>
             {/* Replace with Mobbin Logo if available */}
             <span className="font-semibold text-lg">Mobbin</span> 
           </div>
        </div>
      </footer>
    </div>
  );
} 