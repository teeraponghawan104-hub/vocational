import React, { useState } from 'react';
import { StudentInfo, AssessmentResult } from './types';
import StudentForm from './components/StudentForm';
import AssessmentLockdown from './components/AssessmentLockdown';
import ResultDashboard from './components/ResultDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import { LogIn, Users } from 'lucide-react';

export default function App() {
  const [step, setStep] = useState<'login' | 'assessment' | 'result' | 'teacher'>('login');
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [teacherPwd, setTeacherPwd] = useState('');
  const [loginError, setLoginError] = useState('');

  const startAssessment = (info: StudentInfo) => {
    setStudentInfo(info);
    setStep('assessment');
  };

  const finishAssessment = (res: AssessmentResult) => {
    setResult(res);
    setStep('result');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
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
                <button
                  onClick={() => setShowTeacherLogin(true)}
                  className="text-xs text-slate-500 hover:text-indigo-600 font-bold uppercase tracking-widest inline-flex items-center gap-2 transition-colors"
                >
                  <Users size={14} />
                  สำหรับครูผู้สอน
                </button>
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
