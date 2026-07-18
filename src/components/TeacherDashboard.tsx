import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { AssessmentResult } from '../types';
import { subscribeToAssessments, deleteAssessment } from '../db';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Search, Filter, BarChart3, Users, Trash2, X, Download, Printer } from 'lucide-react';
import ResultDashboard from './ResultDashboard';
import { getCareerRecommendations } from '../data';
import { students } from '../studentData';

interface Props {
  onBack: () => void;
}

export default function TeacherDashboard({ onBack }: Props) {
  const [results, setResults] = useState<AssessmentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRoom, setFilterRoom] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedResult, setSelectedResult] = useState<AssessmentResult | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAssessments((data) => {
      setResults(data.sort((a, b) => b.timestamp - a.timestamp));
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);


  const exportToCSV = () => {
    const headers = ['รหัสนักเรียน', 'ชื่อ', 'นามสกุล', 'ชั้น', 'เลขที่', 'RIASEC เด่น', 'DPT เด่น', 'ความมั่นใจ(%)', 'วันที่'];
    
    const rows = filteredResults.map(r => {
      const recommendations = getCareerRecommendations(r.part1Score);
      const sortedDpt = Object.entries(r.part2Score).sort((a, b) => (b[1] as number) - (a[1] as number));
      const date = new Date(r.timestamp).toLocaleString('th-TH');
      return [
        r.student.studentNumber, // could use ID if available, but using number here
        r.student.firstName,
        r.student.lastName,
        r.student.room,
        r.student.studentNumber,
        recommendations.type,
        sortedDpt[0][0],
        r.part3ConsistencyPercentage,
        date
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  
  const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-teacher-content');
    if (!element) return;
    
    // Save original styles
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    
    // Force a specific wide width for PDF generation to ensure it looks good (desktop view)
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    element.style.width = '1200px';
    element.style.maxWidth = '1200px';
    
    // We need a small delay to let the browser re-render the layout
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#F8FAFC', // slate-50
        pixelRatio: 2,
        width: 1200,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '1200px'
        },
        filter: (node: any) => {
          if (node.hasAttribute && node.hasAttribute('data-hide-print')) {
            return false;
          }
          if (node.classList && typeof node.classList.contains === 'function' && node.classList.contains('print:hidden')) {
            return false;
          }
          return true;
        }
      });
      
      const tempPdf = new jsPDF();
      const imgProps = tempPdf.getImageProperties(dataUrl);
      
      const pdf = new jsPDF({
        orientation: imgProps.width > imgProps.height ? 'l' : 'p',
        unit: 'px',
        format: [imgProps.width, imgProps.height]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgProps.width, imgProps.height);
      
      pdf.save(`รายงานสรุป_${Date.now()}.pdf`);
    } catch (err) {
      console.error('Error generating PDF', err);
      alert('เกิดข้อผิดพลาดในการสร้าง PDF');
    } finally {
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
    }
  };

  const confirmDelete = async (id: string) => {
    if (deletePassword !== "112003") {
      alert("รหัสผ่านไม่ถูกต้อง");
      setDeletingId(null);
      setDeletePassword('');
      return;
    }

    try {
      await deleteAssessment(id);
      setDeletingId(null);
      setDeletePassword('');
    } catch (e) {
      console.error("Failed to delete assessment:", e);
      alert("ไม่สามารถลบข้อมูลได้ โปรดลองใหม่อีกครั้ง");
    }
  };


  const rooms = Array.from(new Set(results.filter(r => r && r.student).map(r => r.student.room))).sort();

  const filteredResults = results.filter(r => {
    if (!r || !r.student || !r.part1Score || !r.part2Score) return false;
    const matchRoom = filterRoom === 'all' || r.student.room === filterRoom;
    const firstName = r.student.firstName || '';
    const lastName = r.student.lastName || '';
    const matchSearch = `${firstName} ${lastName}`.toLowerCase().includes(search.toLowerCase());
    return matchRoom && matchSearch;
  });

  const avgConsistency = filteredResults.length > 0 
    ? Math.round(filteredResults.reduce((acc, r) => acc + (r.part3ConsistencyPercentage || 0), 0) / filteredResults.length)
    : 0;

  // Aggregate Top Holland Code (RIASEC)
  const hollandCounts: Record<string, number> = {};
  filteredResults.forEach(r => {
    const type = getCareerRecommendations(r.part1Score).type;
    hollandCounts[type] = (hollandCounts[type] || 0) + 1;
  });
  const topHolland = Object.entries(hollandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const totalStudents = students.length;
  const totalCompleted = results.length;
  const totalCompletionPercent = totalStudents > 0 ? Math.round((totalCompleted / totalStudents) * 100) : 0;

  const currentRoomStudents = filterRoom === 'all' ? totalStudents : students.filter(s => s.room === filterRoom).length;
  const currentRoomCompleted = filteredResults.length;
  const roomCompletionPercent = currentRoomStudents > 0 ? Math.round((currentRoomCompleted / currentRoomStudents) * 100) : 0;

  const roomStats = rooms.map(room => {
    const total = students.filter(s => s.room === room).length;
    const completed = results.filter(r => r.student.room === room).length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { room, total, completed, percent };
  });

  if (selectedResult) {
    return (
      <ResultDashboard 
        result={selectedResult} 
        onRestart={() => setSelectedResult(null)} 
        isTeacherView={true} 
      />
    );
  }

  return (
    <div className="min-h-screen print:h-auto print:bg-white bg-slate-50 text-slate-900 pb-12 animate-in fade-in duration-300 font-sans" id="pdf-teacher-content">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0 print:hidden" data-hide-print="true">
        <div className="flex items-center gap-2 md:gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500 hover:text-slate-800">
            <ArrowLeft size={20} />
          </button>
          <div className="hidden sm:flex w-8 h-8 bg-white rounded-lg items-center justify-center shrink-0 overflow-hidden p-0.5 border border-slate-200">
            <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| ระบบจัดการสำหรับครู</span></h1>
        </div>
        <div className="flex items-center gap-2 py-1" data-hide-print="true">
          <button onClick={handleDownloadPdf} className="flex items-center gap-2 bg-slate-50 text-slate-700 px-3 py-1.5 rounded-full border border-slate-200 hover:bg-slate-100 font-medium text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0">
            <Printer size={14} className="shrink-0" />
            <span>พิมพ์ / PDF</span>
          </button>
          <button onClick={exportToCSV} className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full border border-emerald-200 hover:bg-emerald-100 font-medium text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0">
            <Download size={14} className="shrink-0" />
            <span>ส่งออก CSV</span>
          </button>
          <div className="flex items-center gap-2 bg-indigo-50 px-3 md:px-4 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:text-sm shrink-0 print:hidden whitespace-nowrap">
            <Users size={14} className="shrink-0" />
            <span>ทั้งหมด: {results.length} คน</span>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-indigo-100 transition-colors">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0"><Users size={28} /></div>
            <div className="flex-1">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">
                ความคืบหน้า ({filterRoom === 'all' ? 'ทั้งโรงเรียน' : filterRoom})
              </p>
              <div className="flex items-end gap-3">
                <p className="text-3xl font-bold text-slate-800">{currentRoomCompleted} <span className="text-lg text-slate-400 font-medium">/ {currentRoomStudents}</span></p>
                <p className="text-sm font-bold text-indigo-600 mb-1">{roomCompletionPercent}%</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${roomCompletionPercent}%` }}></div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-indigo-100 transition-colors">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0"><BarChart3 size={28} /></div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">ความแน่วแน่เฉลี่ย</p>
              <p className="text-3xl font-bold text-slate-800">{avgConsistency}%</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-indigo-100 transition-colors">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center shrink-0"><BarChart3 size={28} /></div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">บุคลิกภาพที่พบมากสุด</p>
              <p className="text-3xl font-bold text-slate-800">{topHolland}</p>
            </div>
          </div>
        </div>

        {/* Room Stats */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4">ความคืบหน้าแต่ละห้อง</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {roomStats.map(stat => (
              <div key={stat.room} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-700">{stat.room}</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{stat.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${stat.percent}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 text-right">{stat.completed} / {stat.total} คน</p>
              </div>
            ))}
          </div>
        </div>
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-100">
              <Filter size={18} className="text-slate-400" />
            </div>
            <select
              value={filterRoom}
              onChange={e => setFilterRoom(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 font-medium text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full md:w-48 px-4 py-2.5 outline-none"
            >
              <option value="all">ทุกห้องเรียน</option>
              {rooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search size={18} className="text-slate-400" />
            </div>
            <input
              type="text"
              className="bg-slate-50 border border-slate-200 text-slate-900 font-medium text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-11 p-2.5 outline-none"
              placeholder="ค้นหาชื่อ - นามสกุล..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 font-bold tracking-wider">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-5">ห้อง / เลขที่</th>
                  <th className="px-6 py-5">ชื่อ - นามสกุล</th>
                  <th className="px-6 py-5">บุคลิกภาพ (RIASEC)</th>
                  <th className="px-6 py-5">ความถนัด (D-P-T)</th>
                  <th className="px-6 py-5">ความแน่วแน่</th>
                  <th className="px-6 py-5">เวลาที่ทำเสร็จ</th>
                  <th className="px-6 py-5">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-medium">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredResults.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-medium">ไม่พบข้อมูล</td></tr>
                ) : (
                  filteredResults.map(r => (
                    <tr key={r.id} onClick={() => setSelectedResult(r)} className="bg-white hover:bg-slate-50 transition-colors cursor-pointer">
                      <td className="px-6 py-4 font-bold text-slate-700">
                        {r.student.room} <span className="text-slate-300 mx-1">/</span> {r.student.studentNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800">
                        {r.student.firstName} {r.student.lastName}
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold px-3 py-1 rounded-lg">
                          {getCareerRecommendations(r.part1Score).type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex flex-col"><span className="text-slate-400 font-bold text-[10px]">D</span><span className="font-bold text-slate-700">{r.part2Score.D}</span></div>
                          <div className="flex flex-col"><span className="text-slate-400 font-bold text-[10px]">P</span><span className="font-bold text-slate-700">{r.part2Score.P}</span></div>
                          <div className="flex flex-col"><span className="text-slate-400 font-bold text-[10px]">T</span><span className="font-bold text-slate-700">{r.part2Score.T}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "font-bold px-3 py-1 rounded-lg text-xs",
                          r.part3ConsistencyPercentage >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                          r.part3ConsistencyPercentage >= 26 ? "bg-yellow-50 text-yellow-700 border border-yellow-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                          {r.part3ConsistencyPercentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400">
                        {new Date(r.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4">
                        {deletingId === r.id ? (
                          <div className="flex flex-col gap-1 items-start">
                            <input
                              type="password"
                              placeholder="รหัสผ่าน"
                              value={deletePassword}
                              onChange={(e) => setDeletePassword(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs border rounded px-2 py-1 w-24 focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            <div className="flex items-center gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); confirmDelete(r.id); }}
                                className="text-xs bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded font-bold"
                              >
                                ยืนยัน
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeletingId(null); setDeletePassword(''); }}
                                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-2 py-1 rounded font-bold"
                              >
                                ยกเลิก
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(r.id);
                            }}
                            className="p-2 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-lg transition-colors border border-red-100"
                            title="ลบข้อมูล"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
