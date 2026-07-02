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

  const toInsert: any[] = [];
  const toUpdate: any[] = [];

  upsertData.forEach(row => {
    const existingId = existingLookup.get(`${row.member_id}_${row.service_date}`);
    if (existingId) {
      toUpdate.push({ ...row, id: existingId });
    } else {
      toInsert.push(row);
    }
  });

  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase.from('attendance').insert(toInsert);
    if (insertErr) return { success: false, error: '새 출석 기록 저장 실패: ' + insertErr.message };
  }

  if (toUpdate.length > 0) {
    const { error: updateErr } = await supabase.from('attendance').upsert(toUpdate);
    if (updateErr) return { success: false, error: '기존 출석 기록 수정 실패: ' + updateErr.message };
  }

  // --- 추가된 로직: 전체 출석 데이터를 바탕으로 상태 자동 업데이트 ---
  const { data: currentMembers } = await supabase.from('members').select('id, status, created_at');
  
  // 전체 출석 데이터를 가져와서 각 멤버의 마지막 출석일을 계산 (최신 반영된 데이터 포함)
  const { data: allAttendances } = await supabase.from('attendance').select('member_id, service_date').eq('present', true);
  
  const lastAttendanceMap = new Map<string, Date>();
  for (const att of (allAttendances || [])) {
    const d = new Date(att.service_date);
    const existing = lastAttendanceMap.get(att.member_id);
    if (!existing || d > existing) {
      lastAttendanceMap.set(att.member_id, d);
    }
  }

  const statusUpdates = [];
  const todayDate = new Date();

  for (const member of (currentMembers || [])) {
    // 군/유학(away) 상태는 자동으로 변경하지 않음
    if (member.status === 'away') continue;

    const lastDate = lastAttendanceMap.get(member.id);
    let newStatus = member.status;

    if (!lastDate) {
      // 출석 기록이 아예 없는 경우: 가입일 기준 계산
      const createdDate = new Date(member.created_at);
      const diffDays = (todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 365) newStatus = 'inactive';
      else if (diffDays >= 90) newStatus = 'long_absent';
    } else {
      const diffDays = (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays >= 365) newStatus = 'inactive';
      else if (diffDays >= 90) newStatus = 'long_absent';
    }

    // 3개월(90일) 이상 결석이 아니면, 최근 5주 기준으로 활동/확인 판별
    if (newStatus !== 'inactive' && newStatus !== 'long_absent') {
      const checks = attendanceMap[member.id] || {};
      let presentCount = 0;
      for (const date of dates) {
        if (checks[date] === true) presentCount++;
      }
      
      if (presentCount <= 2) newStatus = 'warning';
      else if (presentCount >= 3) newStatus = 'active';
    }

    if (newStatus !== member.status) {
      statusUpdates.push({ id: member.id, status: newStatus });
    }
  }

  // bulk update members status
  if (statusUpdates.length > 0) {
    const updatePromises = statusUpdates.map(update => 
      supabase.from('members').update({ status: update.status }).eq('id', update.id)
    );
    await Promise.all(updatePromises);
  }

  revalidatePath('/attendance');
  revalidatePath('/members');
  return { success: true };
}
