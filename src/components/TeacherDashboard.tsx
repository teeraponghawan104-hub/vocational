import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { AssessmentResult } from '../types';
import { subscribeToAssessments, deleteAssessment } from '../db';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { ArrowLeft, Search, Filter, BarChart3, Users, Trash2, X, Download, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, PieChart, Pie } from 'recharts';
import ResultDashboard from './ResultDashboard';
import { getCareerRecommendations, riasecInterpretations } from '../data';
import { students, rooms } from '../studentData';

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
  const [showPrintWarning, setShowPrintWarning] = useState(false);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeToAssessments((data, err) => {
      if (err) {
        console.warn("Teacher dashboard received error:", err);
      }
      setResults([...data].sort((a, b) => b.timestamp - a.timestamp));
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
      
      const studentRecord = students.find(s => s.room === r.student.room && s.number === r.student.studentNumber);
      const studentId = studentRecord ? studentRecord.studentId : '-';

      return [
        studentId,
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
    
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    element.style.width = '1000px';
    element.style.maxWidth = '1000px';
    
    window.dispatchEvent(new Event('resize'));
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
        style: { transform: 'scale(1)', transformOrigin: 'top left', width: '1000px' },
        filter: (node: any) => {
          if (node.hasAttribute && node.hasAttribute('data-hide-print')) return false;
          if (node.classList && typeof node.classList.contains === 'function' && node.classList.contains('print:hidden')) return false;
          return true;
        }
      });
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgWidth = 210;
      const pageHeight = 297;
      
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const imgHeight = (img.height * imgWidth) / img.width;
      let heightLeft = imgHeight;
      let position = 0;

      // First page
      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;

      // Additional pages if needed (safety threshold 8mm to avoid trailing empty page)
      while (heightLeft > 8) {
        position = -(imgHeight - heightLeft);
        pdf.addPage('a4', 'portrait');
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pageHeight;
      }

      pdf.save(`รายงานภาพรวมครู_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.pdf`);
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

  // Aggregate Holland Code (RIASEC)
  const hollandCounts: Record<string, number> = { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
  filteredResults.forEach(r => {
    const type = getCareerRecommendations(r.part1Score).type;
    if (type && hollandCounts[type] !== undefined) {
      hollandCounts[type]++;
    }
  });
  const sortedHolland = Object.entries(hollandCounts).sort((a, b) => b[1] - a[1]);
  const hollandChartData = sortedHolland.map(([name, count]) => ({
    name,
    count,
    percentage: filteredResults.length > 0 ? Math.round((count / filteredResults.length) * 100) : 0
  }));
  const topHolland = hollandChartData[0]?.name || '-';
  const topHollandPct = hollandChartData[0]?.percentage || 0;
  const midHollandIdx = Math.floor(hollandChartData.length / 2);
  const midHolland = hollandChartData[midHollandIdx]?.name || '-';
  const midHollandPct = hollandChartData[midHollandIdx]?.percentage || 0;
  const bottomHolland = hollandChartData[hollandChartData.length - 1]?.name || '-';
  const bottomHollandPct = hollandChartData[hollandChartData.length - 1]?.percentage || 0;

  // Aggregate Aptitude (D, P, T)
  const aptitudeCounts: Record<string, number> = { D: 0, P: 0, T: 0 };
  filteredResults.forEach(r => {
    const sortedApt = Object.entries(r.part2Score).sort((a, b) => (b[1] as number) - (a[1] as number));
    const topApt = sortedApt[0]?.[0];
    if (topApt && aptitudeCounts[topApt] !== undefined) {
      aptitudeCounts[topApt]++;
    }
  });
  const sortedAptitude = Object.entries(aptitudeCounts).sort((a, b) => b[1] - a[1]);
  const aptitudeChartData = sortedAptitude.map(([name, count]) => ({
    name,
    count,
    percentage: filteredResults.length > 0 ? Math.round((count / filteredResults.length) * 100) : 0
  }));
  const topAptitude = aptitudeChartData[0]?.name || '-';
  const topAptitudePct = aptitudeChartData[0]?.percentage || 0;
  const midAptitude = aptitudeChartData[1]?.name || '-';
  const midAptitudePct = aptitudeChartData[1]?.percentage || 0;
  const bottomAptitude = aptitudeChartData[2]?.name || '-';
  const bottomAptitudePct = aptitudeChartData[2]?.percentage || 0;

  // Aggregate Confidence
  const confidenceCounts = { high: 0, medium: 0, low: 0 };
  filteredResults.forEach(r => {
    if (r.part3ConsistencyPercentage >= 75) confidenceCounts.high++;
    else if (r.part3ConsistencyPercentage >= 26) confidenceCounts.medium++;
    else confidenceCounts.low++;
  });
  
  const confidenceChartData = [
    { name: 'มั่นใจสูง (75-100%)', value: confidenceCounts.high, fill: '#10b981' },
    { name: 'มั่นใจปานกลาง (26-74%)', value: confidenceCounts.medium, fill: '#f59e0b' },
    { name: 'มั่นใจต่ำ (0-25%)', value: confidenceCounts.low, fill: '#ef4444' },
  ].filter(item => item.value > 0);

  const topCareers = sortedHolland.slice(0, 3).map(([type, count]) => {
    const interpretation = riasecInterpretations[type];
    // Take first 3-5 words from careers string
    const careerList = interpretation ? interpretation.careers.split(' ').slice(0, 4).join(', ') : '';
    return {
      type,
      count,
      percentage: filteredResults.length > 0 ? Math.round((count / filteredResults.length) * 100) : 0,
      title: interpretation?.title.split(' ')[0] || type,
      careers: careerList
    };
  });

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
    <div className="min-h-[100dvh] print:h-auto print:bg-white bg-slate-50 text-slate-900 pb-12 animate-in fade-in duration-300 font-sans pb-safe" id="pdf-teacher-content">
      {/* Print Warning Modal */}
      {showPrintWarning && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 print:hidden" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-xl font-bold text-slate-900 mb-2">โหมดพรีวิว</h3>
            <p className="text-slate-600 mb-6 text-sm md:text-base leading-relaxed">
              คุณกำลังใช้งานในโหมดพรีวิว ฟังก์ชันพิมพ์รายงานและบันทึกเป็น PDF จะทำงานได้ดีที่สุดเมื่อเปิดแอปในหน้าต่างใหม่
              <br/><br/>
              กรุณาคลิกปุ่ม <b className="text-slate-800">"Open in New Tab"</b> (ไอคอนลูกศร ↗️ ที่มุมขวาบนของหน้าจอพรีวิวนี้) เพื่อเปิดแอปแบบเต็มจอแล้วกดพิมพ์อีกครั้ง
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => {
                  setShowPrintWarning(false);
                  setTimeout(() => window.print(), 100);
                }}
                className="px-4 py-2 text-slate-500 font-medium hover:bg-slate-100 rounded-lg transition-colors text-sm"
              >
                พิมพ์ในหน้านี้
              </button>
              <button 
                onClick={() => setShowPrintWarning(false)}
                className="px-4 py-2 bg-indigo-600 text-white font-medium hover:bg-indigo-700 rounded-lg transition-colors shadow-sm text-sm"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
      
      <header className="h-auto md:h-16 py-3 md:py-0 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between px-3 sm:px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0 print:hidden gap-2.5 md:gap-0" data-hide-print="true">
        <div className="flex items-center gap-2 md:gap-4 justify-between md:justify-start w-full md:w-auto">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button onClick={onBack} className="inline-flex items-center gap-1.5 p-1.5 px-2.5 sm:px-3 hover:bg-slate-100 rounded-lg transition text-slate-600 hover:text-slate-900 font-medium text-xs sm:text-sm">
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">กลับหน้าหลัก</span>
            </button>
            <div className="hidden sm:flex w-8 h-8 bg-white rounded-lg items-center justify-center shrink-0 overflow-hidden p-0.5 border border-slate-200">
              <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-xs sm:text-sm md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap truncate">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| ระบบจัดการสำหรับครู</span></h1>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs md:hidden shrink-0 print:hidden whitespace-nowrap">
            <Users size={13} className="shrink-0" />
            <span>{results.length} คน</span>
          </div>
        </div>
        <div className="flex items-center justify-between md:justify-end w-full md:w-auto gap-2" data-hide-print="true">
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button onClick={handleDownloadPdf} className="flex items-center justify-center gap-1.5 bg-slate-50 text-slate-700 px-3 md:px-4 py-2 md:py-1.5 rounded-lg md:rounded-full border border-slate-200 hover:bg-slate-100 font-medium text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0">
              <Printer size={14} className="shrink-0" />
              <span>พิมพ์ / PDF</span>
            </button>
            <button onClick={exportToCSV} className="flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 md:px-4 py-2 md:py-1.5 rounded-lg md:rounded-full border border-emerald-100 hover:bg-emerald-100 font-medium text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0">
              <Download size={14} className="shrink-0" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-medium text-xs">
            <Users size={14} />
            <span>{results.length} คน</span>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-3 sm:px-6 mt-4 sm:mt-8 print:mt-2 print:px-0 print:max-w-none">
        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 print:gap-2 print:mb-2 print:grid-cols-4">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-indigo-100 transition-colors print:p-2 print:rounded-lg">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0 print:w-10 print:h-10 print:rounded-lg"><Users size={28} className="print:w-5 print:h-5" /></div>
            <div className="flex-1">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 print:text-[10px]">
                ความคืบหน้า ({filterRoom === 'all' ? 'ทั้งโรงเรียน' : filterRoom})
              </p>
              <div className="flex items-end gap-3 print:gap-2">
                <p className="text-3xl font-bold text-slate-800 print:text-xl">{currentRoomCompleted} <span className="text-lg text-slate-400 font-medium print:text-sm">/ {currentRoomStudents}</span></p>
                <p className="text-sm font-bold text-indigo-600 mb-1 print:text-xs print:mb-0">{roomCompletionPercent}%</p>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden print:mt-1">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${roomCompletionPercent}%` }}></div>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-5 hover:border-indigo-100 transition-colors print:p-2 print:rounded-lg">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0 print:w-10 print:h-10 print:rounded-lg"><BarChart3 size={28} className="print:w-5 print:h-5" /></div>
            <div>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1 print:text-[10px]">ความมั่นใจเฉลี่ย</p>
              <p className="text-3xl font-bold text-slate-800 print:text-xl">{avgConsistency}%</p>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center hover:border-indigo-100 transition-colors print:p-2 print:rounded-lg">
            <div className="flex items-center gap-3 mb-2 print:gap-1 print:mb-1">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0 print:w-8 print:h-8 print:rounded-lg"><BarChart3 size={20} className="print:w-4 print:h-4" /></div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-tight print:text-[8px]">บุคลิกภาพ<br/>(Holland)</p>
            </div>
            <div className="flex justify-between items-center px-1">
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1 print:mb-0 print:text-[8px]">มากสุด</p>
                  <p className="text-xl font-bold text-emerald-600 flex items-baseline justify-center gap-1 print:text-sm">
                    {topHolland} <span className="text-[10px] font-medium text-slate-400 print:text-[8px]">{topHollandPct}%</span>
                  </p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1 print:mb-0 print:text-[8px]">กลาง</p>
                  <p className="text-xl font-bold text-amber-500 flex items-baseline justify-center gap-1 print:text-sm">
                    {midHolland} <span className="text-[10px] font-medium text-slate-400 print:text-[8px]">{midHollandPct}%</span>
                  </p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1 print:mb-0 print:text-[8px]">น้อยสุด</p>
                  <p className="text-xl font-bold text-rose-500 flex items-baseline justify-center gap-1 print:text-sm">
                    {bottomHolland} <span className="text-[10px] font-medium text-slate-400 print:text-[8px]">{bottomHollandPct}%</span>
                  </p>
               </div>
            </div>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col justify-center hover:border-indigo-100 transition-colors print:p-2 print:rounded-lg">
            <div className="flex items-center gap-3 mb-2 print:gap-1 print:mb-1">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 print:w-8 print:h-8 print:rounded-lg"><BarChart3 size={20} className="print:w-4 print:h-4" /></div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-tight print:text-[8px]">ความถนัด<br/>(Aptitude)</p>
            </div>
            <div className="flex justify-between items-center px-1">
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1 print:mb-0 print:text-[8px]">มากสุด</p>
                  <p className="text-xl font-bold text-emerald-600 flex items-baseline justify-center gap-1 print:text-sm">
                    {topAptitude} <span className="text-[10px] font-medium text-slate-400 print:text-[8px]">{topAptitudePct}%</span>
                  </p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1 print:mb-0 print:text-[8px]">กลาง</p>
                  <p className="text-xl font-bold text-amber-500 flex items-baseline justify-center gap-1 print:text-sm">
                    {midAptitude} <span className="text-[10px] font-medium text-slate-400 print:text-[8px]">{midAptitudePct}%</span>
                  </p>
               </div>
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 mb-1 print:mb-0 print:text-[8px]">น้อยสุด</p>
                  <p className="text-xl font-bold text-rose-500 flex items-baseline justify-center gap-1 print:text-sm">
                    {bottomAptitude} <span className="text-[10px] font-medium text-slate-400 print:text-[8px]">{bottomAptitudePct}%</span>
                  </p>
               </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:gap-2 print:mb-2 print:grid-cols-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:p-3 print:rounded-lg">
             <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 print:mb-1 print:text-[10px]">การกระจายบุคลิกภาพ (Holland)</h2>
             <div className="h-64 sm:h-[300px] w-full max-w-xl mx-auto print:h-48">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={hollandChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                   <Tooltip 
                     cursor={{fill: '#f1f5f9'}}
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                   />
                   <Bar dataKey="percentage" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="เปอร์เซ็นต์ (%)" isAnimationActive={false} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:p-3 print:rounded-lg">
             <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 print:mb-1 print:text-[10px]">การกระจายความถนัด (Aptitude)</h2>
             <div className="h-64 sm:h-[300px] w-full max-w-xl mx-auto print:h-48">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={aptitudeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                   <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                   <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                   <Tooltip 
                     cursor={{fill: '#f1f5f9'}}
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                   />
                   <Bar dataKey="percentage" fill="#f59e0b" radius={[4, 4, 0, 0]} name="เปอร์เซ็นต์ (%)" isAnimationActive={false} />
                 </BarChart>
               </ResponsiveContainer>
             </div>
          </div>
        </div>

        {/* New Trends Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8 print:gap-2 print:mb-2 print:grid-cols-2">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 print:p-3 print:rounded-lg">
             <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 print:mb-2 print:text-[10px]">กลุ่มอาชีพที่เหมาะสมมากที่สุด 3 อันดับแรก</h2>
             <div className="flex flex-col gap-4 print:gap-1.5">
                {topCareers.map((career, idx) => (
                  <div key={idx} className="flex items-start gap-4 print:gap-2">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0 font-bold text-lg print:w-6 print:h-6 print:text-sm print:rounded-md">
                      {idx + 1}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm print:text-xs">{career.title} ({career.type})</h3>
                      <p className="text-xs text-slate-500 mt-1 print:text-[10px] print:mt-0">{career.careers}...</p>
                      <div className="flex items-center gap-2 mt-2 print:mt-1">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[150px]">
                          <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${career.percentage}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 print:text-[8px]">{career.percentage}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {topCareers.length === 0 && (
                  <div className="text-center text-slate-400 text-sm py-8 print:py-2">ยังไม่มีข้อมูล</div>
                )}
             </div>
          </div>
           
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col print:p-3 print:rounded-lg">
             <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 print:mb-1 print:text-[10px]">ระดับความมั่นใจในการตัดสินใจ (ส่วนที่ 3)</h2>
             <div className="h-64 sm:h-[300px] w-full max-w-xs mx-auto flex-1 print:h-48">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     isAnimationActive={false}
                     data={confidenceChartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                     stroke="none"
                   >
                     {confidenceChartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.fill} />
                     ))}
                   </Pie>
                   <Tooltip 
                     contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                     formatter={(value: any) => [`${value} คน`, 'จำนวน']}
                   />
                 </PieChart>
               </ResponsiveContainer>
             </div>
             <div className="flex justify-center gap-4 mt-2 print:gap-2">
                {confidenceChartData.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-2 print:gap-1">
                    <div className="w-3 h-3 rounded-full print:w-2 print:h-2" style={{ backgroundColor: entry.fill }}></div>
                    <span className="text-xs font-medium text-slate-600 print:text-[10px]">{entry.name}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Room Stats */}
        <div className="mb-8 print:mb-2">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest mb-4 print:mb-1 print:text-[10px]">ความคืบหน้าแต่ละห้อง</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 print:gap-1.5 print:grid-cols-4">
            {roomStats.map(stat => (
              <div key={stat.room} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:p-2 print:rounded-lg">
                <div className="flex items-center justify-between mb-2 print:mb-1">
                  <span className="font-bold text-slate-700 print:text-xs">{stat.room}</span>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md print:px-1 print:text-[10px]">{stat.percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2 print:mb-1">
                  <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${stat.percent}%` }}></div>
                </div>
                <p className="text-xs text-slate-500 text-right print:text-[10px]">{stat.completed} / {stat.total} คน</p>
              </div>
            ))}
          </div>
        </div>
        
        <div className="print:hidden"></div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-10 h-10 bg-slate-50 flex items-center justify-center rounded-xl border border-slate-100 shrink-0">
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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden print:hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-slate-500 min-w-[680px]">
              <thead className="text-xs text-slate-400 uppercase bg-slate-50/50 font-bold tracking-wider">
                <tr className="border-b border-slate-200">
                  <th className="px-6 py-5">ห้อง / เลขที่</th>
                  <th className="px-6 py-5">ชื่อ - นามสกุล</th>
                  <th className="px-6 py-5 print:py-2 print:text-[10px]">บุคลิกภาพ (RIASEC)</th>
                  <th className="px-6 py-5 print:py-2 print:text-[10px]">ความถนัด (D-P-T)</th>
                  <th className="px-6 py-5 print:py-2 print:text-[10px]">ความมั่นใจ</th>
                  <th className="px-6 py-5 print:py-2 print:text-[10px]">เวลาที่ทำเสร็จ</th>
                  <th className="px-6 py-5 print:hidden">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-medium">กำลังโหลดข้อมูล...</td></tr>
                ) : filteredResults.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-500 font-medium">ไม่พบข้อมูล</td></tr>
                ) : (
                  filteredResults.map(r => (
                    <tr key={r.id} onClick={() => setSelectedResult(r)} className="bg-white hover:bg-slate-50 transition-colors cursor-pointer print:break-inside-avoid">
                      <td className="px-6 py-4 font-bold text-slate-700 print:py-2 print:text-[10px]">
                        {r.student.room} <span className="text-slate-300 mx-1">/</span> {r.student.studentNumber}
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-800 print:py-2 print:text-[10px]">
                        {r.student.firstName} {r.student.lastName}
                      </td>
                      <td className="px-6 py-4 print:py-2">
                        <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-xs font-bold px-3 py-1 rounded-lg print:text-[10px] print:px-2 print:py-0.5">
                          {getCareerRecommendations(r.part1Score).type}
                        </span>
                      </td>
                      <td className="px-6 py-4 print:py-2">
                        <div className="flex items-center gap-3 text-xs print:gap-1">
                          <div className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] print:text-[8px]">D</span><span className="font-bold text-slate-700 print:text-[10px]">{r.part2Score.D}</span></div>
                          <div className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] print:text-[8px]">P</span><span className="font-bold text-slate-700 print:text-[10px]">{r.part2Score.P}</span></div>
                          <div className="flex flex-col"><span className="text-slate-400 font-bold text-[10px] print:text-[8px]">T</span><span className="font-bold text-slate-700 print:text-[10px]">{r.part2Score.T}</span></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 print:py-2">
                        <span className={cn(
                          "font-bold px-3 py-1 rounded-lg text-xs print:text-[10px] print:px-2 print:py-0.5",
                          r.part3ConsistencyPercentage >= 75 ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : 
                          r.part3ConsistencyPercentage >= 26 ? "bg-yellow-50 text-yellow-700 border border-yellow-100" : "bg-red-50 text-red-700 border border-red-100"
                        )}>
                          {r.part3ConsistencyPercentage}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-400 print:text-[10px]">
                        {new Date(r.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 print:hidden">
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
