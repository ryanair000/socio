import { createClient } from '../../../lib/supabase/server';

export async function POST(req) {
  try {
    const { key } = await req.json();
    if (!key || typeof key !== 'string') {
      return new Response(JSON.stringify({ error: 'Key is required.' }), { status: 400 });
    }

    // Simulate key validation (replace with real validation logic)
    if (key !== 'VALID_DEMO_KEY') {
      return new Response(JSON.stringify({ error: 'Invalid or already redeemed key.' }), { status: 400 });
    }

    // Authenticate user
    const supabase = createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), { status: 401 });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'User profile not found.' }), { status: 404 });
    }

    // Update user credits (add 20 text, 15 image gens)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        monthly_text_generations_used: (profile.monthly_text_generations_used || 0) + 20,
        monthly_image_generations_used: (profile.monthly_image_generations_used || 0) + 15,
      })
      .eq('id', user.id);
    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update credits.' }), { status: 500 });
    }

    return new Response(
      JSON.stringify({ success: true, newText: (profile.monthly_text_generations_used || 0) + 20, newImage: (profile.monthly_image_generations_used || 0) + 15 }),
      { status: 200 }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Server error.' }), { status: 500 });
  }
}
