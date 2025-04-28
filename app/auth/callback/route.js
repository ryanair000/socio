import { createRouteHandlerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic'; // Ensure dynamic execution for reading searchParams

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    
    try {
      // Exchange the code for a session
      await supabase.auth.exchangeCodeForSession(code);
      // Session is set automatically in cookies by the helper
      console.log('OAuth code exchanged successfully.');
    } catch (error) {
        console.error('Error exchanging OAuth code:', error);
        // You might want to redirect to an error page or show a message
        // For now, redirecting back to auth page with an error indicator (optional)
        return NextResponse.redirect(`${requestUrl.origin}/auth?error=OAuth%20authentication%20failed`);
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin);
} 