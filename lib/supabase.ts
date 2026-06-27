import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type WhisperRow = {
  id: string;
  user_id: string;
  thought: string;
  whisper: string;
  palette: string[];
  form: string;
  energy: number;
  pos: number[] | null;
  public: boolean;
  created_at: string;
};
