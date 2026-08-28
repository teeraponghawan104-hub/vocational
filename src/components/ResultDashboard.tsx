import React from 'react';
import { AssessmentResult } from '../types';
import { getCareerRecommendations, riasecInterpretations, dptInterpretations } from '../data';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toPng } from 'html-to-image';
import { CheckCircle2, User, RefreshCw, BookOpen, Briefcase, GraduationCap, Download } from 'lucide-react';
import { cn } from '../lib/utils';

interface Props {
  result: AssessmentResult;
  onRestart: () => void;
  isTeacherView?: boolean;
}

const RIASEC_LABELS: Record<string, string> = {
  R: 'Realistic (ความจริง)',
  I: 'Investigative (ช่างคิด)',
  S: 'Social (ชอบสังคม)',
  C: 'Conventional (เจ้าระเบียบ)',
  E: 'Enterprising (กล้าเสี่ยง)',
  A: 'Artistic (รักศิลปะ)'
};

const DPT_LABELS: Record<string, string> = {
  D: 'Data (ข้อมูล)',
  P: 'Person (บุคคล)',
  T: 'Tool (เครื่องมือ)'
};

export default function ResultDashboard({ result, onRestart, isTeacherView }: Props) {
  const { student, part1Score, part2Score, part3ConsistencyPercentage } = result;

  const riasecData = Object.entries(part1Score).map(([key, value]) => ({
    subject: key,
    fullMark: 18,
    score: value,
    label: RIASEC_LABELS[key]
  }));

  const dptData = Object.entries(part2Score).map(([key, value]) => ({
    name: DPT_LABELS[key],
    score: value,
    fullMark: 36 // Actually max is sum of 18 questions * 2 points = 36 per trait? Wait. Total is 54 points. Max per trait is 36.
  }));

  const getConfidenceLevel = (pct: number) => {
    if (pct < 26) return { text: 'ต่ำ', color: 'text-red-600', bg: 'bg-red-100' };
    if (pct < 75) return { text: 'ปานกลาง', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { text: 'สูง', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const confidence = getConfidenceLevel(part3ConsistencyPercentage);
  const recommendations = getCareerRecommendations(part1Score);
  
  const dominantRiasec = riasecInterpretations[recommendations.type];
  
  // Find highest DPT
  const sortedDpt = Object.entries(part2Score).sort((a, b) => (b[1] as number) - (a[1] as number));
  const highestDptKey = sortedDpt[0][0];
  const dominantDpt = dptInterpretations[highestDptKey];

  const [showExportModal, setShowExportModal] = React.useState(false);

  const handleExportData = () => {
    try {
      const payload = btoa(encodeURIComponent(JSON.stringify(result)));
      navigator.clipboard.writeText(payload);
      alert('คัดลอกรหัสข้อมูลเรียบร้อยแล้ว กรุณาส่งรหัสนี้ให้ครูผู้สอน');
    } catch (e) {
      alert('ไม่สามารถคัดลอกรหัสได้');
    }
  };

  const handleSaveImage = async () => {
    const element = document.getElementById('printable-student-report');
    if (!element) return;
    
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    const originalPadding = element.style.padding;
    
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    element.style.width = '880px';
    element.style.maxWidth = '880px';
    element.style.padding = '24px';
    
    await new Promise(resolve => setTimeout(resolve, 200));
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#FFFFFF',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '880px'
        },
        filter: (node: any) => {
          if (node.hasAttribute && node.hasAttribute('data-hide-print')) return false;
          if (node.classList && typeof node.classList.contains === 'function' && node.classList.contains('print:hidden')) return false;
          return true;
        }
      });
      
      const link = document.createElement('a');
      link.download = `ผลการทดสอบ_${student.firstName}_${student.lastName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error generating Image', err);
      alert('เกิดข้อผิดพลาดในการบันทึกรูปภาพ');
    } finally {
      element.style.height = originalHeight;
      element.style.overflow = originalOverflow;
      element.style.width = originalWidth;
      element.style.maxWidth = originalMaxWidth;
      element.style.padding = originalPadding;
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] print:h-auto print:overflow-visible w-full bg-[#FDFDFF] text-slate-900 overflow-y-auto font-sans pb-safe" id="pdf-content">
      {/* Screen Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-8 shrink-0 shadow-sm z-10 sticky top-0 print:hidden" data-hide-print="true">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 pr-2">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden p-0.5 border border-slate-200">
            <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-sm sm:text-base md:text-lg font-semibold tracking-tight text-slate-800 truncate">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| แบบทดสอบความพร้อมทางอาชีพ</span></h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" data-hide-print="true">
          {!isTeacherView && (
            <button
              onClick={handleExportData}
              className="inline-flex items-center justify-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg hover:bg-amber-100 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
              title="คัดลอกรหัสส่งครู"
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              <span className="hidden md:inline">คัดลอกส่งครู</span>
            </button>
          )}
          <button
            onClick={handleSaveImage}
            className="inline-flex items-center justify-center gap-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg hover:bg-emerald-100 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
            title="บันทึกรูปภาพ PNG"
          >
            <Download size={15} className="shrink-0" />
            <span className="hidden md:inline">บันทึกรูปภาพ</span>
          </button>
          {isTeacherView ? (
            <button 
               onClick={onRestart}
               className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg hover:bg-slate-50 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
            >
              <span>ปิด</span>
            </button>
          ) : (
            <button 
               onClick={onRestart}
               className="inline-flex items-center justify-center gap-1.5 bg-white border border-slate-200 text-slate-600 px-2.5 py-1.5 md:px-3 md:py-1.5 rounded-lg hover:bg-slate-50 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
               title="กลับหน้าหลัก"
            >
              <RefreshCw size={14} className="shrink-0" />
              <span className="hidden sm:inline">กลับหน้าหลัก</span>
            </button>
          )}
        </div>
      </header>

      <div id="printable-student-report" className="max-w-5xl mx-auto p-3 sm:p-6 md:p-8 w-full animate-in fade-in duration-500 pb-20 print:p-0 print:m-0 print:pb-0 print:max-w-none bg-white">
        
        {/* Official Document Header (Visible in Print and PDF/Image Export) */}
        <div className="flex items-center justify-between pb-3 mb-3 sm:mb-4 border-b-2 border-indigo-600 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img src="/school-logo.png" alt="โลโก้โรงเรียน" className="w-10 h-10 sm:w-12 sm:h-12 object-contain shrink-0" />
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">โรงเรียนวรคุณอุปถัมภ์</h2>
              <p className="text-[11px] sm:text-xs text-indigo-700 font-semibold">รายงานผลการประเมินความพร้อมทางอาชีพ (Holland Codes & D-P-T Model)</p>
            </div>
          </div>
          <div className="text-right text-[9px] sm:text-[10px] text-slate-500">
            <p className="font-semibold text-slate-700">กลุ่มสาระการเรียนรู้แนะแนว</p>
            <p>วันที่ออกเอกสาร: {new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-slate-200 overflow-hidden print:rounded-none print:border-none print:shadow-none">
          
          {/* Header */}
          <div className="border-b border-slate-100 p-4 sm:p-6 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6 print:p-3 print:pb-2 print:flex-row print:items-center print:gap-4 print:border-b print:border-slate-200">
            <div className="flex items-center gap-3 sm:gap-6 print:gap-3">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg sm:text-2xl uppercase border-4 border-white shadow-sm shrink-0 print:w-11 print:h-11 print:text-base print:border-2">
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5 sm:mb-1 print:text-[8px] print:mb-0">ข้อมูลนักเรียนผู้รับการประเมิน</div>
                <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-slate-800 print:text-base truncate">{student.firstName} {student.lastName}</h1>
                <p className="text-slate-500 font-medium text-xs sm:text-sm md:text-base mt-0.5 sm:mt-1 print:text-[10px] print:mt-0 flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span>ชั้นมัธยมศึกษาปีที่ {student.room} • เลขที่ {student.studentNumber}</span>
                  {result.timestamp && (
                    <span className="text-[11px] sm:text-xs text-slate-400 font-normal bg-slate-100 px-2 py-0.5 rounded-md print:bg-transparent print:p-0">
                      ทำแบบทดสอบเมื่อ {new Date(result.timestamp).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} น.
                    </span>
                  )}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 bg-slate-50 px-3.5 sm:px-6 py-2.5 sm:py-4 rounded-xl sm:rounded-2xl border border-slate-100 w-full md:w-auto justify-between md:justify-start print:px-3 print:py-1.5 print:rounded-lg print:border-slate-200">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-0.5 sm:mb-1 text-left md:text-right print:text-[8px] print:mb-0">ความมั่นใจในตนเอง (ส่วนที่ 3)</div>
                <div className="text-lg sm:text-2xl font-black text-slate-800 text-left md:text-right print:text-base">{part3ConsistencyPercentage}%</div>
              </div>
              <div className={cn("px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-bold text-[11px] sm:text-xs uppercase tracking-wider text-center shrink-0 print:px-2 print:py-0.5 print:text-[9px]", confidence.bg, confidence.color)}>
                ระดับ{confidence.text}
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 lg:gap-10 print:p-2 print:grid-cols-2 print:gap-3">
            
            {/* Part 1: RIASEC */}
            <div className="bg-slate-50 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 print:break-inside-avoid print:p-3 print:rounded-xl print:border-slate-200">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-6 flex items-center gap-2 print:mb-2 print:text-xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 text-xs sm:text-sm font-bold print:w-5 print:h-5 print:text-[10px]">1</div>
                สรุปความสนใจด้านอาชีพ (RIASEC)
              </h3>
              <div className="h-[230px] sm:h-[280px] w-full max-w-sm mx-auto mb-3 sm:mb-6 print:h-[160px] print:mb-1">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="60%" data={riasecData}>
                    <PolarGrid stroke="#cbd5e1" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                    <Radar name="Score" dataKey="score" stroke="#4f46e5" strokeWidth={2} fill="#6366f1" fillOpacity={0.25} isAnimationActive={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 print:grid-cols-3 gap-2 text-xs sm:text-sm mt-auto print:gap-1 print:text-[9px]">
                {riasecData.map(d => (
                  <div key={d.subject} className="flex justify-between items-center bg-white px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl shadow-xs border border-slate-100 print:px-1.5 print:py-1 print:rounded-md print:border-slate-200">
                    <span className="font-medium text-slate-600 truncate mr-1 text-[11px] sm:text-xs print:text-[9px]">{d.label.split(' ')[0]}</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md text-xs print:bg-transparent print:px-0 print:py-0 print:text-[9px]">{d.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Part 2: D-P-T */}
            <div className="bg-slate-50 p-4 sm:p-6 md:p-8 rounded-2xl md:rounded-3xl border border-slate-100 flex flex-col hover:-translate-y-1 hover:shadow-lg transition-all duration-300 print:break-inside-avoid print:p-3 print:rounded-xl print:border-slate-200">
              <h3 className="text-base sm:text-lg font-bold text-slate-800 mb-3 sm:mb-6 flex items-center gap-2 print:mb-2 print:text-xs">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 text-xs sm:text-sm font-bold print:w-5 print:h-5 print:text-[10px]">2</div>
                สรุปความถนัดทางอาชีพ (D-P-T)
              </h3>
              <div className="min-h-[190px] sm:min-h-[220px] h-[200px] sm:h-[240px] mt-1 sm:mt-2 mb-3 sm:mb-4 print:h-[130px] print:min-h-[130px] print:mt-0 print:mb-1 w-full max-w-sm mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dptData} layout="vertical" margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#cbd5e1" />
                    <XAxis type="number" domain={[0, 36]} tick={{ fill: '#64748b', fontSize: 9 }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fill: '#334155', fontSize: 9, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="score" fill="#4f46e5" radius={[0, 6, 6, 0]} barSize={18} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 shadow-xs mt-auto print:p-2 print:rounded-lg print:border-slate-200">
                <div className="text-xs sm:text-sm font-bold text-indigo-600 mb-1 print:mb-0.5 print:text-[10px]">ความถนัดที่โดดเด่น: {dominantDpt.title}</div>
                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed print:text-[9px] print:leading-tight break-words">
                  {dominantDpt.desc}
                </p>
                <div className="mt-2 text-xs sm:text-sm print:mt-1 print:text-[9px] break-words">
                  <span className="font-bold text-slate-700">อาชีพที่สอดคล้อง: </span>
                  <span className="text-slate-600">{dominantDpt.careers}</span>
                </div>
              </div>
            </div>

            {/* Detailed Interpretation */}
            <div className="lg:col-span-2 space-y-4 sm:space-y-8 print:break-inside-avoid print:space-y-0 print:col-span-2 print:mt-1">
              <div className="bg-indigo-600 p-0.5 sm:p-1 rounded-2xl md:rounded-3xl shadow-lg print:bg-transparent print:p-0 print:shadow-none">
                <div className="bg-white rounded-[14px] md:rounded-[22px] p-4 sm:p-8 md:p-10 print:rounded-xl print:border print:border-slate-200 print:p-3">
                  <div className="flex items-center gap-3 mb-3 sm:mb-6 pb-2 sm:pb-4 border-b border-slate-100 print:mb-2 print:pb-1.5 print:gap-2">
                    <div className="bg-indigo-100 text-indigo-600 p-2 sm:p-3 rounded-xl shrink-0 print:p-1 print:rounded-md">
                      <User size={20} strokeWidth={2} className="print:w-4 print:h-4" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-2xl font-bold text-slate-800 print:text-xs">การแปลผลบุคลิกภาพและความสนใจ (RIASEC)</h2>
                      <p className="text-xs text-slate-500 print:text-[9px]">วิเคราะห์จากผลคะแนนสูงสุด: <strong className="text-indigo-700">{dominantRiasec.title}</strong></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 print:gap-2">
                    <div className="space-y-3 sm:space-y-5 print:space-y-1.5">
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs sm:text-sm print:mb-0.5 print:text-[10px]">
                          <BookOpen size={15} className="text-indigo-500 print:w-3 print:h-3 shrink-0" />
                          ลักษณะโดยทั่วไป
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-sm print:text-[9px] print:leading-snug break-words">{dominantRiasec.general}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs sm:text-sm print:mb-0.5 print:text-[10px]">
                          <CheckCircle2 size={15} className="text-indigo-500 print:w-3 print:h-3 shrink-0" />
                          ลักษณะเด่นของบุคลิกภาพ
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-sm bg-indigo-50/50 p-2.5 sm:p-4 rounded-xl border border-indigo-100 print:p-1.5 print:rounded-md print:text-[9px] print:leading-snug print:bg-transparent print:border-slate-200 break-words">{dominantRiasec.distinctive}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-3 sm:space-y-5 print:space-y-1.5">
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs sm:text-sm print:mb-0.5 print:text-[10px]">
                          <Briefcase size={15} className="text-indigo-500 print:w-3 print:h-3 shrink-0" />
                          อาชีพที่สอดคล้องกับบุคลิกภาพ
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-sm print:text-[9px] print:leading-snug break-words">{dominantRiasec.careers}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-1.5 mb-1 text-xs sm:text-sm print:mb-0.5 print:text-[10px]">
                          <GraduationCap size={15} className="text-indigo-500 print:w-3 print:h-3 shrink-0" />
                          สาขาวิชาที่อาจเลือกศึกษา
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-xs sm:text-sm print:text-[9px] print:leading-snug break-words">{dominantRiasec.majors}</p>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Document Footer */}
        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-200 text-[9px] sm:text-[10px] text-slate-500">
          <span>แบบทดสอบความพร้อมทางอาชีพ โรงเรียนวรคุณอุปถัมภ์ (Holland Codes & D-P-T Model)</span>
          <span>เอกสารรายงานผลประเมินรายบุคคล</span>
        </div>
      </div>
    </div>
  );
}
