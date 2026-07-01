'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export async function fetchMemberDetailsAction(id: string) {
  // 1. 멤버 기본 정보 (소속 셀 포함)
  const { data: member, error } = await supabase
    .from('members')
    .select('*, cell_members(cells(name, semester))')
    .eq('id', id)
    .single();

  if (error || !member) return { success: false };

  // 2. 역대 소속 셀 이력 (cell_members 기반)
  const { data: cellHistory } = await supabase
    .from('cell_members')
    .select('created_at, cells(name, semester, leader_id)')
    .eq('member_id', id)
    .order('created_at', { ascending: false });

  // 3. 최근 10주 출석 이력
  const { data: attendanceHistory } = await supabase
    .from('attendance')
    .select('date')
    .eq('member_id', id)
    .order('date', { ascending: false })
    .limit(10);

  return { 
    success: true, 
    member, 
    cellHistory: cellHistory || [],
    attendanceHistory: attendanceHistory || []
  };
}

export async function fetchPastoralNotesAction(memberId: string) {
  const session = await getSession();
  // 권한 체크: ADMIN만 볼 수 있도록 처리 (혹은 세션에 따라 다르게)
  if (session?.role !== 'ADMIN') {
    return { success: false, error: '권한이 없습니다.' };
  }

  const { data, error } = await supabase
    .from('pastoral_notes')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

export async function addPastoralNoteAction(formData: FormData) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') return { success: false, error: '권한이 없습니다.' };

  const member_id = formData.get('member_id') as string;
  const content = formData.get('content') as string;

  const { error } = await supabase.from('pastoral_notes').insert([{
    member_id,
    content,
    author_role: 'ADMIN'
  }]);

  if (error) return { success: false, error: error.message };
  
  revalidatePath(`/members/${member_id}`);
  return { success: true };
}
