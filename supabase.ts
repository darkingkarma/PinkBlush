import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = 'https://vyjqdzfpilylqieizjah.supabase.co';
const supabaseKey = 'sb_publishable_-WxzeZIYom-JkiOvQWApJQ_qd8q78Q8';

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
