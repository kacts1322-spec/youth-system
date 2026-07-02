'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchMembersAction, addMemberAction, uploadExcelAction, updateMemberFieldAction } from './actions';
import { toast } from 'sonner';

const CELL_COLORS = [
  "text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
  "text-pink-400 bg-pink-500/10 border-pink-500/30",
  "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
  "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  "text-purple-400 bg-purple-500/10 border-purple-500/30",
  "text-orange-400 bg-orange-500/10 border-orange-500/30",
  "text-blue-400 bg-blue-500/10 border-blue-500/30",
  "text-rose-400 bg-rose-500/10 border-rose-500/30",
];

const getCellColor = (cellName: string) => {
  if (!cellName) return "text-gray-500 bg-gray-500/10 border-gray-500/20";
  let hash = 0;
  for (let i = 0; i < cellName.length; i++) {
    hash = cellName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CELL_COLORS[Math.abs(hash) % CELL_COLORS.length];
};

// 인라인 에디팅 컴포넌트
function EditableCell({ value, onSave, type = "text", placeholder = "", options = [] }: any) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value || '');

  useEffect(() => { setCurrentValue(value || ''); }, [value]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentValue !== (value || '')) {
      onSave(currentValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      if (currentValue !== (value || '')) {
        onSave(currentValue);
      }
    }
    if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value || '');
    }
  };

  if (!isEditing) {
    // Select 렌더링
    if (type === 'select') {
      const label = options.find((o: any) => o.value === value)?.label || value;
      return (
        <div 
          onClick={() => setIsEditing(true)} 
          className="min-h-[24px] cursor-pointer hover:bg-[#363e60] p-1 rounded transition-colors text-center"
        >
          {label || <span className="text-gray-600 italic">{placeholder || '클릭하여 입력'}</span>}
        </div>
      );
    }
    // 일반 텍스트 렌더링
    return (
      <div 
        onClick={() => setIsEditing(true)} 
        className="min-h-[24px] cursor-pointer hover:bg-[#363e60] p-1 rounded transition-colors"
      >
        {value || <span className="text-gray-600 italic">{placeholder || '클릭하여 입력'}</span>}
      </div>
    );
  }

  if (type === 'select') {
    return (
      <Select 
        defaultValue={currentValue} 
        onValueChange={(val) => {
          setCurrentValue(val);
          setIsEditing(false);
          if (val !== (value || '')) onSave(val);
        }}
        open={true}
        onOpenChange={(open) => {
          if (!open) handleBlur();
        }}
      >
        <SelectTrigger className="h-8 text-xs p-1 m-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt: any) => (
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Input
      autoFocus
      type={type}
      className="h-8 text-xs p-1 m-0 w-full min-w-[80px] bg-[#1e2235] border-[#363e60] text-gray-100"
      value={currentValue}
      onChange={(e) => setCurrentValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
    />
  );
}

export default function MembersPage() {
  const [members, setMembers] = useState<any[]>([]);
  const [previewMembers, setPreviewMembers] = useState<any[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState('name'); // name, birth_date, gender
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMembers = async () => {
    const res = await fetchMembersAction();
    if (res.success && res.data) {
      setMembers(res.data);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  // 정렬 및 그룹화 로직 적용
  const sortedMembers = [...(isPreviewMode ? previewMembers : members)].sort((a, b) => {
    // 1순위: 이탈자(away)는 항상 맨 밑으로
    const isAwayA = a.status === 'away';
    const isAwayB = b.status === 'away';
    if (isAwayA && !isAwayB) return 1;
    if (!isAwayA && isAwayB) return -1;

    // 2순위: 선택한 정렬 기준
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    if (sortBy === 'birth_date') {
      const d1 = a.birth_date || '9999-12-31';
      const d2 = b.birth_date || '9999-12-31';
      return d1.localeCompare(d2);
    }
    if (sortBy === 'gender') return (a.gender || '').localeCompare(b.gender || '');
    return 0;
  });

  // UI에서 이탈자 분리선을 긋기 위한 인덱스 찾기
  const firstAwayIndex = sortedMembers.findIndex(m => m.status === 'away');

  const handleUpdateField = async (id: string, field: string, value: any) => {
    const originalMembers = [...members];
    // 낙관적 업데이트
    setMembers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    
    const res = await updateMemberFieldAction(id, field, value);
    if (!res.success) {
      toast.error('수정 실패: ' + res.error);
      setMembers(originalMembers); // 롤백
    } else {
      toast.success('수정되었습니다.', { duration: 1500 });
    }
  };

  const handleToggleSwitch = async (id: string, field: string, currentValue: boolean) => {
    const newValue = !currentValue;
    await handleUpdateField(id, field, newValue);
  };

  // 엑셀 날짜 변환 헬퍼 함수
  const parseBirthDate = (val: any) => {
    if (!val) return null;
    if (typeof val === 'number') {
      try {
        const parsed = XLSX.SSF.parse_date_code(val);
        if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
      } catch (e) { return null; }
    }
    if (typeof val === 'string') {
      let str = val.replace(/[\/\.]/g, '-').trim();
      if (str.includes('-00')) return null;
      if (/^\d{6}$/.test(str)) {
        const yy = parseInt(str.substring(0, 2), 10);
        const mm = str.substring(2, 4);
        const dd = str.substring(4, 6);
        const year = yy > 30 ? 1900 + yy : 2000 + yy;
        return `${year}-${mm}-${dd}`;
      }
      const d = new Date(str);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }
    return null;
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{ 이름: "홍길동", 성별: "M", 생년월일: "1999-01-01", 연락처: "010-1234-5678", 상태: "활동", 원거리: "X", 지역: "", 이탈: "X", 비고: "테스트" }]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, "청년부_명단양식.xlsx");
  };

  const handleExportExcel = () => {
    if (sortedMembers.length === 0) return toast.error('출력할 명단이 없습니다.');
    const exportData = sortedMembers.map(m => ({
      이름: m.name,
      성별: m.gender === 'F' ? '자매' : '형제',
      생년월일: m.birth_date || '',
      연락처: m.phone || '',
      소속셀: m.cell_members && m.cell_members.length > 0 ? m.cell_members[0]?.cells?.name : '',
      상태: m.status === 'active' ? '활동' : m.status === 'away' ? '이탈' : m.status === 'warning' ? '확인' : m.status === 'long_absent' ? '장기결석' : '비활동',
      원거리: m.is_distant ? 'O' : 'X',
      지역: m.distant_location || '',
      이탈: m.is_away ? 'O' : 'X',
      비고: m.note || ''
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "명단");
    XLSX.writeFile(wb, "청년부_명단.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const parsedData = data.map((row: any) => {
        let rawGender = String(row['성별'] || row['gender'] || 'M').trim();
        let gender = (rawGender === '자매' || rawGender.toUpperCase() === 'F') ? 'F' : 'M';

        return {
          name: String(row['이름'] || row['name'] || '').trim(),
          gender,
          birth_date: parseBirthDate(row['생년월일'] || row['birth_date']),
          phone: row['연락처'] || row['phone'] ? String(row['연락처'] || row['phone']).trim() : null,
          note: row['비고'] || row['note'] || null,
          status: 'active'
        };
      }).filter(row => row.name);

      setPreviewMembers(parsedData);
      setIsPreviewMode(true);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSavePreview = async () => {
    toast('저장 중입니다...');
    const res = await uploadExcelAction(previewMembers);
    if (res.success) {
      toast.success('엑셀 명단이 성공적으로 업로드되었습니다.');
      setIsPreviewMode(false);
      loadMembers();
    } else {
      toast.error('업로드 실패: ' + res.error);
    }
  };

  const handleAddSubmit = async (formData: FormData) => {
    const res = await addMemberAction(formData);
    if (res.success) {
      toast.success('청년이 성공적으로 추가되었습니다.');
      setIsAddModalOpen(false);
      loadMembers();
    } else {
      toast.error('추가 실패: ' + res.error);
    }
  };

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-4 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold text-neon-cyan">📋 명단 관리</h1>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v || '')}>
            <SelectTrigger className="w-[140px] bg-[#252b43] border-[#363e60] text-gray-300"><SelectValue placeholder="정렬 기준" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="name">가나다순</SelectItem>
              <SelectItem value="birth_date">생년월일순</SelectItem>
              <SelectItem value="status">상태별</SelectItem>
            </SelectContent>
          </Select>
          <Link href="/dashboard"><Button variant="outline" size="sm" className="border-[#363e60] text-gray-400 hover:text-white hover:border-cyan-500/50">🏠 대시보드</Button></Link>
        </div>
      </header>

      {/* 컨트롤 영역 */}
      {!isPreviewMode ? (
        <div className="flex flex-wrap items-center justify-between gap-3 game-card p-3">
          <div className="text-sm text-gray-500 font-medium px-2">항목을 클릭하면 바로 수정됩니다.</div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="border-[#363e60] text-gray-400 hover:text-white hover:border-cyan-500/50 hover:scale-105 transition-all" onClick={handleDownloadTemplate}>📄 양식</Button>
            <Button variant="secondary" className="bg-[#1e2940] text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 hover:scale-105 transition-all" onClick={() => fileInputRef.current?.click()}>📤 엑셀 업로드</Button>
            <input type="file" accept=".xlsx, .xls" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
            <Button variant="outline" className="border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:scale-105 transition-all" onClick={handleExportExcel}>📥 엑셀 다운</Button>
            
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
              <DialogTrigger>
                <Button className="bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/20 w-full sm:w-auto h-10">➕ 추가하기</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] game-card border-[#363e60]">
                <form action={handleAddSubmit}>
                  <DialogHeader><DialogTitle className="text-gray-100">새 청년 추가</DialogTitle></DialogHeader>
                  <div className="grid gap-3 py-4">
                    <div className="grid gap-1"><Label className="text-gray-400">이름 *</Label><Input name="name" className="bg-[#1e2235] border-[#363e60] text-gray-100" required /></div>
                    <div className="grid gap-1"><Label className="text-gray-400">성별 *</Label>
                      <Select name="gender" defaultValue="M">
                        <SelectTrigger className="bg-[#1e2235] border-[#363e60] text-gray-100"><SelectValue/></SelectTrigger>
                        <SelectContent><SelectItem value="M">형제(M)</SelectItem><SelectItem value="F">자매(F)</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1"><Label className="text-gray-400">생년월일</Label><Input name="birth_date" type="date" className="bg-[#1e2235] border-[#363e60] text-gray-100" /></div>
                    <div className="grid gap-1"><Label className="text-gray-400">연락처</Label><Input name="phone" placeholder="010-0000-0000" className="bg-[#1e2235] border-[#363e60] text-gray-100" /></div>
                  </div>
                  <DialogFooter><Button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white">저장하기</Button></DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between game-card border-cyan-500/30 p-3">
          <p className="text-sm text-cyan-400 font-medium px-2">총 {previewMembers.length}명의 데이터가 파싱되었습니다.</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="border-[#363e60] text-gray-400" onClick={() => setIsPreviewMode(false)}>취소</Button>
            <Button size="sm" onClick={handleSavePreview} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">DB에 저장</Button>
          </div>
        </div>
      )}

      {/* 테이블 영역 */}
      <Card className="game-card overflow-hidden">
        <div className="overflow-x-auto w-full">
          <Table className="min-w-[1200px] text-sm">
            <TableHeader className="bg-[#1e2235]">
              <TableRow className="border-b border-[#363e60]">
                <TableHead className="w-[80px] text-center sticky left-0 bg-[#1e2235] z-10 border-r border-[#363e60] text-cyan-400 font-bold">이름</TableHead>
                <TableHead className="w-[80px] text-center text-gray-400">성별</TableHead>
                <TableHead className="w-[120px] text-center text-gray-400">생년월일</TableHead>
                <TableHead className="w-[140px] text-center text-gray-400">연락처</TableHead>
                <TableHead className="w-[120px] text-center text-gray-400">소속셀</TableHead>
                <TableHead className="w-[120px] text-center text-gray-400">상태</TableHead>
                <TableHead className="w-[100px] text-center text-gray-400">원거리</TableHead>
                <TableHead className="w-[120px] text-center text-gray-400">지역</TableHead>
                <TableHead className="w-[100px] text-center text-gray-400">이탈</TableHead>
                <TableHead className="w-[200px] text-gray-400">비고</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedMembers.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-16 text-gray-600 font-bold text-lg">🫥 아직 등록된 청년이 없어요!</TableCell></TableRow>
              ) : (
                sortedMembers.map((member, i) => {
                  const isAwayDivider = firstAwayIndex !== -1 && i === firstAwayIndex;
                  // 상태별 이모지 매핑
                  const statusEmoji = member.status === 'active' ? '🌟' : member.status === 'warning' ? '💕' : member.status === 'long_absent' ? '👻' : member.status === 'away' ? '✈️' : '😴';
                  return (
                    <React.Fragment key={member.id || i}>
                      {isAwayDivider && (
                        <TableRow className="border-0 hover:bg-transparent">
                          <TableCell colSpan={10} className="p-4">
                            <div className="flex items-center justify-center gap-3 bg-[#252b43] border border-[#363e60] rounded-full py-3 px-6 max-w-md mx-auto">
                              <span className="text-xl">✈️</span>
                              <span className="font-extrabold text-gray-400 tracking-wider text-sm">이탈 (유학/군대) 명단</span>
                              <span className="text-xl">✈️</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                      <TableRow className={`border-b border-[#363e60] bg-[#252b43] even:bg-[#2a314d] hover:bg-[#303858] transition-colors ${member.status === 'away' ? 'opacity-60' : ''}`}>
                        <TableCell className="text-center font-bold sticky left-0 bg-[#252b43] z-10 border-r border-[#363e60] text-gray-100 group">
                          {isPreviewMode ? member.name : (
                            <div className="flex items-center justify-center gap-2">
                              <EditableCell value={member.name} onSave={(val: any) => handleUpdateField(member.id, 'name', val)} />
                              <Link href={`/members/${member.id}`} className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/50 cursor-pointer">프로필 ↗</span>
                              </Link>
                            </div>
                          )}
                        </TableCell>
                    <TableCell className="text-center">
                      {isPreviewMode ? (member.gender === 'M' ? '형제' : '자매') : (
                        <EditableCell type="select" options={[{label: '형제', value: 'M'}, {label: '자매', value: 'F'}]} value={member.gender} onSave={(val: any) => handleUpdateField(member.id, 'gender', val)} />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPreviewMode ? member.birth_date : (
                        <EditableCell type="date" value={member.birth_date} onSave={(val: any) => handleUpdateField(member.id, 'birth_date', val)} placeholder="-" />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPreviewMode ? member.phone : (
                        <EditableCell value={member.phone} onSave={(val: any) => handleUpdateField(member.id, 'phone', val)} placeholder="-" />
                      )}
                    </TableCell>
                    <TableCell className="text-center border-l border-[#363e60]">
                      {(() => {
                        const cellName = member.cell_members && member.cell_members.length > 0 ? member.cell_members[0]?.cells?.name : null;
                        const colorClass = getCellColor(cellName);
                        return (
                          <span className={`px-2 py-1 rounded font-bold text-xs border ${colorClass} transition-colors whitespace-nowrap`}>
                            {cellName || '-'}
                          </span>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-center border-l border-[#363e60]">
                      {isPreviewMode ? member.status : (
                        <div className="flex justify-center items-center gap-1 h-full">
                          <EditableCell type="select" options={[{label: '🌟 활동', value: 'active'}, {label: '💕 확인', value: 'warning'}, {label: '👻 장기결석', value: 'long_absent'}, {label: '✈️ 이탈', value: 'away'}, {label: '😴 비활동', value: 'inactive'}]} value={member.status} onSave={(val: any) => handleUpdateField(member.id, 'status', val)} />
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPreviewMode ? (member.is_distant ? 'Y' : 'N') : (
                        <Switch checked={member.is_distant} onCheckedChange={() => handleToggleSwitch(member.id, 'is_distant', member.is_distant)} />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPreviewMode ? member.distant_location : (
                        <EditableCell value={member.distant_location} onSave={(val: any) => handleUpdateField(member.id, 'distant_location', val)} placeholder={member.is_distant ? "지역 입력" : "-"} />
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {isPreviewMode ? (member.is_away ? 'Y' : 'N') : (
                        <Switch checked={member.is_away} onCheckedChange={(checked) => {
                          handleUpdateField(member.id, 'is_away', checked);
                          handleUpdateField(member.id, 'status', checked ? 'away' : 'active');
                        }} />
                      )}
                    </TableCell>
                    <TableCell className="border-l border-[#363e60]">
                      {isPreviewMode ? member.note : (
                        <EditableCell value={member.note} onSave={(val: any) => handleUpdateField(member.id, 'note', val)} placeholder="비고 입력..." />
                      )}
                    </TableCell>
                  </TableRow>
                  </React.Fragment>
                );
              })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
