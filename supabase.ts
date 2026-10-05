import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vyjqdzfpilylqieizjah.supabase.co';
const supabaseKey = 'sb_publishable_-WxzeZIYom-JkiOvQWApJQ_qd8q78Q8';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
);