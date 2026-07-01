'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { fetchReportsAction } from './actions';
import { toast } from 'sonner';

export default function ReportsDashboardPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>('all');

  const loadReports = async () => {
    setLoading(true);
    const res = await fetchReportsAction();
    if (res.success) {
      setReports(res.data || []);
    } else {
      toast.error('보고서 목록을 불러오지 못했습니다.');
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReports();
  }, []);

  // 추출 가능한 고유 모임 날짜들
  const uniqueDates = Array.from(new Set(reports.map(r => r.meeting_date))).sort((a, b) => b.localeCompare(a));

  const filteredReports = selectedDate === 'all' 
    ? reports 
    : reports.filter(r => r.meeting_date === selectedDate);

  return (
    <div className="p-4 max-w-[1400px] mx-auto space-y-6 pb-20">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 game-header rounded-2xl p-4">
        <div>
          <h1 className="text-2xl font-extrabold text-neon-cyan">📊 셀리더 주간 보고서 모아보기</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">
            엑셀 형식으로 주간 보고서를 한눈에 파악하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReports} variant="outline" size="sm" className="bg-[#1e2235] border-[#2a2d3e] text-cyan-400 hover:bg-cyan-500/10">🔄 새로고침</Button>
          <Link href="/dashboard">
            <Button variant="outline" size="sm" className="border-[#2a2d3e] text-gray-400 hover:text-white hover:border-cyan-500/50 transition-all">🏠 대시보드</Button>
          </Link>
        </div>
      </header>

      <Card className="game-card border-cyan-500/30 overflow-hidden">
        <div className="p-4 bg-[#141627] border-b border-[#2a2d3e] flex items-center gap-4">
          <span className="text-gray-300 font-bold">주차(날짜) 선택:</span>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[200px] bg-[#0d0f1a] border-[#363e60] text-cyan-400 font-bold">
              {selectedDate === 'all' ? '전체 보기' : selectedDate}
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 보기</SelectItem>
              {uniqueDates.map(date => (
                <SelectItem key={date} value={date}>{date}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-gray-500 ml-auto">총 {filteredReports.length}건</span>
        </div>

        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-20 text-gray-500">로딩 중...</div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-20 text-gray-500">
              해당 주차에 제출된 보고서가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1200px] text-sm">
                <TableHeader className="bg-[#1e2235]">
                  <TableRow className="border-b border-[#363e60]">
                    <TableHead className="w-[120px] text-center text-cyan-400 font-bold">모임 날짜</TableHead>
                    <TableHead className="w-[120px] text-center text-gray-400">셀 이름</TableHead>
                    <TableHead className="w-[100px] text-center text-gray-400">리더</TableHead>
                    <TableHead className="w-[80px] text-center text-gray-400">참석</TableHead>
                    <TableHead className="w-[300px] text-gray-400">나눔 내용</TableHead>
                    <TableHead className="w-[250px] text-gray-400">기도 제목</TableHead>
                    <TableHead className="w-[200px] text-gray-400">특이사항 (출석 등)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => (
                    <TableRow key={report.id} className="border-b border-[#363e60] bg-[#252b43] even:bg-[#2a314d] hover:bg-[#303858] transition-colors">
                      <TableCell className="text-center font-semibold text-gray-300">
                        {report.meeting_date}
                      </TableCell>
                      <TableCell className="text-center font-bold text-gray-100">
                        {report.cells?.name || '-'}
                      </TableCell>
                      <TableCell className="text-center text-neon-yellow">
                        {report.cells?.leader?.name || '미정'}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded font-bold">
                          {report.attendees_count}명
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap leading-relaxed text-gray-300">
                        {report.content}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap leading-relaxed text-pink-300">
                        {report.prayer_requests || '-'}
                      </TableCell>
                      <TableCell className="whitespace-pre-wrap leading-relaxed text-orange-300 border-l border-[#363e60]">
                        {report.note || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
