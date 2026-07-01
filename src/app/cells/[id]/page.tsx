'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchCellDetailsAction, updateCellMembersAction } from '../actions';
import { toast } from 'sonner';

export default function CellDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [cellInfo, setCellInfo] = useState<any>(null);
  const [allMembers, setAllMembers] = useState<any[]>([]);
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const res = await fetchCellDetailsAction(id);
      if (res.success) {
        setCellInfo(res.cell);
        setAllMembers(res.allMembers || []);
        setAssignedIds(new Set(res.assignedMemberIds || []));
      } else {
        toast.error('셀 정보를 불러오지 못했습니다.');
        router.push('/cells');
      }
      setLoading(false);
    };
    loadData();
  }, [id, router]);

  const toggleMember = (memberId: string) => {
    setAssignedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(memberId)) newSet.delete(memberId);
      else newSet.add(memberId);
      return newSet;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    const res = await updateCellMembersAction(id, Array.from(assignedIds));
    if (res.success) {
      toast.success('셀 편성이 저장되었습니다! 💾');
    } else {
      toast.error('저장 실패: ' + res.error);
    }
    setSaving(false);
  };

  if (loading) return <div className="p-10 text-center text-gray-500">로딩 중...</div>;
  if (!cellInfo) return null;

  const assignedMembers = allMembers.filter(m => assignedIds.has(m.id));
  const unassignedMembers = allMembers.filter(m => !assignedIds.has(m.id));

  return (
    <div className="p-4 max-w-[1200px] mx-auto space-y-6 pb-24">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 game-header rounded-2xl p-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-[#252b43] border border-[#363e60] text-gray-400">{cellInfo.semester}</span>
            <h1 className="text-2xl font-extrabold text-neon-cyan">{cellInfo.name} 편성</h1>
          </div>
          <p className="text-sm text-gray-400">
            👑 리더: <span className="text-neon-yellow font-bold">{cellInfo.leader?.name || '미정'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/cells">
            <Button variant="outline" size="sm" className="border-[#2a2d3e] text-gray-400 hover:text-white">🔙 목록으로</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-transform">
            {saving ? '저장 중...' : '💾 변경사항 저장'}
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 현재 소속된 인원 */}
        <Card className="game-card border-cyan-500/30">
          <CardHeader className="bg-[#141627] border-b border-[#2a2d3e]">
            <CardTitle className="text-lg flex justify-between items-center text-gray-100">
              <span>현재 소속 셀원</span>
              <span className="text-sm bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full font-bold">
                {assignedMembers.length}명
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
            {assignedMembers.length === 0 ? (
              <div className="p-8 text-center text-gray-500">아직 배정된 인원이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-[#2a2d3e]">
                {assignedMembers.map(m => (
                  <li 
                    key={m.id} 
                    onClick={() => toggleMember(m.id)}
                    className="flex justify-between items-center p-4 hover:bg-[#252840] cursor-pointer transition-colors group"
                  >
                    <span className="font-bold text-gray-200">{m.name}</span>
                    <Button size="sm" variant="ghost" className="h-8 text-red-400 opacity-50 group-hover:opacity-100 hover:bg-red-400/10 hover:text-red-300">
                      빼기 ➖
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* 미배정 / 전체 인원 명단 */}
        <Card className="game-card">
          <CardHeader className="bg-[#141627] border-b border-[#2a2d3e]">
            <CardTitle className="text-lg flex justify-between items-center text-gray-400">
              <span>추가 가능 명단</span>
              <span className="text-sm text-gray-500 font-normal">활동 청년 기준</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[60vh] overflow-y-auto">
            <ul className="divide-y divide-[#2a2d3e]">
              {unassignedMembers.map(m => (
                <li 
                  key={m.id} 
                  onClick={() => toggleMember(m.id)}
                  className="flex justify-between items-center p-4 hover:bg-[#252840] cursor-pointer transition-colors group"
                >
                  <span className="text-gray-400">{m.name}</span>
                  <Button size="sm" variant="ghost" className="h-8 text-cyan-400 opacity-50 group-hover:opacity-100 hover:bg-cyan-400/10 hover:text-cyan-300">
                    추가 ➕
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
