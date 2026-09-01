import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://smzwucttkyuqzazozcat.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc1NjYzMzQwMCwiZXhwIjoyMDcxOTk3NDAwfQ.2c1QeQ5mY7VhXz4wK5h5dX9v2l4a3m6n8p0q2r4s6t8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
