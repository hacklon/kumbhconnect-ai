import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Standard Supabase client for client-side usage
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client (for bypassing RLS or updating system status)
export const getSupabaseAdmin = () => {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    console.warn('SUPABASE_SERVICE_ROLE_KEY is missing. Using standard client instead.');
    return supabase;
  }
  return createClient(supabaseUrl, serviceRoleKey);
};
