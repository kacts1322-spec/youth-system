'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';

export async function fetchWeeklyAttendanceAction(dates: string[]) {
  // 1. 활성/이탈 멤버 가져오기 (완전 비활동 inactive는 제외)
  const { data: members, error: mErr } = await supabase
    .from('members')
    .select('id, name, gender, status')
    .neq('status', 'inactive')
    .order('name', { ascending: true });
    
  if (mErr) return { success: false, error: mErr.message };

  // 2. 5주치 출석 기록 가져오기
  const { data: records, error: aErr } = await supabase
    .from('attendance')
    .select('*')
    .in('service_date', dates);

  if (aErr) return { success: false, error: aErr.message };

  // 3. 기록 구조화: { member_id: { date1: true, date2: false, ... } }
  const attendanceMap: Record<string, Record<string, boolean>> = {};
  members.forEach(m => {
    attendanceMap[m.id] = {};
    dates.forEach(d => { attendanceMap[m.id][d] = false; });
  });

  records.forEach((r: any) => {
    if (attendanceMap[r.member_id]) {
      attendanceMap[r.member_id][r.service_date] = r.present;
    }
  });

  return { success: true, members, attendanceMap };
}

export async function saveWeeklyAttendanceAction(
  dates: string[], 
  attendanceMap: Record<string, Record<string, boolean>>, 
  newcomers: { name: string, dateCheck: Record<string, boolean> }[]
) {
  const session = await getSession();
  const checkedBy = session?.role === 'ADMIN' ? '전체관리자' : '임원';

  // 1. 새가족 명단 추가
  const newMembersToInsert = newcomers.filter(n => n.name.trim() !== '').map(n => ({
    name: n.name.trim(),
    gender: 'M', // 기본값
    status: 'active',
    note: '방문/새가족 (출석부 추가)'
  }));

  let insertedNewcomers: any[] = [];
  if (newMembersToInsert.length > 0) {
    const { data: newMembersData, error: insertErr } = await supabase
      .from('members')
      .insert(newMembersToInsert)
      .select('id, name');
      
    if (insertErr) return { success: false, error: '새가족 등록 실패: ' + insertErr.message };
    insertedNewcomers = newMembersData || [];
  }

  // 2. Upsert용 출석 데이터 준비
  const upsertData: any[] = [];
  
  // 기존 회원
  for (const [memberId, checks] of Object.entries(attendanceMap)) {
    for (const [date, present] of Object.entries(checks)) {
      if (dates.includes(date)) {
        upsertData.push({
          member_id: memberId,
          service_date: date,
          present,
          checked_by: checkedBy
        });
      }
    }
  }

  // 신규 회원
  for (const newMember of insertedNewcomers) {
    const newcomerEntry = newcomers.find(n => n.name.trim() === newMember.name);
    if (newcomerEntry) {
      for (const [date, present] of Object.entries(newcomerEntry.dateCheck)) {
        if (dates.includes(date)) {
          upsertData.push({
            member_id: newMember.id,
            service_date: date,
            present,
            checked_by: checkedBy
          });
        }
      }
    }
  }

  // 3. 기존 기록 ID 매핑 (Upsert 시 교체 방지 위해)
  const { data: existing } = await supabase
    .from('attendance')
    .select('id, member_id, service_date')
    .in('service_date', dates);

  const existingLookup = new Map((existing || []).map(r => [`${r.member_id}_${r.service_date}`, r.id]));

  const finalUpsert = upsertData.map(row => {
    const existingId = existingLookup.get(`${row.member_id}_${row.service_date}`);
    if (existingId) return { ...row, id: existingId };
    return row;
  });

  const { error } = await supabase.from('attendance').upsert(finalUpsert);
  if (error) return { success: false, error: error.message };

  // --- 추가된 로직: 5주 기준 상태 자동 업데이트 ---
  const { data: currentMembers } = await supabase.from('members').select('id, status');
  const currentMembersMap = new Map((currentMembers || []).map(m => [m.id, m.status]));
  
  const statusUpdates = [];
  
  for (const [memberId, checks] of Object.entries(attendanceMap)) {
    const status = currentMembersMap.get(memberId);
    if (status === 'away' || status === 'inactive') continue; // 이탈자/비활동 예외

    let presentCount = 0;
    for (const date of dates) {
      if (checks[date] === true) presentCount++;
    }

    if (presentCount <= 2 && status !== 'warning') {
      statusUpdates.push({ id: memberId, status: 'warning' });
    } else if (presentCount >= 3 && status !== 'active') {
      statusUpdates.push({ id: memberId, status: 'active' });
    }
  }

  // bulk update members status
  if (statusUpdates.length > 0) {
    for (const update of statusUpdates) {
      await supabase.from('members').update({ status: update.status }).eq('id', update.id);
    }
  }

  revalidatePath('/attendance');
  revalidatePath('/members');
  return { success: true };
}
