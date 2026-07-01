'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// 보고서 제출
export async function submitReportAction(formData: FormData) {
  const cell_id = formData.get('cell_id') as string;
  const meeting_date = formData.get('meeting_date') as string;
  const attendees_count = parseInt(formData.get('attendees_count') as string, 10) || 0;
  const content = formData.get('content') as string;
  const prayer_requests = formData.get('prayer_requests') as string;
  let note = formData.get('note') as string;
  const attendees_list = formData.get('attendees_list') as string;

  if (attendees_list) {
    note = `[출석: ${attendees_list}]\n${note}`;
  }

  const { error } = await supabase.from('cell_reports').insert([{
    cell_id,
    meeting_date,
    attendees_count,
    content,
    prayer_requests,
    note
  }]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/reports');
  return { success: true };
}

// 모든 셀의 보고서 조회 (최신순)
export async function fetchReportsAction() {
  const { data, error } = await supabase
    .from('cell_reports')
    .select(`
      *,
      cells (
        name,
        semester,
        leader:leader_id(name)
      )
    `)
    .order('meeting_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, data: [] };
  }
  
  return { success: true, data };
}

// 비밀번호 검증 (서버에서만)
export async function verifyLeaderPasswordAction(password: string) {
  const correctPassword = process.env.LEADER_PASSWORD;
  if (!correctPassword) return false;
  return password === correctPassword;
}
