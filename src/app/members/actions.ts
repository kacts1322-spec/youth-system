'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function addMemberAction(formData: FormData) {
  const name = formData.get('name') as string;
  const gender = formData.get('gender') as string;
  const birth_date = formData.get('birth_date') as string;
  const phone = formData.get('phone') as string;
  const is_distant = formData.get('is_distant') === 'on';
  const is_away = formData.get('is_away') === 'on';

  const memberData = {
    name,
    gender,
    birth_date: birth_date || null,
    phone: phone || null,
    is_distant,
    is_away,
    status: is_away ? 'away' : 'active'
  };

  const { error } = await supabase.from('members').insert([memberData]);
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/members');
  return { success: true };
}

export async function uploadExcelAction(membersList: any[]) {
  // 엑셀에서 추출한 배열을 bulk insert
  const { error } = await supabase.from('members').insert(membersList);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/members');
  return { success: true };
}

export async function fetchMembersAction() {
  const { data, error } = await supabase
    .from('members')
    .select('*, cell_members(cells(name, semester))')
    .order('name', { ascending: true });
    
  if (error) {
    return { success: false, data: [] };
  }
  return { success: true, data };
}

export async function getMemberAction(id: string) {
  const { data, error } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .single();
  if (error) return { success: false, data: null };
  return { success: true, data };
}

export async function updateMemberAction(id: string, formData: FormData) {
  const name = formData.get('name') as string;
  const gender = formData.get('gender') as string;
  const birth_date = formData.get('birth_date') as string;
  const phone = formData.get('phone') as string;
  const is_distant = formData.get('is_distant') === 'on';
  const distant_location = formData.get('distant_location') as string;
  const is_away = formData.get('is_away') === 'on';
  const away_type = formData.get('away_type') as string;
  const away_start_date = formData.get('away_start_date') as string;
  const away_expected_return_date = formData.get('away_expected_return_date') as string;

  const memberData = {
    name,
    gender,
    birth_date: birth_date || null,
    phone: phone || null,
    is_distant,
    distant_location: is_distant ? distant_location : null,
    is_away,
    away_type: is_away ? away_type : null,
    away_start_date: is_away ? (away_start_date || null) : null,
    away_expected_return_date: is_away ? (away_expected_return_date || null) : null,
    status: is_away ? 'away' : 'active',
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase.from('members').update(memberData).eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  
  revalidatePath('/members');
  revalidatePath(`/members/${id}`);
  return { success: true };
}

export async function updateMemberFieldAction(id: string, field: string, value: any) {
  const { error } = await supabase.from('members').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) {
    return { success: false, error: error.message };
  }
  revalidatePath('/members');
  return { success: true };
}
