import { getSession } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/app/actions/auth';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

// 4주 전까지의 주일(일요일) 날짜 구하기
function getLast4Sundays() {
  const dates = [];
  const today = new Date();
  
  let d = new Date(today);
  d.setDate(d.getDate() - d.getDay()); // 이번 주 일요일
  
  for (let i = 0; i < 4; i++) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    dates.unshift(`${y}-${m}-${day}`); // 오름차순
    d.setDate(d.getDate() - 7);
  }
  return dates;
}

export default async function DashboardPage() {
  const session = await getSession();
  const role = session?.role;

  // 1. 전체 활동 회원 수 조회
  const { count: totalActive } = await supabase
    .from('members')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'away');

  // 2. 4주간 출석 데이터 조회
  const sundays = getLast4Sundays();
  const { data: attendanceData } = await supabase
    .from('attendance')
    .select('service_date')
    .in('service_date', sundays)
    .eq('present', true);

  const attendanceCountByDate: Record<string, number> = {};
  sundays.forEach(d => attendanceCountByDate[d] = 0);
  
  if (attendanceData) {
    attendanceData.forEach(record => {
      if (attendanceCountByDate[record.service_date] !== undefined) {
        attendanceCountByDate[record.service_date]++;
      }
    });
  }

  const thisWeekAttendance = attendanceCountByDate[sundays[3]] || 0;
  const attendanceRate = totalActive && totalActive > 0 
    ? Math.round((thisWeekAttendance / totalActive) * 100) 
    : 0;

  // 3. 복귀 임박 알림 (오늘 기준 30일 이내)
  const todayStr = new Date().toISOString().split('T')[0];
  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);
  const nextMonthStr = nextMonth.toISOString().split('T')[0];

  const { data: returningMembers } = await supabase
    .from('members')
    .select('name, away_expected_return_date, away_type')
    .eq('is_away', true)
    .not('away_expected_return_date', 'is', null)
    .gte('away_expected_return_date', todayStr)
    .lte('away_expected_return_date', nextMonthStr)
    .order('away_expected_return_date', { ascending: true });

  return (
    <div className="min-h-screen flex flex-col">
      <header className="game-header px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⛪</span>
          <div>
            <h1 className="text-lg font-extrabold text-neon-cyan tracking-wide">청년부 관리</h1>
            <p className="text-[10px] text-gray-500 tracking-widest uppercase">Youth Management System</p>
          </div>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" size="sm" type="submit" className="border-[#363e60] text-gray-400 hover:text-white hover:border-cyan-500/50 transition-all">🚪 로그아웃</Button>
        </form>
      </header>

      <main className="flex-1 p-4 space-y-6 max-w-4xl mx-auto w-full pb-20">
        {/* 환영 메시지 */}
        <div className="game-card-glow p-5">
          <p className="text-lg font-bold text-white">
            {role === 'ADMIN' ? '👑' : '🙋'} 안녕하세요, <span className="text-neon-yellow">{role === 'ADMIN' ? '전체관리자' : '임원'}</span>님!
          </p>
          <p className="text-sm text-gray-400 mt-1">오늘도 청년부를 위해 수고해 주셔서 감사합니다 🙏</p>
        </div>

        {/* 대시보드 통계 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="game-card bg-[#141627]/80">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-gray-400 font-bold mb-1">총 재적 인원</span>
              <span className="text-3xl font-extrabold text-neon-cyan">{totalActive || 0}명</span>
            </CardContent>
          </Card>
          <Card className="game-card bg-[#141627]/80">
            <CardContent className="p-4 flex flex-col items-center justify-center text-center">
              <span className="text-sm text-gray-400 font-bold mb-1">이번 주 출석</span>
              <span className="text-3xl font-extrabold text-neon-pink">{thisWeekAttendance}명</span>
            </CardContent>
          </Card>
          <Card className="game-card bg-[#141627]/80 md:col-span-2">
            <CardContent className="p-4">
              <div className="flex justify-between items-end mb-2">
                <span className="text-sm text-gray-400 font-bold">최근 4주 출석률 추이</span>
                <span className="text-lg font-extrabold text-emerald-400">{attendanceRate}%</span>
              </div>
              <div className="flex h-12 items-end justify-between gap-2 mt-4">
                {sundays.map((date, idx) => {
                  const count = attendanceCountByDate[date];
                  const heightPercentage = totalActive ? Math.min((count / totalActive) * 100, 100) : 0;
                  return (
                    <div key={date} className="relative flex flex-col items-center w-full group">
                      <div className="w-full bg-[#2a2d3e] rounded-t-sm flex items-end overflow-hidden" style={{ height: '48px' }}>
                        <div 
                          className="w-full bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm transition-all duration-500"
                          style={{ height: `${heightPercentage}%` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-500 mt-1">{date.slice(5)}</span>
                      {/* 툴팁 */}
                      <div className="absolute -top-8 bg-[#252b43] text-xs text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-[#363e60]">
                        {count}명 참석
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 퀵 메뉴 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Link href="/members" className="block group">
            <Card className="game-card hover:border-pink-500/50 hover:shadow-pink-500/10 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">📋</span> 명단 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">전체 명단 조회 및 엑셀 업로드</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/newcomers" className="block group">
            <Card className="game-card hover:border-emerald-500/50 hover:shadow-emerald-500/10 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full border-emerald-500/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🌱</span> 새가족 관리
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">방문자 및 새가족 4주 정착 과정 관리</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/attendance" className="block group">
            <Card className="game-card hover:border-blue-500/50 hover:shadow-blue-500/10 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">✅</span> 출석 체크
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">매주 주일 예배 출석 기록</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/cells" className="block group">
            <Card className="game-card hover:border-purple-500/50 hover:shadow-purple-500/10 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                  <span className="text-2xl group-hover:scale-125 transition-transform duration-300">🫂</span> 셀 편성
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">학기별 셀 편성 및 조회</p>
              </CardContent>
            </Card>
          </Link>

          {role === 'ADMIN' && (
            <Link href="/reports" className="block group md:col-span-2">
              <Card className="game-card hover:border-amber-500/50 hover:shadow-amber-500/10 hover:shadow-lg hover:scale-[1.03] transition-all duration-300 cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 text-gray-100">
                    <span className="text-2xl group-hover:scale-125 transition-transform duration-300">📊</span> 셀리더 주간 보고서
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">각 셀별 모임 내용과 기도 제목 열람</p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>

        {/* 복귀 임박 알림 */}
        <Card className={`game-card ${returningMembers && returningMembers.length > 0 ? 'border-amber-500/50 bg-amber-500/5' : 'border-[#2a2d3e]'}`}>
          <CardHeader className="pb-2">
            <CardTitle className={`text-md flex items-center gap-2 ${returningMembers && returningMembers.length > 0 ? 'text-amber-400' : 'text-gray-400'}`}>
              🔔 복귀 임박 알림 (30일 이내)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {returningMembers && returningMembers.length > 0 ? (
              <ul className="space-y-2">
                {returningMembers.map((rm, idx) => {
                  const daysLeft = Math.ceil((new Date(rm.away_expected_return_date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
                  return (
                    <li key={idx} className="flex items-center justify-between bg-[#141627] p-3 rounded-md border border-[#2a2d3e]">
                      <div>
                        <span className="font-bold text-gray-100 mr-2">{rm.name}</span>
                        <span className="text-xs text-gray-500">{rm.away_type === 'military' ? '군대' : rm.away_type === 'study' ? '유학' : '기타'} 복귀</span>
                      </div>
                      <div className="text-sm font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded">
                        {daysLeft <= 0 ? '오늘 복귀!' : `D-${daysLeft}`} ({rm.away_expected_return_date})
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">현재 30일 이내 복귀 예정인 청년이 없습니다. 🕊️</p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
