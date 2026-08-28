import React, { useState, useEffect, useRef } from 'react';
import { StudentInfo, AssessmentResult, Part1Answer, Part2Answer } from '../types';
import Part1 from './Part1';
import Part2 from './Part2';
import Part3 from './Part3';
import { saveAssessment, acquireLock, releaseLock, renewLock } from '../db';
import { LogOut } from 'lucide-react';

interface Props {
  student: StudentInfo;
  onComplete: (result: AssessmentResult) => void;
  onCancel: () => void;
  onLockedOut?: () => void;
}

export default function AssessmentLockdown({ student, onComplete, onCancel, onLockedOut }: Props) {
  const autosaveKey = `autosave-${student.room}-${student.studentNumber}`;

  const sessionIdRef = useRef<string>('');
  const [lockStatus, setLockStatus] = useState<'checking' | 'acquired' | 'denied'>('checking');
  
  useEffect(() => {
    if (!sessionIdRef.current) {
      let storedSession = sessionStorage.getItem('app_session_id');
      if (!storedSession) {
        storedSession = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        sessionStorage.setItem('app_session_id', storedSession);
      }
      sessionIdRef.current = storedSession;
    }
    const studentId = `${student.room}-${student.studentNumber}`.replace(/\//g, '_');
    let isMounted = true;
    let heartbeatInterval: NodeJS.Timeout;

    const checkLock = async () => {
      const success = await acquireLock(studentId, sessionIdRef.current);
      if (isMounted) {
        setLockStatus(success ? 'acquired' : 'denied');
        if (success) {
          // Renew at most every 5 minutes if test is still open
          heartbeatInterval = setInterval(() => {
            renewLock(studentId, sessionIdRef.current);
          }, 5 * 60 * 1000);
        } else {
          if (onLockedOut) onLockedOut();
        }
      }
    };
    checkLock();

    const handleBeforeUnload = () => {
      releaseLock(studentId, sessionIdRef.current);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      isMounted = false;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      releaseLock(studentId, sessionIdRef.current);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [student.room, student.studentNumber]);

  const handleCancel = async () => {
    if (lockStatus === 'acquired') {
      const studentId = `${student.room}-${student.studentNumber}`.replace(/\//g, '_');
      await releaseLock(studentId, sessionIdRef.current);
    }
    onCancel();
  };

  const loadAutosave = () => {
    try {
      const saved = localStorage.getItem(autosaveKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.currentPart) {
          return parsed;
        }
      }
    } catch (e) {}
    return null;
  };

  const savedData = loadAutosave();

  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(savedData?.currentPart || 1);
  const [part1Answers, setPart1Answers] = useState<Part1Answer[]>(savedData?.part1Answers || []);
  const [part2Answers, setPart2Answers] = useState<Part2Answer[]>(savedData?.part2Answers || []);
  const [part3Answers, setPart3Answers] = useState<Part1Answer[]>(savedData?.part3Answers || []);

  useEffect(() => {
    const dataToSave = {
      currentPart,
      part1Answers,
      part2Answers,
      part3Answers
    };
    localStorage.setItem(autosaveKey, JSON.stringify(dataToSave));
  }, [currentPart, part1Answers, part2Answers, part3Answers, autosaveKey]);

  const calculateScore = (p1: Part1Answer[], p2: Part2Answer[], p3: Part1Answer[]) => {
    const riasec = { R: 0, I: 0, S: 0, C: 0, E: 0, A: 0 };
    const getScore = (val: string | null) => val === 'A' ? 2 : val === 'B' ? 1 : 0;
    
    p1.forEach(ans => {
      const q = ans.questionId;
      const score = getScore(ans.choice);
      if ([1, 7, 13, 19, 25, 31, 37, 43, 49].includes(q)) riasec.R += score;
      if ([2, 8, 14, 20, 26, 32, 38, 44, 50].includes(q)) riasec.I += score;
      if ([3, 9, 15, 21, 27, 33, 39, 45, 51].includes(q)) riasec.S += score;
      if ([4, 10, 16, 22, 28, 34, 40, 46, 52].includes(q)) riasec.C += score;
      if ([5, 11, 17, 23, 29, 35, 41, 47, 53].includes(q)) riasec.E += score;
      if ([6, 12, 18, 24, 30, 36, 42, 48, 54].includes(q)) riasec.A += score;
    });

    const dpt = { D: 0, P: 0, T: 0 };
    p2.forEach(ans => {
      dpt.D += getScore(ans.sub1Choice);
      dpt.P += getScore(ans.sub2Choice);
      dpt.T += getScore(ans.sub3Choice);
    });

    let consistentCount = 0;
    p3.forEach(p3Ans => {
      const p1Ans = p1.find(a => a.questionId === p3Ans.questionId);
      if (p1Ans && p1Ans.choice === p3Ans.choice) {
        consistentCount++;
      }
    });
    const consistencyPercentage = Math.round((consistentCount / 54) * 100);

    return {
      part1Score: riasec,
      part2Score: dpt,
      part3ConsistencyPercentage: consistencyPercentage
    };
  };

  const handlePart3Complete = async (p3: Part1Answer[]) => {
    const scores = calculateScore(part1Answers, part2Answers, p3);
    
    const generateId = () => {
      try {
        if (crypto && crypto.randomUUID) return crypto.randomUUID();
      } catch (e) {}
      return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    };

    const result: AssessmentResult = {
      id: generateId(),
      timestamp: Date.now(),
      student,
      ...scores
    };

    try {
      await saveAssessment(result);
      localStorage.removeItem(autosaveKey);
      if (lockStatus === 'acquired') {
        const studentId = `${student.room}-${student.studentNumber}`.replace(/\//g, '_');
        await releaseLock(studentId, sessionIdRef.current);
      }
      onComplete(result);
    } catch (e) {
      console.error("Failed to save assessment:", e);
      alert("ไม่สามารถบันทึกข้อมูลได้ โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ตแล้วลองอีกครั้ง");
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-sans">
      {/* Top Navigation / Status Bar */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden p-0.5 border border-slate-200">
            <img src="/school-logo.png" alt="School Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-base md:text-lg font-semibold tracking-tight text-slate-800 whitespace-nowrap">โรงเรียนวรคุณอุปถัมภ์ <span className="hidden md:inline text-slate-400 font-normal ml-2">| แบบทดสอบความพร้อมทางอาชีพ</span></h1>
        </div>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 text-sm font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
        >
          <LogOut size={16} />
          <span className="hidden sm:inline">ยกเลิกและกลับหน้าหลัก</span>
        </button>
      </header>

      {/* Checking Lock Overlay */}
      {lockStatus === 'checking' && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl p-6 shadow-xl flex items-center gap-4">
            <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-slate-700 font-medium text-sm">กำลังตรวจสอบสิทธิ์และเชื่อมต่อแบบทดสอบ...</span>
          </div>
        </div>
      )}

      {/* Lock Denied Modal */}
      {lockStatus === 'denied' && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <LogOut size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900">ไม่สามารถเข้าทำแบบทดสอบได้</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              เนื่องจากนักเรียนคนนี้กำลังทำแบบทดสอบอยู่บนอุปกรณ์อื่น หรือได้ทำแบบทดสอบเสร็จสิ้นไปแล้ว
            </p>
            <button
              onClick={onCancel}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md shadow-indigo-100 text-sm"
            >
              กลับสู่หน้าหลัก
            </button>
          </div>
        </div>
      )}

      {/* Mobile Sticky Sub-Header with Progress Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2.5 shadow-xs shrink-0">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <div className="font-bold text-slate-800 truncate max-w-[200px]">
            {student.firstName} {student.lastName} ({student.room} เลขที่ {student.studentNumber})
          </div>
          <div className="font-semibold text-indigo-600 shrink-0">
            ส่วนที่ {currentPart} / 3
          </div>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-indigo-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${(currentPart / 3) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Sidebar: Student & Progress */}
        <aside className="hidden md:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0">
          <div className="p-6 border-b border-slate-100">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-3">ผู้ทำการทดสอบ</div>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-xl uppercase">
                {student.firstName.charAt(0)}{student.lastName.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-800 leading-tight">{student.firstName} {student.lastName}</div>
                <div className="text-xs text-slate-500">ชั้น {student.room} • เลขที่ {student.studentNumber}</div>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold px-2 py-4">ความคืบหน้าการทดสอบ</div>
            
            <div className={`flex items-center gap-3 p-3 rounded-xl ${currentPart === 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : currentPart > 1 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-400 border border-transparent'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${currentPart === 1 ? 'bg-white/20 font-bold italic' : currentPart > 1 ? 'bg-green-500 text-white font-bold' : 'bg-slate-200 font-bold italic'}`}>{currentPart > 1 ? '✓' : '1'}</div>
              <div className={`text-sm ${currentPart === 1 ? 'font-semibold' : 'font-medium'}`}>ส่วนที่ 1: ความสนใจด้านอาชีพ</div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl ${currentPart === 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : currentPart > 2 ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-slate-50 text-slate-400 border border-transparent'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${currentPart === 2 ? 'bg-white/20 font-bold italic' : currentPart > 2 ? 'bg-green-500 text-white font-bold' : 'bg-slate-200 font-bold italic'}`}>{currentPart > 2 ? '✓' : '2'}</div>
              <div className={`text-sm ${currentPart === 2 ? 'font-semibold' : 'font-medium'}`}>ส่วนที่ 2: ความถนัดทางอาชีพ</div>
            </div>

            <div className={`flex items-center gap-3 p-3 rounded-xl ${currentPart === 3 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border border-transparent'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${currentPart === 3 ? 'bg-white/20 font-bold italic' : 'bg-slate-200 font-bold italic'}`}>3</div>
              <div className={`text-sm ${currentPart === 3 ? 'font-semibold' : 'font-medium'}`}>ส่วนที่ 3: ความมั่นใจในตนเอง</div>
            </div>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-10 flex flex-col bg-[#FDFDFF] relative overflow-y-auto">
          <div className="max-w-3xl mx-auto w-full flex flex-col h-full">
            {currentPart === 1 && (
              <Part1 
                initialAnswers={part1Answers}
                onChange={setPart1Answers}
                onComplete={(ans) => { setPart1Answers(ans); setCurrentPart(2); }} 
              />
            )}
            {currentPart === 2 && (
              <Part2 
                initialAnswers={part2Answers}
                onChange={setPart2Answers}
                onComplete={(ans) => { setPart2Answers(ans); setCurrentPart(3); }} 
              />
            )}
            {currentPart === 3 && (
              <Part3 
                initialAnswers={part3Answers}
                onChange={setPart3Answers}
                onComplete={handlePart3Complete} 
              />
            )}
          </div>
        </main>
      </div>

      {/* Bottom Validation Bar */}
      <footer className="hidden md:flex h-12 bg-indigo-900 items-center justify-center px-8 shrink-0">
        <div className="text-xs md:text-sm text-white/60 tracking-wide">
          แบบประเมินนี้จัดทำขึ้นเพื่อการศึกษาเท่านั้น มิได้มีเจตนาละเมิดลิขสิทธิ์หรือนำไปใช้ในเชิงพาณิชย์
        </div>
      </footer>
    </div>
  );
}
