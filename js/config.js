import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://smzwucttkyuqzazozcat.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_pgFtD7Hcbxlg3_bLsHbK_g_c1w7FaFv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
