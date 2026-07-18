import React, { useState, useMemo, useEffect } from 'react';
import { StudentInfo, AssessmentResult } from '../types';
import { rooms, students } from '../studentData';
import { subscribeToAssessments } from '../db';

interface Props {
  onSubmit: (info: StudentInfo) => void;
}

export default function StudentForm({ onSubmit }: Props) {
  const [room, setRoom] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [completedStudentIds, setCompletedStudentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const unsubscribe = subscribeToAssessments((results) => {
      const ids = new Set<string>();
      results.forEach(r => {
        // Find student ID by matching room and number
        const s = students.find(s => s.room === r.student.room && s.number === r.student.studentNumber);
        if (s) {
          ids.add(s.studentId);
        }
      });
      setCompletedStudentIds(ids);
    });

    return () => unsubscribe();
  }, []);

  const filteredStudents = useMemo(() => {
    if (!room) return [];
    return students.filter(s => s.room === room).sort((a, b) => parseInt(a.number) - parseInt(b.number));
  }, [room]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!room || !selectedStudentId) {
      alert('กรุณาเลือกชั้นเรียนและชื่อ');
      return;
    }
    
    if (completedStudentIds.has(selectedStudentId)) {
      alert('นักเรียนคนนี้ได้ทำแบบทดสอบไปแล้ว หากต้องการทำใหม่ กรุณาติดต่อครูผู้สอนเพื่อลบข้อมูลเดิม');
      return;
    }
    
    const student = students.find(s => s.studentId === selectedStudentId);
    if (!student) return;

    // Split name into first and last
    const nameParts = student.name.split(/\s+/);
    const firstName = nameParts[0];
    let lastName = nameParts.slice(1).join(' ');
    
    // If there is no space in the name, set a fallback for lastName to avoid empty strings
    if (!lastName) {
      lastName = ' ';
    }

    const formData: StudentInfo = {
      firstName,
      lastName,
      classLevel: room.split('/')[0],
      room,
      studentNumber: student.number
    };

    onSubmit(formData);
  };

  const selectedStudentHasAutosave = useMemo(() => {
    if (!room || !selectedStudentId) return false;
    const student = students.find(s => s.studentId === selectedStudentId);
    if (!student) return false;
    const key = `autosave-${room}-${student.number}`;
    return !!localStorage.getItem(key);
  }, [room, selectedStudentId]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 w-full">
      
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">เลือกชั้นเรียน</label>
        <select
          required
          value={room}
          onChange={(e) => {
            setRoom(e.target.value);
            setSelectedStudentId(''); // reset student when room changes
          }}
          className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors font-medium text-slate-800 appearance-none"
        >
          <option value="" disabled>เลือกห้องเรียน...</option>
          {rooms.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-xs font-bold uppercase tracking-widest text-slate-500 mb-1.5">เลือกรายชื่อนักเรียน</label>
        <select
          required
          disabled={!room}
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="w-full px-4 py-3 bg-white border-2 border-slate-100 rounded-xl focus:ring-0 focus:border-indigo-500 outline-none transition-colors font-medium text-slate-800 appearance-none disabled:bg-slate-50 disabled:text-slate-400"
        >
          <option value="" disabled>{room ? "เลือกชื่อ..." : "กรุณาเลือกชั้นเรียนก่อน"}</option>
          {filteredStudents.map(s => {
            const isCompleted = completedStudentIds.has(s.studentId);
            return (
              <option key={s.studentId} value={s.studentId} disabled={isCompleted}>
                เลขที่ {s.number} - {s.name} {isCompleted ? '(ทำแบบทดสอบแล้ว)' : ''}
              </option>
            );
          })}
        </select>
      </div>

      {selectedStudentHasAutosave && (
        <div className="bg-indigo-50 text-indigo-700 p-3 rounded-xl text-sm font-medium border border-indigo-100 flex items-center gap-2">
          <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          ระบบจะโหลดข้อมูลที่ทำค้างไว้ขึ้นมาให้อัตโนมัติ
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedStudentId || completedStudentIds.has(selectedStudentId)}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:shadow-none text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all mt-6 flex justify-center items-center gap-2"
      >
        เริ่มทำแบบทดสอบ
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
      </button>
    </form>
  );
}
