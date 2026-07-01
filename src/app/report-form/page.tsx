'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { toast } from 'sonner';
import { submitReportAction, verifyLeaderPasswordAction } from '../reports/actions';
import { fetchCellsBySemesterAction, fetchCellDetailsAction } from '../cells/actions';

export default function ReportFormPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  
  const [cells, setCells] = useState<any[]>([]);
  const [selectedCellId, setSelectedCellId] = useState<string>('');
  const [cellMembers, setCellMembers] = useState<any[]>([]);
  const [checkedMembers, setCheckedMembers] = useState<Record<string, boolean>>({});
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const currentSemester = '2026-상반기';

  useEffect(() => {
    if (isAuthenticated) {
      loadCells();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedCellId) {
      loadCellMembers(selectedCellId);
    } else {
      setCellMembers([]);
      setCheckedMembers({});
    }
  }, [selectedCellId]);

  const loadCells = async () => {
    const res = await fetchCellsBySemesterAction(currentSemester);
    if (res.success) {
      setCells(res.data || []);
    }
  };

  const loadCellMembers = async (cellId: string) => {
    const res = await fetchCellDetailsAction(cellId);
    if (res.success && res.allMembers && res.assignedMemberIds) {
      const assigned = res.allMembers.filter((m: any) => res.assignedMemberIds.includes(m.id) || m.id === res.cell?.leader_id);
      
      const uniqueAssignedMap = new Map();
      assigned.forEach((m: any) => uniqueAssignedMap.set(m.id, m));
      const uniqueAssigned = Array.from(uniqueAssignedMap.values());
      
      setCellMembers(uniqueAssigned);
      
      const initialChecked: Record<string, boolean> = {};
      uniqueAssigned.forEach((m: any) => {
        initialChecked[m.id] = false;
      });
      setCheckedMembers(initialChecked);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    const isValid = await verifyLeaderPasswordAction(password);
    if (isValid) {
      setIsAuthenticated(true);
      toast.success('인증되었습니다.');
    } else {
      toast.error('비밀번호가 틀렸습니다.');
    }
  };

  const toggleMemberCheck = (memberId: string) => {
    setCheckedMembers(prev => ({
      ...prev,
      [memberId]: !prev[memberId]
    }));
  };

  const handleSubmitReport = async (formData: FormData) => {
    if (!selectedCellId) {
      toast.error('소속 셀을 선택해주세요.');
      return;
    }
    
    setSubmitting(true);
    
    const attendeesList = cellMembers.filter(m => checkedMembers[m.id]).map(m => m.name).join(', ');
    const attendeesCount = cellMembers.filter(m => checkedMembers[m.id]).length;
    
    formData.append('cell_id', selectedCellId);
    if (attendeesList) formData.append('attendees_list', attendeesList);
    formData.append('attendees_count', attendeesCount.toString());

    const res = await submitReportAction(formData);
    if (res.success) {
      setSubmitted(true);
      toast.success('보고서 제출이 완료되었습니다! 수고하셨습니다 🎉');
    } else {
      toast.error('제출 실패: ' + res.error);
    }
    setSubmitting(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="game-card w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-neon-cyan">🔒 리더 인증</CardTitle>
            <CardDescription className="text-gray-400">보고서를 작성하려면 비밀번호를 입력해주세요.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <Input 
                type="password" 
                placeholder="비밀번호" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100"
              />
              <Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600">접속하기</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="game-card w-full max-w-md text-center py-10">
          <CardContent className="space-y-6">
            <div className="text-6xl animate-bounce">🎉</div>
            <h1 className="text-2xl font-extrabold text-neon-cyan">제출 완료!</h1>
            <p className="text-gray-400">이번 주도 정말 수고 많으셨습니다!<br/>리더님의 섬김에 감사드립니다 🙏</p>
            <Button onClick={() => {
              setSubmitted(false);
              setSelectedCellId('');
              setCellMembers([]);
              setCheckedMembers({});
            }} variant="outline" className="mt-4 border-[#2a2d3e] text-gray-300">새 보고서 작성하기</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const selectedCellName = cells.find(c => c.id === selectedCellId)?.name || '';

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-6 pb-20">
      <header className="game-header rounded-2xl p-6 text-center">
        <h1 className="text-3xl font-extrabold text-neon-cyan mb-2">📝 주간 셀 보고서</h1>
        <p className="text-sm text-gray-400">모임 후 잊기 전에 빠르게 기록을 남겨보세요!</p>
      </header>

      <Card className="game-card border-cyan-500/30">
        <CardContent className="p-6">
          <form action={handleSubmitReport} className="space-y-6">
            <div className="grid gap-2">
              <Label className="text-gray-300">소속 셀 선택 *</Label>
              <Select value={selectedCellId} onValueChange={setSelectedCellId} required>
                <SelectTrigger className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100 h-12">
                  {selectedCellId ? selectedCellName : <span className="text-slate-500">본인의 셀을 선택하세요</span>}
                </SelectTrigger>
                <SelectContent>
                  {cells.map(cell => (
                    <SelectItem key={cell.id} value={cell.id}>{cell.name} (리더: {cell.leader?.name || '미정'})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-gray-300">모임 날짜 *</Label>
              <Input name="meeting_date" type="date" required className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100 h-12 w-full md:w-1/2" defaultValue={new Date().toISOString().split('T')[0]} />
            </div>

            {selectedCellId && (
              <div className="grid gap-3 bg-[#0d0f1a] p-4 rounded-xl border border-[#2a2d3e]">
                <div className="flex justify-between items-center mb-1">
                  <Label className="text-neon-yellow">👥 이번 주 출석자 체크</Label>
                  <span className="text-sm text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded">
                    총 {Object.values(checkedMembers).filter(Boolean).length}명 참석
                  </span>
                </div>
                
                {cellMembers.length === 0 ? (
                  <p className="text-sm text-gray-500">이 셀에 등록된 인원이 없습니다.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {cellMembers.map(member => (
                      <label 
                        key={member.id} 
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${checkedMembers[member.id] ? 'bg-cyan-500/20 border-cyan-500/50' : 'bg-[#1e2235] border-transparent hover:bg-[#252b43]'}`}
                      >
                        <input 
                          type="checkbox" 
                          checked={checkedMembers[member.id] || false}
                          onChange={() => toggleMemberCheck(member.id)}
                          className="w-5 h-5 rounded border-gray-400 text-cyan-500 focus:ring-cyan-500 bg-transparent"
                        />
                        <span className={`font-medium ${checkedMembers[member.id] ? 'text-cyan-400' : 'text-gray-300'}`}>
                          {member.name}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid gap-2">
              <Label className="text-gray-300">모임 및 나눔 내용 *</Label>
              <Textarea 
                name="content" 
                required 
                className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100 min-h-[120px] resize-y" 
                placeholder="오늘 모임에서 어떤 은혜를 나누었나요?" 
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-gray-300">기도 제목 🙏</Label>
              <Textarea 
                name="prayer_requests" 
                className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100 min-h-[100px] resize-y" 
                placeholder="셀원들의 기도 제목을 적어주세요." 
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-gray-300">특이사항 (결석자 사유 등)</Label>
              <Textarea 
                name="note" 
                className="bg-[#0d0f1a] border-[#2a2d3e] text-gray-100 min-h-[80px] resize-y" 
                placeholder="예: 홍길동(야근으로 결석), 김철수(코로나 확진)" 
              />
            </div>

            <Button disabled={submitting} type="submit" className="w-full h-14 text-lg font-bold bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-[1.02] transition-transform">
              {submitting ? '제출 중...' : '🚀 보고서 제출하기'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
