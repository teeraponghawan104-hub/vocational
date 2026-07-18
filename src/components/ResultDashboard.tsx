import React from 'react';
import { AssessmentResult } from '../types';
import { getCareerRecommendations, riasecInterpretations, dptInterpretations } from '../data';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { CheckCircle2, User, RefreshCw, BookOpen, Briefcase, GraduationCap, Printer } from 'lucide-react';
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
  const sortedDpt = Object.entries(part2Score).sort((a, b) => b[1] - a[1]);
  const highestDptKey = sortedDpt[0][0];
  const dominantDpt = dptInterpretations[highestDptKey];

  const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    // Save original styles
    const originalHeight = element.style.height;
    const originalOverflow = element.style.overflow;
    const originalWidth = element.style.width;
    const originalMaxWidth = element.style.maxWidth;
    
    // Force a specific wide width for PDF generation to ensure it looks good (desktop view)
    element.style.height = 'auto';
    element.style.overflow = 'visible';
    element.style.width = '1000px';
    element.style.maxWidth = '1000px';
    
    // We need a small delay to let the browser re-render the layout
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: '#FDFDFF',
        pixelRatio: 2,
        width: 1000,
        height: element.scrollHeight,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
          width: '1000px'
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
      
      // สร้าง PDF ให้มีขนาดเท่ากับเนื้อหาพอดี เป็นไฟล์เต็มแผ่น ไม่ต้องตัดหน้า
      const pdf = new jsPDF({
        orientation: imgProps.width > imgProps.height ? 'l' : 'p',
        unit: 'px',
        format: [imgProps.width, imgProps.height]
      });
      
      pdf.addImage(dataUrl, 'PNG', 0, 0, imgProps.width, imgProps.height);
      
      pdf.save(`ผลการทดสอบ_${student.firstName}_${student.lastName}.pdf`);
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


  return (
    <div className="flex flex-col h-screen print:h-auto print:overflow-visible w-full bg-[#FDFDFF] text-slate-900 overflow-y-auto font-sans" id="pdf-content">
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10 sticky top-0 print:hidden" data-hide-print="true">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden p-0.5 border border-slate-200">
            <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| แบบทดสอบความพร้อมทางอาชีพ</span></h1>
        </div>
        <div className="flex items-center gap-2" data-hide-print="true">
          <button
            onClick={handleDownloadPdf}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-3 md:px-4 py-1.5 rounded-lg hover:bg-indigo-700 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
          >
            <Printer size={14} className="shrink-0" />
            <span>พิมพ์ / PDF</span>
          </button>
          {isTeacherView && (
            <button 
               onClick={onRestart}
               className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-3 md:px-4 py-1.5 rounded-lg hover:bg-slate-50 font-semibold text-xs md:text-sm transition print:hidden whitespace-nowrap shrink-0"
            >
              <span>ปิด</span>
            </button>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto p-4 md:p-8 w-full animate-in fade-in duration-500 pb-20">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Header */}
          <div className="border-b border-slate-100 p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-2xl uppercase border-4 border-white shadow-sm">
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1">ผลการประเมินความพร้อมทางอาชีพ</div>
                <h1 className="text-3xl font-bold text-slate-800">{student.firstName} {student.lastName}</h1>
                <p className="text-slate-500 font-medium mt-1">ชั้น {student.room} • เลขที่ {student.studentNumber}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-slate-50 px-6 py-4 rounded-2xl border border-slate-100">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1 text-right">ความมั่นใจในตนเอง (ส่วนที่ 3)</div>
                <div className="text-2xl font-black text-slate-800 text-right">{part3ConsistencyPercentage}%</div>
              </div>
              <div className={cn("px-3 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider", confidence.bg, confidence.color)}>
                ระดับ{confidence.text}
              </div>
            </div>
          </div>

          <div className="p-8 md:p-10 grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Part 1: RIASEC */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 text-sm">1</div>
                สรุปความสนใจด้านอาชีพ (RIASEC)
              </h3>
              <div className="h-64 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={riasecData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                    <Radar name="Score" dataKey="score" stroke="#4f46e5" strokeWidth={2} fill="#6366f1" fillOpacity={0.2} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mt-auto">
                {riasecData.map(d => (
                  <div key={d.subject} className="flex justify-between items-center bg-white px-4 py-3 rounded-xl shadow-sm border border-slate-100">
                    <span className="font-medium text-slate-600">{d.label.split(' ')[0]}</span>
                    <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{d.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Part 2: D-P-T */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 flex flex-col">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-slate-200 text-sm">2</div>
                สรุปความถนัดทางอาชีพ (D-P-T)
              </h3>
              <div className="h-64 mt-4 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dptData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" domain={[0, 36]} tick={{ fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="score" fill="#4f46e5" radius={[0, 8, 8, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mt-auto">
                <div className="text-sm font-bold text-indigo-600 mb-2">ความถนัดที่โดดเด่นที่สุด: {dominantDpt.title}</div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {dominantDpt.desc}
                </p>
                <div className="mt-3 text-sm">
                  <span className="font-bold text-slate-700">อาชีพที่สอดคล้อง: </span>
                  <span className="text-slate-600">{dominantDpt.careers}</span>
                </div>
              </div>
            </div>

            {/* Detailed Interpretation */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-indigo-600 p-1 rounded-3xl shadow-lg">
                <div className="bg-white rounded-[22px] p-8 md:p-10">
                  <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100">
                    <div className="bg-indigo-100 text-indigo-600 p-3 rounded-xl">
                      <User size={24} strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800">การแปลผลบุคลิกภาพ</h2>
                      <p className="text-slate-500">วิเคราะห์จากความสนใจด้านอาชีพ (RIASEC)</p>
                    </div>
                  </div>
                  
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-indigo-700 mb-2">{dominantRiasec.title}</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <BookOpen size={18} className="text-indigo-500" />
                          ลักษณะโดยทั่วไป
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-sm">{dominantRiasec.general}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <CheckCircle2 size={18} className="text-indigo-500" />
                          ลักษณะเด่นของบุคลิกภาพ
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-sm bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">{dominantRiasec.distinctive}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <Briefcase size={18} className="text-indigo-500" />
                          อาชีพที่สอดคล้องกับบุคลิกภาพ
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-sm">{dominantRiasec.careers}</p>
                      </div>
                      
                      <div>
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-2">
                          <GraduationCap size={18} className="text-indigo-500" />
                          สาขาวิชาที่อาจเลือกศึกษา
                        </h4>
                        <p className="text-slate-600 leading-relaxed text-sm">{dominantRiasec.majors}</p>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
