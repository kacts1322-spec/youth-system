'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { fetchMemberDetailsAction, fetchPastoralNotesAction, addPastoralNoteAction } from './actions';
import { toast } from 'sonner';

export default function MemberProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [member, setMember] = useState<any>(null);
  const [cellHistory, setCellHistory] = useState<any[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
  
  const [notes, setNotes] = useState<any[]>([]);
  const [canViewNotes, setCanViewNotes] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    setLoading(true);
    // 기본 정보
    const res = await fetchMemberDetailsAction(id);
    if (res.success) {
      setMember(res.member);
      setCellHistory(res.cellHistory || []);
      setAttendanceHistory(res.attendanceHistory || []);
    }
    
    // 심방 기록 (ADMIN 권한 체크됨)
    const notesRes = await fetchPastoralNotesAction(id);
    if (notesRes.success) {
      setNotes(notesRes.data || []);
      setCanViewNotes(true);
    } else {
      setCanViewNotes(false); // 권한 없음
    }
    
    setLoading(false);
  };

  const handleAddNote = async (formData: FormData) => {
    setIsSubmitting(true);
    formData.append('member_id', id);
    const res = await addPastoralNoteAction(formData);
    if (res.success) {
      toast.success('기록이 추가되었습니다.');
      // 폼 초기화는 리액트 폼 트릭이나 ref 사용, 여기선 단순 로드 리프레시
      const form = document.getElementById('note-form') as HTMLFormElement;
      if (form) form.reset();
      loadData();
    } else {
      toast.error('추가 실패: ' + res.error);
    }
    setIsSubmitting(false);
  };

  if (loading) return <div className="text-center py-20 text-cyan-400 font-bold">로딩 중...</div>;
  if (!member) return <div className="text-center py-20 text-red-400">데이터를 찾을 수 없습니다.</div>;

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6 pb-20">
      <header className="flex items-center justify-between game-header p-4 rounded-xl">
        <h1 className="text-2xl font-extrabold text-neon-cyan flex items-center gap-2">
          👤 {member.name} 님의 프로필
        </h1>
        <Link href="/members">
          <Button variant="outline" className="border-[#363e60] text-gray-400 hover:text-white">목록으로</Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* 왼쪽: 기본 인적사항 & 출석 정보 */}
        <div className="md:col-span-1 space-y-6">
          <Card className="game-card border-cyan-500/30">
            <CardHeader className="pb-2 border-b border-[#2a2d3e]">
              <CardTitle className="text-lg text-gray-100">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm text-gray-300">
              <div className="flex justify-between">
                <span className="text-gray-500">성별</span>
                <span className="font-bold">{member.gender === 'M' ? '형제' : '자매'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">생년월일</span>
                <span className="font-bold">{member.birth_date || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">연락처</span>
                <span className="font-bold">{member.phone || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">현재 상태</span>
                <span className="font-bold text-neon-yellow">
                  {member.status === 'active' ? '활동' : member.status === 'warning' ? '확인요망' : member.status === 'long_absent' ? '장기결석' : member.status === 'away' ? '이탈' : '비활동'}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#363e60] pt-2 mt-2">
                <span className="text-gray-500">현재 소속 셀</span>
                <span className="font-bold text-cyan-400">
                  {member.cell_members && member.cell_members.length > 0 ? member.cell_members[0].cells?.name : '없음'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="game-card">
            <CardHeader className="pb-2 border-b border-[#2a2d3e]">
              <CardTitle className="text-lg text-gray-100">최근 출석 기록 (10주)</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {attendanceHistory.length === 0 ? (
                <p className="text-xs text-gray-500 text-center">출석 기록이 없습니다.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {attendanceHistory.map(att => (
                    <span key={att.date} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded border border-emerald-500/30">
                      {att.date}
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="game-card">
            <CardHeader className="pb-2 border-b border-[#2a2d3e]">
              <CardTitle className="text-lg text-gray-100">과거 소속 셀 이력</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {cellHistory.length === 0 ? (
                <p className="text-xs text-gray-500 text-center">셀 편성 이력이 없습니다.</p>
              ) : (
                cellHistory.map((hist, idx) => (
                  <div key={idx} className="flex flex-col border-l-2 border-cyan-500/50 pl-3">
                    <span className="text-xs text-gray-500">{hist.cells?.semester}</span>
                    <span className="text-sm font-bold text-gray-200">{hist.cells?.name}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* 오른쪽: 심방/상담 기록 (ADMIN 전용) */}
        <div className="md:col-span-2">
          <Card className="game-card h-full border-pink-500/20 bg-[#1a1b2d]">
            <CardHeader className="pb-2 border-b border-[#2a2d3e]">
              <CardTitle className="text-lg flex items-center gap-2 text-pink-400">
                <span>📝</span> 교역자 심방/상담 기록
                {canViewNotes && <span className="text-[10px] bg-pink-500/20 px-2 py-0.5 rounded text-pink-300 font-normal">ADMIN Only</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex flex-col h-[600px]">
              {!canViewNotes ? (
                <div className="flex-1 flex items-center justify-center text-center p-6 border-dashed border-[#363e60] rounded-xl">
                  <div>
                    <div className="text-4xl mb-3">🔒</div>
                    <p className="text-gray-400 font-bold">권한이 없습니다.</p>
                    <p className="text-xs text-gray-500 mt-1">심방 기록은 최고 관리자(ADMIN)만 열람할 수 있습니다.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                    {notes.length === 0 ? (
                      <div className="text-center py-20 text-gray-500 text-sm">아직 작성된 심방 기록이 없습니다.</div>
                    ) : (
                      notes.map(note => (
                        <div key={note.id} className="bg-[#252b43] p-4 rounded-xl border border-[#363e60] relative group">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded">
                              {note.author_role}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(note.created_at).toLocaleString('ko-KR')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                  
                  {/* 입력 폼 */}
                  <form id="note-form" action={handleAddNote} className="mt-4 pt-4 border-t border-[#2a2d3e] flex gap-2">
                    <Textarea 
                      name="content"
                      required
                      placeholder="새로운 심방/상담 내용을 기록하세요..." 
                      className="bg-[#0d0f1a] border-[#363e60] text-gray-100 min-h-[80px] resize-none"
                    />
                    <Button disabled={isSubmitting} type="submit" className="h-auto bg-gradient-to-t from-pink-600 to-pink-500 text-white font-bold w-20">
                      {isSubmitting ? '...' : '저장'}
                    </Button>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
