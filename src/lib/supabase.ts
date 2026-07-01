import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase 클라이언트 인스턴스 (서버/클라이언트 공용이나 주로 클라이언트/API에서 사용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
