import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://izbexcmclhchqbzchxkz.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "sb_publishable_4iKY-X5iN8xNxpzYkBcJPw_vYeigkLd";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
