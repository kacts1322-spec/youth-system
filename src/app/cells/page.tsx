'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchCellsBySemesterAction, createCellAction, deleteCellAction } from './actions';
import { fetchMembersAction } from '../members/actions';
import { toast } from 'sonner';

export default function CellsPage() {
  const [semester, setSemester] = useState('2026-상반기');
  const [cells, setCells] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLeader, setSelectedLeader] = useState<string>('unassigned');

  const loadData = async () => {
    setLoading(true);
    const [cellsRes, membersRes] = await Promise.all([
      fetchCellsBySemesterAction(semester),
      fetchMembersAction()
    ]);
    
    if (cellsRes.success) setCells(cellsRes.data || []);
    if (membersRes.success) setMembers(membersRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [semester]);

  const handleAddSubmit = async (formData: FormData) => {
    formData.append('semester', semester);
    const res = await createCellAction(formData);
    if (res.success) {
      toast.success('새로운 셀이 생성되었습니다! 🎉');
      setIsAddModalOpen(false);
      loadData();
    } else {
      toast.error('셀 생성 실패: ' + res.error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`정말로 '${name}'을 삭제하시겠습니까? (소속된 셀원 정보도 해제됩니다)`)) {
      const res = await deleteCellAction(id);
      if (res.success) {
        toast.success('셀이 삭제되었습니다.');
        loadData();
      } else {
        toast.error('셀 삭제 실패: ' + res.error);
      }
    }
  };

  return (
    <div className="p-4 max-w-[1200px] mx-auto space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 game-header rounded-2xl p-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neon-cyan">🫂 학기별 셀 편성</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            소그룹을 만들고 리더와 셀원을 배정해보세요!
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={semester} onValueChange={setSemester}>
            <SelectTrigger className="w-[150px] bg-[#0d0f1a] border-[#2a2d3e] text-gray-100 font-bold">
              <SelectValue placeholder="학기 선택" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-하반기">2025-하반기</SelectItem>
              <SelectItem value="2026-상반기">2026-상반기</SelectItem>
              <SelectItem value="2026-하반기">2026-하반기</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="h-10 border-[#2a2d3e] text-gray-400 hover:text-white hover:border-cyan-500/50 transition-all">🏠 대시보드</Button>
          </Link>
        </div>
      </header>

      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-200">
          <span className="text-neon-cyan">{semester}</span> 편성 목록
        </h2>
        
        <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all">
              ➕ 새 셀 만들기
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] game-card border-[#2a2d3e]">
            <form action={handleAddSubmit}>
              <DialogHeader><DialogTitle className="text-gray-100">새 셀 만들기 ({semester})</DialogTitle></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label className="text-gray-400">셀 이름 *</Label>
                  <Input name="name" placeholder="예: 믿음셀, 1조" className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100" required />
                </div>
                <div className="grid gap-2">
                  <Label className="text-gray-400">셀 리더 지정</Label>
                  <Select name="leader_id" value={selectedLeader} onValueChange={setSelectedLeader}>
                    <SelectTrigger className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100">
                      {selectedLeader === 'unassigned' ? '(리더 미정)' : (members.find(m => m.id === selectedLeader)?.name || '리더를 선택하세요')}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">(리더 미정)</SelectItem>
                      {members.filter(m => m.status !== 'away').map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white">생성하기</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="text-center py-20 text-gray-500">로딩 중...</div>
      ) : cells.length === 0 ? (
        <div className="text-center py-20 game-card border-dashed border-[#363e60]">
          <p className="text-gray-500 mb-4">이번 학기에 만들어진 셀이 없습니다.</p>
          <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10">첫 번째 셀 만들기</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cells.map((cell) => (
            <Card key={cell.id} className="game-card hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10 group flex flex-col h-full">
              <CardHeader className="pb-3 border-b border-[#2a2d3e] relative">
                <CardTitle className="text-xl font-bold text-gray-100 group-hover:text-neon-cyan transition-colors pr-8">
                  {cell.name}
                </CardTitle>
                <button 
                  onClick={() => handleDelete(cell.id, cell.name)}
                  className="absolute right-3 top-3 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-[#1e2235] hover:bg-[#252840] rounded-full border border-transparent hover:border-red-500/30"
                  title="삭제"
                >
                  🗑️
                </button>
              </CardHeader>
              <CardContent className="pt-4 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-500">👑 리더</span>
                    <span className="font-semibold text-neon-yellow">{cell.leader?.name || '미정'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">👥 소속 인원</span>
                    <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-sm">
                      {cell.cell_members?.length || 0}명
                    </span>
                  </div>
                </div>
                
                <Link href={`/cells/${cell.id}`} className="block mt-4">
                  <Button className="w-full bg-[#1e2235] text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/20">
                    인원 편성하기 🎯
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
