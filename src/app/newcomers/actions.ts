'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// 새가족 목록 조회
export async function fetchNewcomersAction() {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .not('newcomer_status', 'is', null)
    .order('registration_date', { ascending: false });

  if (error) {
    return { success: false, data: [] };
  }
  return { success: true, data };
}

// 새가족 주차 업데이트
export async function updateNewcomerStatusAction(id: string, status: number | null) {
  const { error } = await supabase
    .from('members')
    .update({ newcomer_status: status })
    .eq('id', id);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/newcomers');
  revalidatePath('/members');
  return { success: true };
}
