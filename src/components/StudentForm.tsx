import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AssessmentResult } from '../types';
import { rooms, students, StudentRecord, normalizeName } from '../studentData';
import { subscribeToAssessments, subscribeToLocks, checkStudentEligibilityRealTime, acquireLock } from '../db';
import { CheckCircle2, UserCheck, AlertCircle, ShieldAlert, ChevronRight, Lock, Loader2, RefreshCw, BarChart3, Eye, FileText } from 'lucide-react';

interface Props {
  onSubmit: (info: StudentInfo) => void;
  onViewResult: (result: AssessmentResult) => void;
}

export default function StudentForm({ onSubmit, onViewResult }: Props) {
  const [room, setRoom] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [assessmentsList, setAssessmentsList] = useState<AssessmentResult[]>([]);
  const [lockedStudentIds, setLockedStudentIds] = useState<Set<string>>(new Set());
  
  // Confirmation Modal state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [modalExistingResult, setModalExistingResult] = useState<AssessmentResult | null>(null);

  // Get or initialize persistent session ID
  const sessionId = useMemo(() => {
    let sId = sessionStorage.getItem('app_session_id');
    if (!sId) {
      sId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      sessionStorage.setItem('app_session_id', sId);
    }
    return sId;
  }, []);

  useEffect(() => {
    const unsubscribeAssessments = subscribeToAssessments((results) => {
      setAssessmentsList(results);
    });

    const unsubscribeLocks = subscribeToLocks((lockedIds) => {
      setLockedStudentIds(new Set(lockedIds));
    });

    return () => {
      unsubscribeAssessments();
      unsubscribeLocks();
    };
  }, []);

  // Filter students by selected room
  const filteredStudents = useMemo(() => {
    if (!room) return [];
    return students
      .filter(s => s.room === room)
      .sort((a, b) => parseInt(a.number, 10) - parseInt(b.number, 10));
  }, [room]);

  // Check if a given student has completed or is currently locked
  const getStudentStatus = (s: StudentRecord) => {
    const normalizedStudentRecordName = normalizeName(s.name);

    // 1. Check if completed in assessments
    const matchedAssessment = assessmentsList.find(a => {
      // Room + number match
      const roomMatch = a.student.room === s.room && String(a.student.studentNumber).trim() === String(s.number).trim();
      if (roomMatch) return true;

      // Name normalization match (independent of minor spacing / casing)
      const aFullName = normalizeName(`${a.student.firstName || ''} ${a.student.lastName || ''}`);
      if (aFullName && normalizedStudentRecordName && aFullName === normalizedStudentRecordName) {
        return true;
      }

      return false;
    });

    // 2. Check if locked in active session
    const lockId = `${s.room}-${s.number}`.replace(/\//g, '_');
    const isLocked = lockedStudentIds.has(lockId);

    return { 
      isCompleted: !!matchedAssessment, 
      isLocked,
      result: matchedAssessment || null
    };
  };

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.studentId === selectedStudentId) || null;
  }, [selectedStudentId]);

  const selectedStudentStatus = useMemo(() => {
    if (!selectedStudent) return { isCompleted: false, isLocked: false, result: null };
    return getStudentStatus(selectedStudent);
  }, [selectedStudent, assessmentsList, lockedStudentIds]);

  const selectedStudentHasAutosave = useMemo(() => {
    if (!room || !selectedStudent || selectedStudentStatus.isCompleted) return false;
    const key = `autosave-${room}-${selectedStudent.number}`;
    return !!localStorage.getItem(key);
  }, [room, selectedStudent, selectedStudentStatus.isCompleted]);

  // When user clicks "เริ่มทำแบบทดสอบ" or "ดูผลการทดสอบ" on the form
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setVerificationError(null);
    setModalExistingResult(null);

    if (!room || !selectedStudent) {
      alert('กรุณาเลือกชั้นเรียนและชื่อผู้ทำแบบทดสอบ');
      return;
    }

    const { isCompleted, isLocked, result } = selectedStudentStatus;

    // If completed: directly navigate to their results!
    if (isCompleted && result) {
      onViewResult(result);
      return;
    }

    if (isLocked) {
      alert(`นักเรียน "${selectedStudent.name}" กำลังมีผู้ทำแบบทดสอบอยู่บนอุปกรณ์อื่น`);
      return;
    }

    setShowConfirmModal(true);
  };

  // When user confirms identity in the modal
  const handleConfirmAndStart = async () => {
    if (!selectedStudent) return;
    setIsVerifying(true);
    setVerificationError(null);
    setModalExistingResult(null);

    try {
      // Step 1 & 5: Real-time atomic verification from Firestore
      const eligibility = await checkStudentEligibilityRealTime(
        {
          room: selectedStudent.room,
          studentNumber: selectedStudent.number,
          fullName: selectedStudent.name
        },
        sessionId
      );

      if (!eligibility.canStart) {
        if (eligibility.existingResult) {
          setModalExistingResult(eligibility.existingResult);
        }
        setVerificationError(eligibility.reason || 'ไม่สามารถเริ่มทำแบบทดสอบได้ เนื่องจากชื่อนี้ได้ถูกบันทึกหรือกำลังทำอยู่แล้ว');
        setIsVerifying(false);
        return;
      }

      // Acquire lock immediately
      const lockId = `${selectedStudent.room}-${selectedStudent.number}`.replace(/\//g, '_');
      const lockSuccess = await acquireLock(lockId, sessionId);

      if (!lockSuccess) {
        setVerificationError('ไม่สามารถเข้าทำแบบทดสอบได้ในขณะนี้ เนื่องจากมีผู้อื่นกำลังทำข้อมูลนี้อยู่');
        setIsVerifying(false);
        return;
      }

      // Parse first and last name
      const nameParts = selectedStudent.name.trim().split(/\s+/);
      const firstName = nameParts[0] || selectedStudent.name;
      let lastName = nameParts.slice(1).join(' ');
      if (!lastName) {
        lastName = ' ';
      }

      const formData: StudentInfo = {
        firstName,
        lastName,
        classLevel: room.split('/')[0],
        room,
        studentNumber: selectedStudent.number
      };

      setShowConfirmModal(false);
      onSubmit(formData);
    } catch (err) {
      console.error('Error during start verification:', err);
      setVerificationError('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล โปรดลองใหม่อีกครั้ง');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleFormSubmit} className="space-y-5 w-full">
        {/* Room Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center justify-between">
            <span>1. เลือกชั้นเรียน</span>
            <span className="text-[11px] text-slate-400 font-normal">ทั้งหมด 12 ห้องเรียน</span>
          </label>
          <select
            required
            value={room}
            onChange={(e) => {
              setRoom(e.target.value);
              setSelectedStudentId('');
              setVerificationError(null);
            }}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 appearance-none shadow-sm cursor-pointer"
          >
            <option value="" disabled>-- กรุณาเลือกห้องเรียน --</option>
            {rooms.map(r => (
              <option key={r} value={r}>
                ชั้นมัธยมศึกษาปีที่ {r.replace('ม.', '')}
              </option>
            ))}
          </select>
        </div>

        {/* Student Name Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center justify-between">
            <span>2. เลือกรายชื่อผู้ทำแบบทดสอบ</span>
            {room && (
              <span className="text-[11px] text-indigo-600 font-semibold">
                ห้อง {room} ({filteredStudents.length} คน)
              </span>
            )}
          </label>
          <select
            required
            disabled={!room}
            value={selectedStudentId}
            onChange={(e) => {
              setSelectedStudentId(e.target.value);
              setVerificationError(null);
            }}
            className="w-full px-4 py-3 bg-white border-2 border-slate-200 hover:border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-800 appearance-none disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 shadow-sm cursor-pointer"
          >
            <option value="" disabled>
              {room ? "-- เลือกชื่อ-นามสกุลของคุณ --" : "กรุณาเลือกชั้นเรียนก่อน"}
            </option>
            {filteredStudents.map(s => {
              const { isCompleted, isLocked } = getStudentStatus(s);

              let label = `เลขที่ ${s.number} | ${s.name} (รหัส: ${s.studentId})`;
              if (isCompleted) {
                label = `✅ เลขที่ ${s.number} - ${s.name} [ทำแบบทดสอบแล้ว - คลิกดูผล]`;
              } else if (isLocked) {
                label = `🔒 เลขที่ ${s.number} - ${s.name} [กำลังทำแบบทดสอบอยู่บนเครื่องอื่น]`;
              }

              return (
                <option
                  key={s.studentId}
                  value={s.studentId}
                  disabled={isLocked && !isCompleted}
                  className={isCompleted ? 'text-emerald-700 bg-emerald-50/80 font-medium' : isLocked ? 'text-amber-600 bg-amber-50' : 'text-slate-900'}
                >
                  {label}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
            <span>* นักเรียนที่ทำแบบทดสอบแล้วสามารถเลือกชื่อเพื่อ <strong>ดูผลการประเมินย้อนหลัง</strong> ได้ตลอดเวลา</span>
          </p>
        </div>

        {/* Selected Student Info Preview & Status Card */}
        {selectedStudent && (
          <div className="space-y-3 animate-in fade-in duration-200">
            {/* If Student Already Completed: Show special Friendly Result Access Banner */}
            {selectedStudentStatus.isCompleted && selectedStudentStatus.result ? (
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-4.5 text-xs space-y-3 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-emerald-950 text-sm">
                      คุณได้ทำแบบทดสอบเรียบร้อยแล้ว
                    </h4>
                    <p className="text-emerald-800 text-[11px] mt-0.5 leading-relaxed">
                      ระบบได้บันทึกผลการทดสอบของ <strong>{selectedStudent.name}</strong> ไว้อย่างถาวรแล้ว (ดูได้จากทุกอุปกรณ์)
                    </p>
                  </div>
                </div>

                <div className="bg-white/80 rounded-xl p-3 border border-emerald-200/80 grid grid-cols-2 gap-2 text-slate-700 text-[11px]">
                  <div><span className="text-slate-400">ชื่อ-สกุล:</span> <strong className="text-slate-900">{selectedStudent.name}</strong></div>
                  <div><span className="text-slate-400">รหัส:</span> <strong className="text-slate-900">{selectedStudent.studentId}</strong></div>
                  <div><span className="text-slate-400">ชั้น/ห้อง:</span> <strong className="text-slate-900">{selectedStudent.room}</strong></div>
                  <div><span className="text-slate-400">เลขที่:</span> <strong className="text-slate-900">{selectedStudent.number}</strong></div>
                  {selectedStudentStatus.result.timestamp && (
                    <div className="col-span-2 text-slate-500 pt-1 border-t border-emerald-100 text-[10px]">
                      ⏱️ บันทึกผลเมื่อ: {new Date(selectedStudentStatus.result.timestamp).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => selectedStudentStatus.result && onViewResult(selectedStudentStatus.result)}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm cursor-pointer"
                >
                  <BarChart3 className="w-5 h-5" />
                  <span>📊 ดูผลการทดสอบของคุณ (คลิกที่นี่)</span>
                </button>
              </div>
            ) : (
              /* Standard Uncompleted Student Preview */
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-xs space-y-2">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-indigo-600" />
                  <span>ข้อมูลที่เลือก:</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-slate-700">
                  <div><span className="text-slate-400">ชื่อ-สกุล:</span> <strong className="text-slate-900">{selectedStudent.name}</strong></div>
                  <div><span className="text-slate-400">รหัส:</span> <strong className="text-slate-900">{selectedStudent.studentId}</strong></div>
                  <div><span className="text-slate-400">ชั้น/ห้อง:</span> <strong className="text-slate-900">{selectedStudent.room}</strong></div>
                  <div><span className="text-slate-400">เลขที่:</span> <strong className="text-slate-900">{selectedStudent.number}</strong></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Auto-save notification */}
        {selectedStudentHasAutosave && (
          <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl text-xs font-medium border border-emerald-200 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>พบข้อมูลที่ทำค้างไว้ ระบบจะโหลดคำตอบเดิมให้อัตโนมัติ</span>
          </div>
        )}

        {/* Main Action Button */}
        {selectedStudentStatus.isCompleted ? (
          <button
            type="submit"
            disabled={!selectedStudentId || !selectedStudentStatus.result}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-200 transition-all mt-4 flex justify-center items-center gap-2 text-sm cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>เข้าดูผลการประเมินของคุณ (ทำเสร็จแล้ว)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!selectedStudentId}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all mt-4 flex justify-center items-center gap-2 text-sm"
          >
            <span>ตรวจสอบและเริ่มทำแบบทดสอบ</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </form>

      {/* Confirmation Modal (ยืนยันตัวตนก่อนเริ่มทำแบบทดสอบจริง) */}
      {showConfirmModal && selectedStudent && (
        <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-6 relative">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">ยืนยันตัวตนผู้ทำแบบทดสอบ</h3>
                  <p className="text-xs text-indigo-100">กรุณาตรวจสอบข้อมูลของคุณให้ถูกต้องก่อนเริ่ม</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {verificationError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs space-y-2.5">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-medium leading-relaxed">{verificationError}</div>
                  </div>

                  {modalExistingResult && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowConfirmModal(false);
                        onViewResult(modalExistingResult);
                      }}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl transition flex items-center justify-center gap-2 text-xs shadow-sm cursor-pointer"
                    >
                      <BarChart3 className="w-4 h-4" />
                      <span>📊 คลิกเพื่อเปิดดูผลการทดสอบของคุณ</span>
                    </button>
                  )}
                </div>
              )}

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
                <div className="text-center pb-3 border-b border-slate-200">
                  <div className="text-xs text-slate-500 font-semibold mb-1">คุณคือผู้เข้าทำแบบทดสอบนี้ใช่หรือไม่?</div>
                  <div className="text-lg font-bold text-slate-900">{selectedStudent.name}</div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="text-slate-400 text-[11px] mb-0.5">ชั้นเรียน</div>
                    <div className="font-bold text-slate-800">{selectedStudent.room}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="text-slate-400 text-[11px] mb-0.5">เลขที่</div>
                    <div className="font-bold text-indigo-600 text-sm">{selectedStudent.number}</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200/60 shadow-xs">
                    <div className="text-slate-400 text-[11px] mb-0.5">รหัสนักเรียน</div>
                    <div className="font-bold text-slate-800">{selectedStudent.studentId}</div>
                  </div>
                </div>
              </div>

              {/* Warning Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>ข้อควรระวัง:</strong> นักเรียน 1 คนสามารถทำแบบทดสอบได้เพียง <strong>1 ครั้งเท่านั้น</strong> เมื่อส่งแล้วจะไม่สามารถทำใหม่ได้
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={handleConfirmAndStart}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm disabled:bg-indigo-400 cursor-pointer"
                >
                  {isVerifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>กำลังตรวจสอบข้อมูลและล็อกสิทธิ์...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>ถูกต้อง ยืนยันเริ่มทำแบบทดสอบ</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => {
                    setShowConfirmModal(false);
                    setModalExistingResult(null);
                    setVerificationError(null);
                  }}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl transition-colors text-xs cursor-pointer"
                >
                  ไม่ใช่ฉัน / ยกเลิกเพื่อเลือกใหม่
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
