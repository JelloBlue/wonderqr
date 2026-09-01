import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://smzwucttkyuqzazozcat.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtend1Y3R0a3l1cXphem96Y2F0IiwiaWF0IjoxNzg4MDMwMDAzLCJleHAiOjIxMDM2MDYwMDN9.0o9bGVPWdnEz2cYb-4VNJfSzLSk6trn-NYiXi8Z0kPQ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Load Super Admin enhancements only on the Super Admin page. This keeps the
// existing HTML unchanged while enabling Edit Business PIN controls.
if (location.pathname.endsWith('/superadmin.html')) {
  import('./superadmin-enhancements.js?v=2');
}
