'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchWeeklyAttendanceAction, saveWeeklyAttendanceAction } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';

function getPastSundays(baseDate: Date, count: number) {
  const dates = [];
  const d = new Date(baseDate);
  const diff = d.getDate() - d.getDay(); 
  d.setDate(diff); // Nearest past/current Sunday

  for (let i = 0; i < count; i++) {
    const sunday = new Date(d);
    sunday.setDate(d.getDate() - (7 * i));
    const y = sunday.getFullYear();
    const m = String(sunday.getMonth() + 1).padStart(2, '0');
    const day = String(sunday.getDate()).padStart(2, '0');
    dates.unshift(`${y}-${m}-${day}`); // oldest first
  }
  return dates; // Array of 5 dates
}

export default function AttendancePage() {
  const [baseDateStr, setBaseDateStr] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const dates = getPastSundays(new Date(baseDateStr), 5);

  const [members, setMembers] = useState<any[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, boolean>>>({});
  const [newcomers, setNewcomers] = useState<{name: string, dateCheck: Record<string, boolean>}[]>([
    { name: '', dateCheck: {} },
    { name: '', dateCheck: {} },
    { name: '', dateCheck: {} }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async (targetDates: string[]) => {
    setLoading(true);
    const res = await fetchWeeklyAttendanceAction(targetDates);
    if (res.success && res.members) {
      setMembers(res.members);
      setAttendanceMap(res.attendanceMap || {});
    } else {
      toast.error('데이터를 불러오지 못했습니다. ' + (res.error || ''));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData(dates);
  }, [baseDateStr]);

  const handleToggle = (memberId: string, date: string) => {
    setAttendanceMap(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [date]: !prev[memberId][date]
      }
    }));
  };

  const handleNewcomerNameChange = (index: number, name: string) => {
    setNewcomers(prev => {
      const newArr = [...prev];
      newArr[index].name = name;
      return newArr;
    });
  };

  const handleNewcomerToggle = (index: number, date: string) => {
    setNewcomers(prev => {
      const newArr = [...prev];
      newArr[index].dateCheck[date] = !newArr[index].dateCheck[date];
      return newArr;
    });
  };

  const handleSaveAll = async () => {
    setSaving(true);
    toast('저장 중입니다...');
    try {
      const res = await saveWeeklyAttendanceAction(dates, attendanceMap, newcomers);
      if (res.success) {
        toast.success('출석 현황이 성공적으로 저장되었습니다!');
        // Reset newcomers after save and reload
        setNewcomers([{ name: '', dateCheck: {} }, { name: '', dateCheck: {} }, { name: '', dateCheck: {} }]);
        loadData(dates);
      } else {
        toast.error('저장 실패: ' + res.error);
      }
    } catch (error) {
      console.error(error);
      toast.error('저장 중 서버 연결 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 max-w-[1000px] mx-auto space-y-4 pb-32">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 game-header rounded-2xl p-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neon-cyan">✅ 주일 출석 체크</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            청년들의 출석을 체크해보세요! 하단에서 새가족/방문자도 바로 등록할 수 있어요 🎉
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" size="sm" className="border-[#363e60] text-gray-400 hover:text-white hover:border-cyan-500/50 hover:scale-105 transition-all">🏠 대시보드</Button>
        </Link>
      </header>

      <div className="game-card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-400">📅 예배일</span>
          <Input 
            type="date" 
            value={baseDateStr} 
            onChange={(e) => setBaseDateStr(e.target.value)} 
            className="w-auto bg-[#1e2235] border-[#363e60] text-gray-100 font-semibold cursor-pointer"
          />
        </div>
        <div className="flex gap-3">
          <div className="text-sm font-bold text-cyan-400 bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
            👥 {members.filter(m => m.status !== 'away').length}명
          </div>
          <div className="text-sm font-bold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full border border-emerald-500/20">
            ✅ {Object.values(attendanceMap).filter(checks => checks[dates[dates.length - 1]]).length}명 출석
          </div>
          <div className="text-sm font-bold text-pink-400 bg-pink-500/10 px-4 py-2 rounded-full border border-pink-500/20">
            💕 {members.filter(m => m.status === 'warning').length}명 확인
          </div>
        </div>
      </div>

      <Card className="game-card overflow-hidden border-[#363e60]">
        <div className="overflow-auto w-full h-[65vh] md:h-[70vh]">
          <Table className="min-w-[600px] text-sm relative">
            <TableHeader className="bg-[#1e2235] sticky top-0 z-20 shadow-md">
              <TableRow className="border-b border-[#363e60]">
                <TableHead className="w-[120px] text-center font-bold sticky left-0 top-0 bg-[#1e2235] z-30 border-r border-[#363e60] text-cyan-400">
                  이름
                </TableHead>
                {dates.map((d, i) => {
                  const isToday = i === dates.length - 1;
                  return (
                    <TableHead key={d} className={`text-center font-semibold min-w-[80px] bg-[#1e2235] ${isToday ? 'text-neon-cyan' : 'text-gray-500'}`}>
                      {d.substring(5).replace('-', '/')}
                    </TableHead>
                  );
                })}
              </TableRow>
              <TableRow className="bg-[#2a314d] border-b-2 border-cyan-500/30">
                <TableHead className="text-center font-extrabold sticky left-0 bg-[#2a314d] z-30 border-r border-[#363e60] text-cyan-300">
                  출석 인원
                </TableHead>
                {dates.map(date => {
                  const count = members.filter(m => attendanceMap[m.id]?.[date]).length + newcomers.filter(n => n.name.trim() && n.dateCheck[date]).length;
                  return (
                    <TableHead key={`total-${date}`} className="text-center font-bold text-cyan-300 bg-[#2a314d] border-r border-[#363e60] last:border-r-0">
                      {count}명
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-600 font-medium">로딩 중...</TableCell></TableRow>
              ) : members.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-gray-600 font-medium">명단이 없습니다.</TableCell></TableRow>
              ) : (
                (() => {
                  const activeMembers = members.filter(m => m.status !== 'away' && m.status !== 'long_absent' && m.status !== 'inactive');
                  const inactiveMembers = members.filter(m => m.status === 'long_absent' || m.status === 'inactive');
                  const awayMembers = members.filter(m => m.status === 'away');
                  
                  return (
                    <>
                      {activeMembers.map((member) => {
                        // 상태별 이모지 (이름 옆에 1번만 표시)
                        const statusEmoji = member.status === 'active' ? '🌟' : member.status === 'warning' ? '💕' : member.status === 'long_absent' ? '👻' : '😴';
                        return (
                        <TableRow key={member.id} className="border-b border-[#363e60] bg-[#252b43] even:bg-[#2a314d] hover:bg-[#303858] transition-colors">
                          <TableCell className="text-center font-bold sticky left-0 bg-[#252b43] z-10 border-r border-[#363e60] text-gray-100">
                            {member.name} <span className="text-sm">{statusEmoji}</span>
                          </TableCell>
                          {dates.map(date => {
                            const isChecked = attendanceMap[member.id]?.[date] || false;
                            const isToday = date === dates[dates.length - 1];
                            return (
                              <TableCell key={date} className={`text-center cursor-pointer p-0 border-r border-[#363e60] last:border-r-0 ${isToday ? 'bg-cyan-500/5' : ''}`} onClick={() => handleToggle(member.id, date)}>
                                <div className={`w-full h-12 flex items-center justify-center transition-all duration-200 ${isChecked ? 'bg-emerald-500/15' : 'hover:bg-[#303858]'}`}>
                                  <span className={`text-xl select-none transition-transform duration-200 ${isChecked ? 'scale-110' : ''}`}>{isChecked ? '✅' : '⬜'}</span>
                                </div>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                        );
                      })}

                      {inactiveMembers.length > 0 && (
                        <>
                          <TableRow className="border-0 hover:bg-transparent">
                            <TableCell colSpan={6} className="p-4">
                              <div className="flex items-center justify-center gap-3 bg-[#252b43] border border-[#363e60] rounded-full py-3 px-6 max-w-sm mx-auto">
                                <span className="text-xl">👻</span>
                                <span className="font-extrabold text-gray-400 tracking-wider text-sm">장기결석 및 비활동 명단</span>
                                <span className="text-xl">👻</span>
                              </div>
                            </TableCell>
                          </TableRow>
                          {inactiveMembers.map((member) => {
                            const statusEmoji = member.status === 'long_absent' ? '👻' : '😴';
                            return (
                              <TableRow key={member.id} className="border-b border-[#363e60] bg-[#252b43] even:bg-[#2a314d] hover:bg-[#303858] transition-colors opacity-80">
                                <TableCell className="text-center font-bold sticky left-0 bg-[#252b43] z-10 border-r border-[#363e60] text-gray-400">
                                  {member.name} <span className="text-sm">{statusEmoji}</span>
                                </TableCell>
                                {dates.map(date => {
                                  const isChecked = attendanceMap[member.id]?.[date] || false;
                                  const isToday = date === dates[dates.length - 1];
                                  return (
                                    <TableCell key={date} className={`text-center cursor-pointer p-0 border-r border-[#363e60] last:border-r-0 ${isToday ? 'bg-cyan-500/5' : ''}`} onClick={() => handleToggle(member.id, date)}>
                                      <div className={`w-full h-12 flex items-center justify-center transition-all duration-200 ${isChecked ? 'bg-emerald-500/15' : 'hover:bg-[#303858]'}`}>
                                        <span className={`text-xl select-none ${isChecked ? 'scale-110' : ''}`}>{isChecked ? '✅' : '⬜'}</span>
                                      </div>
                                    </TableCell>
                                  );
                                })}
                              </TableRow>
                            );
                          })}
                        </>
                      )}

                      {awayMembers.length > 0 && (
                        <>
                          <TableRow className="border-0 hover:bg-transparent">
                            <TableCell colSpan={6} className="p-4">
                              <div className="flex items-center justify-center gap-3 bg-[#252b43] border border-[#363e60] rounded-full py-3 px-6 max-w-sm mx-auto">
                                <span className="text-xl">✈️</span>
                                <span className="font-extrabold text-gray-400 tracking-wider text-sm">군/유학 명단</span>
                                <span className="text-xl">✈️</span>
                              </div>
                            </TableCell>
                          </TableRow>
                          {awayMembers.map((member) => (
                            <TableRow key={member.id} className="border-b border-[#363e60] bg-[#252b43] even:bg-[#2a314d] hover:bg-[#303858] transition-colors opacity-60">
                              <TableCell className="text-center font-bold sticky left-0 bg-[#252b43] z-10 border-r border-[#363e60] text-gray-400">
                                {member.name} ✈️
                              </TableCell>
                              {dates.map(date => {
                                const isChecked = attendanceMap[member.id]?.[date] || false;
                                const isToday = date === dates[dates.length - 1];
                                return (
                                  <TableCell key={date} className={`text-center cursor-pointer p-0 border-r border-[#363e60] last:border-r-0 ${isToday ? 'bg-cyan-500/5' : ''}`} onClick={() => handleToggle(member.id, date)}>
                                    <div className={`w-full h-12 flex items-center justify-center transition-all duration-200 ${isChecked ? 'bg-emerald-500/15' : 'hover:bg-[#303858]'}`}>
                                      <span className={`text-xl select-none ${isChecked ? 'scale-110' : ''}`}>{isChecked ? '✅' : '⬜'}</span>
                                    </div>
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          ))}
                        </>
                      )}
                    </>
                  );
                })()
              )}

              {/* 방문자/새가족 추가 로우 */}
              {!loading && newcomers.map((newcomer, idx) => (
                <TableRow key={`newcomer-${idx}`} className="bg-amber-500/5 hover:bg-amber-500/10 border-b border-amber-500/20">
                  <TableCell className="sticky left-0 bg-[#1e1d15] z-10 border-r border-amber-500/20 p-1">
                    <Input 
                      placeholder="🌟 새가족 이름" 
                      value={newcomer.name}
                      onChange={(e) => handleNewcomerNameChange(idx, e.target.value)}
                      className="h-10 bg-[#1e2235] text-sm font-bold text-amber-400 border-amber-500/30 focus-visible:ring-amber-500 placeholder:text-amber-700/50 w-full text-center"
                    />
                  </TableCell>
                  {dates.map(date => {
                    const isChecked = newcomer.dateCheck[date] || false;
                    const isToday = date === dates[dates.length - 1];
                    return (
                      <TableCell key={date} className={`text-center cursor-pointer p-0 border-r border-amber-500/20 last:border-r-0 ${isToday ? 'bg-amber-500/5' : ''}`} onClick={() => handleNewcomerToggle(idx, date)}>
                        <div className={`w-full h-12 flex items-center justify-center transition-all duration-200 ${isChecked ? 'bg-amber-500/15' : 'hover:bg-amber-500/10'}`}>
                          <span className={`text-xl select-none ${!newcomer.name.trim() ? 'opacity-20' : ''}`}>{isChecked ? '✅' : '⬜'}</span>
                        </div>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-[#1e2235]/90 backdrop-blur-xl border-t border-[#363e60] z-20">
        <div className="max-w-[1000px] mx-auto">
          <Button 
            onClick={handleSaveAll} 
            disabled={loading || saving}
            className="w-full h-14 text-lg font-extrabold bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 hover:from-cyan-600 hover:via-blue-600 hover:to-purple-700 text-white shadow-xl shadow-cyan-500/20 rounded-xl tracking-wide hover:scale-[1.02] transition-all duration-300"
          >
            {saving ? '💾 저장 중...' : '🚀 5주치 출석 한 번에 저장하기!'}
          </Button>
        </div>
      </div>
    </div>
  );
}
