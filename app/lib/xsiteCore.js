import { createClient } from "@supabase/supabase-js";

export const xsiteCore = createClient(
  "https://zydhfhfhspflvhlpmokj.supabase.co",
  "sb_publishable_DJN48TNChvPce3MZ7bDaiw_5Q8Eam6x",
  { auth:{ persistSession:true, autoRefreshToken:true, detectSessionInUrl:true } }
);
