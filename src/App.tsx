import React, { useState } from 'react';
import { StudentInfo, AssessmentResult } from './types';
import StudentForm from './components/StudentForm';
import AssessmentLockdown from './components/AssessmentLockdown';
import ResultDashboard from './components/ResultDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import InstallPwaPrompt, { InstallAppButton } from './components/InstallPwaPrompt';
import { LogIn, Users, AlertTriangle, Megaphone, Clock } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<'login' | 'assessment' | 'result' | 'teacher'>('login');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [teacherPwd, setTeacherPwd] = useState('');
  const [loginError, setLoginError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const showToast = (message: string, type: 'error' | 'success' = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const startAssessment = (info: StudentInfo) => {
    setStudentInfo(info);
    setStep('assessment');
  };

  const finishAssessment = (res: AssessmentResult) => {
    setResult(res);
    setStep('result');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col relative">
      {/* PWA Install Notification & Modal */}
      <InstallPwaPrompt />

      {/* Maintenance Announcement Top Bar */}
      <aside aria-label="แถบประกาศแจ้งเตือน" className="w-full bg-amber-500 text-slate-950 px-4 py-2.5 shadow-sm flex items-center justify-center gap-2 text-center text-xs md:text-sm font-semibold tracking-wide border-b border-amber-600/30">
        <Megaphone className="w-4 h-4 shrink-0 text-slate-950" />
        <span>ประกาศ: ปิดปรับปรุงระบบชั่วคราว จนถึงเวลา 12:00 น. (เที่ยงวันนี้)</span>
      </aside>

      {toast && (
        <div className="fixed top-4 right-4 z-[9999] animate-in fade-in slide-in-from-top-4 duration-300">
          <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-center gap-3 ${
            toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {toast.type === 'error' ? (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      )}

      {step === 'login' && (
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 w-full max-w-md">
            <div className="h-40 w-full relative">
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=800&q=80" 
                alt="Professional Assessment" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/80 to-transparent"></div>
              <div className="absolute bottom-4 left-6 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-md p-0.5 overflow-hidden shrink-0">
                  <img src="/school-logo.png" alt="โลโก้โรงเรียนวรคุณอุปถัมภ์" className="w-full h-full object-contain" />
                </div>
                <div className="text-white">
                  <h1 className="text-xl font-bold tracking-tight">โรงเรียนวรคุณอุปถัมภ์</h1>
                  <p className="text-white/80 text-[10px] uppercase tracking-widest font-medium">แบบทดสอบความพร้อมทางอาชีพ</p>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-[#FDFDFF]">
              {/* Maintenance Notice Card */}
              <div className="mb-6 p-4 bg-amber-50/90 border border-amber-200 rounded-xl flex items-start gap-3 text-amber-950 shadow-sm">
                <div className="p-1.5 bg-amber-200/70 rounded-lg text-amber-800 shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-amber-900 flex items-center gap-1.5">
                    ประกาศปิดปรับปรุงระบบ
                  </h2>
                  <p className="text-xs text-amber-800/95 mt-1 leading-relaxed">
                    ระบบอยู่ระหว่างการปรับปรุงข้อมูลและบำรุงรักษา จะเปิดให้เข้าทำแบบทดสอบได้ตามปกติในเวลา <strong>12:00 น. (เที่ยงวันนี้)</strong> ขออภัยในความไม่สะดวก
                  </p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <p className="text-sm font-medium text-slate-600">แบบทดสอบนี้จะช่วยให้นักเรียนค้นพบ:</p>
                <ul className="text-xs text-slate-500 space-y-2 font-medium">
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>บุคลิกภาพและความสนใจ (Holland Codes)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></div>ความถนัดทางอาชีพ (Aptitude)</li>
                  <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></div>ความมั่นใจในการตัดสินใจของตนเอง</li>
                </ul>
              </div>
              <StudentForm onSubmit={startAssessment} />
            </div>
            <div className="bg-slate-50 p-4 text-center border-t border-slate-200">
              {showTeacherLogin ? (
                <div className="text-left px-2 py-1">
                  <p className="text-sm font-semibold text-slate-700 mb-3 text-center">เข้าสู่ระบบสำหรับครูผู้สอน</p>
                  <input
                    type="password"
                    value={teacherPwd}
                    onChange={(e) => {
                      setTeacherPwd(e.target.value);
                      setLoginError('');
                    }}
                    placeholder="รหัสผ่าน"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md mb-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  {loginError && <p className="text-xs text-red-500 mb-3 px-1">{loginError}</p>}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setShowTeacherLogin(false);
                        setTeacherPwd('');
                        setLoginError('');
                      }}
                      className="flex-1 bg-white border border-slate-300 text-slate-700 py-2 rounded-md text-sm font-semibold hover:bg-slate-50 transition"
                    >
                      ยกเลิก
                    </button>
                    <button
                      onClick={() => {
                        if (teacherPwd === '06914') {
                          setStep('teacher');
                          setShowTeacherLogin(false);
                          setTeacherPwd('');
                        } else {
                          setLoginError('รหัสผ่านไม่ถูกต้อง');
                        }
                      }}
                      className="flex-1 bg-indigo-600 text-white py-2 rounded-md text-sm font-semibold hover:bg-indigo-700 transition"
                    >
                      ตกลง
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 px-2">
                  <button
                    onClick={() => setShowTeacherLogin(true)}
                    className="text-xs text-slate-500 hover:text-indigo-600 font-bold uppercase tracking-widest inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Users size={14} />
                    สำหรับครูผู้สอน
                  </button>
                  <InstallAppButton />
                </div>
              )}
            </div>
          </div>
          <div className="mt-8 text-center flex flex-col items-center gap-2">
            <div className="text-xs text-slate-400 font-medium">
              Developed by <span className="font-semibold text-slate-500">Thiw_Theerapong</span>
            </div>
            <p className="text-[10px] text-slate-400/80 max-w-sm px-4 leading-relaxed">
              แบบประเมินนี้จัดทำขึ้นเพื่อการศึกษาเท่านั้น มิได้มีเจตนาละเมิดลิขสิทธิ์หรือนำไปใช้ในเชิงพาณิชย์
            </p>
          </div>
        </div>
      )}

      {step === 'assessment' && studentInfo && (
        <AssessmentLockdown 
          student={studentInfo} 
          onComplete={finishAssessment}
          onCancel={() => {
            setStudentInfo(null);
            setStep('login');
          }}
          onLockedOut={() => {
            setStudentInfo(null);
            setStep('login');
            showToast('ไม่สามารถเข้าถึงได้ เนื่องจากมีคนกำลังทำข้อมูลนี้อยู่', 'error');
          }}
        />
      )}

      {step === 'result' && result && (
        <ResultDashboard 
          result={result} 
          onRestart={() => setStep('login')} 
        />
      )}

      {step === 'teacher' && (
        <TeacherDashboard onBack={() => setStep('login')} />
      )}
    </div>
  );
}
