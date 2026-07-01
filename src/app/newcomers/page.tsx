'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchNewcomersAction, updateNewcomerStatusAction } from './actions';
import { toast } from 'sonner';

const STATUS_LABELS = {
  1: '🌱 1주차 (등록)',
  2: '🌿 2주차 (교회란 무엇인가)',
  3: '🌳 3주차 (공동체 소개)',
  4: '🎉 4주차 (수료 및 등반)',
};

export default function NewcomersPage() {
  const [newcomers, setNewcomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchNewcomersAction();
    if (res.success) {
      setNewcomers(res.data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, newStatus: number | null) => {
    const res = await updateNewcomerStatusAction(id, newStatus);
    if (res.success) {
      toast.success('새가족 단계가 업데이트 되었습니다.');
      loadData();
    } else {
      toast.error('업데이트 실패: ' + res.error);
    }
  };

  const renderColumn = (status: number, title: string, colorClass: string, borderClass: string) => {
    const list = newcomers.filter(n => n.newcomer_status === status);
    return (
      <div className={`flex flex-col gap-3 p-4 rounded-xl border bg-[#141627]/50 h-full ${borderClass}`}>
        <h3 className={`font-bold text-lg mb-2 pb-2 border-b border-[#2a2d3e] ${colorClass}`}>{title} ({list.length}명)</h3>
        {list.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">인원이 없습니다.</p>
        ) : (
          list.map(n => (
            <Card key={n.id} className="game-card border-[#363e60] hover:border-emerald-500/50 transition-all bg-[#1e2235]">
              <CardContent className="p-3">
                <div className="flex justify-between items-start mb-2">
                  <span className="font-bold text-gray-100">{n.name} <span className="text-xs font-normal text-gray-400">({n.gender === 'M' ? '형제' : '자매'})</span></span>
                  <span className="text-xs text-gray-500">{n.registration_date} 등록</span>
                </div>
                <div className="text-xs text-gray-400 mb-3">{n.phone || '연락처 없음'}</div>
                
                <div className="flex gap-2 mt-2">
                  {status > 1 && (
                    <Button onClick={() => handleStatusChange(n.id, status - 1)} variant="outline" size="sm" className="flex-1 h-7 text-[10px] border-[#363e60] text-gray-400 hover:text-white">◀ 이전</Button>
                  )}
                  {status < 4 ? (
                    <Button onClick={() => handleStatusChange(n.id, status + 1)} size="sm" className="flex-1 h-7 text-[10px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40 border border-emerald-500/30">다음 ▶</Button>
                  ) : (
                    <Button onClick={() => handleStatusChange(n.id, null)} size="sm" className="flex-1 h-7 text-[10px] bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 border border-blue-500/30">등반 완료 (일반 전환)</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 game-header rounded-2xl p-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neon-emerald">🌱 새가족 정착 관리</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            방문부터 4주차 등반까지의 과정을 한눈에 파악하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/members">
            <Button variant="outline" size="sm" className="bg-[#1e2235] border-[#2a2d3e] text-cyan-400 hover:bg-cyan-500/10">명단에서 새가족 추가하기</Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-[#2a2d3e] text-gray-400 hover:text-white hover:border-cyan-500/50 transition-all">🏠 대시보드</Button>
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="text-center py-20 text-gray-500">로딩 중...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {renderColumn(1, STATUS_LABELS[1], 'text-emerald-300', 'border-emerald-500/20')}
          {renderColumn(2, STATUS_LABELS[2], 'text-cyan-300', 'border-cyan-500/20')}
          {renderColumn(3, STATUS_LABELS[3], 'text-blue-300', 'border-blue-500/20')}
          {renderColumn(4, STATUS_LABELS[4], 'text-pink-300', 'border-pink-500/20')}
        </div>
      )}
    </div>
  );
}
