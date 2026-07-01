'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

// 특정 학기의 셀 목록 조회
export async function fetchCellsBySemesterAction(semester: string) {
  const { data, error } = await supabase
    .from('cells')
    .select(`
      *,
      leader:leader_id(name),
      cell_members(member_id)
    `)
    .eq('semester', semester)
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, data: [] };
  }
  
  return { success: true, data };
}

// 새 셀 생성
export async function createCellAction(formData: FormData) {
  const semester = formData.get('semester') as string;
  const name = formData.get('name') as string;
  let leader_id = formData.get('leader_id') as string | null;

  if (leader_id === 'unassigned') leader_id = null;

  const { error } = await supabase.from('cells').insert([{
    semester,
    name,
    leader_id
  }]);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/cells');
  return { success: true };
}

// 셀 삭제
export async function deleteCellAction(id: string) {
  const { error } = await supabase.from('cells').delete().eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/cells');
  return { success: true };
}

// 셀 상세 조회 및 할당된/미할당 멤버 조회
export async function fetchCellDetailsAction(cellId: string) {
  // 1. 셀 기본 정보
  const { data: cellInfo, error: cellError } = await supabase
    .from('cells')
    .select('*, leader:leader_id(*)')
    .eq('id', cellId)
    .single();

  if (cellError || !cellInfo) return { success: false };

  // 2. 현재 셀에 속한 멤버 ID 리스트
  const { data: cellMembers, error: cmError } = await supabase
    .from('cell_members')
    .select('member_id')
    .eq('cell_id', cellId);

  const assignedMemberIds = (cellMembers || []).map(cm => cm.member_id);

  // 3. 전체 멤버 리스트 (활동 중인 청년 위주)
  const { data: allMembers, error: mError } = await supabase
    .from('members')
    .select('*')
    .neq('status', 'away')
    .order('name');

  return { 
    success: true, 
    cell: cellInfo, 
    assignedMemberIds, 
    allMembers: allMembers || [] 
  };
}

// 셀 멤버 업데이트 (전체 덮어쓰기 방식)
export async function updateCellMembersAction(cellId: string, memberIds: string[]) {
  // 기존 할당 내역 삭제
  await supabase.from('cell_members').delete().eq('cell_id', cellId);

  // 새 할당 내역 삽입
  if (memberIds.length > 0) {
    const insertData = memberIds.map(id => ({ cell_id: cellId, member_id: id }));
    const { error } = await supabase.from('cell_members').insert(insertData);
    
    if (error) {
      return { success: false, error: error.message };
    }
  }

  revalidatePath('/cells');
  revalidatePath(`/cells/${cellId}`);
  return { success: true };
}
