/**
 * Supabase Auth Module
 * Initializes the Supabase client and provides session management.
 * Load this module only on pages that need authentication.
 */

// Supabase project: tooladvisor (vjuezlrwhjejfdkjuuhh) — anon key is public by design
const SUPABASE_URL = 'https://vjuezlrwhjejfdkjuuhh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqdWV6bHJ3aGplamZka2p1dWhoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkzNzI4ODUsImV4cCI6MjA5NDk0ODg4NX0.lfYUyivk7e6I7IKDAayG94TdpkqxR9Ap8Sgnn1n2uHY';

let supabaseClient = null;

/**
 * Initialize the Supabase client
 * Must be called before any auth operations
 */
async function initSupabase() {
  if (supabaseClient) return supabaseClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Auth] Supabase credentials not configured');
    return null;
  }

  // Dynamically load @supabase/supabase-js from CDN
  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm';
      script.type = 'module';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Import createClient from the loaded module
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.0.0/+esm');
  supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true
    }
  });

  return supabaseClient;
}

/**
 * Get the current session
 */
async function getSession() {
  const client = await initSupabase();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    return session;
  } catch (err) {
    console.error('[Auth] Error getting session:', err);
    return null;
  }
}

/**
 * Get current user
 */
async function getUser() {
  const client = await initSupabase();
  if (!client) return null;

  try {
    const { data: { user } } = await client.auth.getUser();
    return user;
  } catch (err) {
    console.error('[Auth] Error getting user:', err);
    return null;
  }
}

/**
 * Send magic link for sign-in
 */
async function sendMagicLink(email) {
  const client = await initSupabase();
  if (!client) throw new Error('Supabase not initialized');

  const { error } = await client.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: window.location.origin + '/account.html'
    }
  });

  if (error) throw error;

  // Fire GA4 event
  if (typeof gtag !== 'undefined') {
    gtag('event', 'auth_magic_link_sent', {
      email_provider: 'supabase'
    });
  }
}

/**
 * Sign out the current user
 */
async function signOut() {
  const client = await initSupabase();
  if (!client) return;

  const { error } = await client.auth.signOut();
  if (error) throw error;
}

/**
 * Get user's subscription plan
 */
async function getUserSubscription() {
  const client = await initSupabase();
  if (!client) return null;

  try {
    const user = await getUser();
    if (!user) return null;

    const { data, error } = await client
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data || null;
  } catch (err) {
    console.error('[Auth] Error getting subscription:', err);
    return null;
  }
}

/**
 * Get access token for use in Authorization headers
 */
async function getAccessToken() {
  const session = await getSession();
  return session?.access_token || null;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
  window.TA_Auth = {
    initSupabase,
    getSession,
    getUser,
    sendMagicLink,
    signOut,
    getUserSubscription,
    getAccessToken
  };
}
