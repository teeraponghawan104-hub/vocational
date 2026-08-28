import { AssessmentResult } from './types';
import { normalizeName } from './studentData';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

export const syncOfflineData = async () => {};

export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  if (!supabase) return () => {};
  
  const fetchLocks = async () => {
    const { data } = await supabase.from('locks').select('*');
    const now = Date.now();
    const locks = (data || []).filter((l: any) => now - l.updated_at < 600000).map((l: any) => l.student_id);
    callback(locks);
  };
  
  fetchLocks();
  
  const channel = supabase
    .channel('locks_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'locks' }, () => fetchLocks())
    .subscribe();
    
  return () => { supabase.removeChannel(channel); };
};

export const acquireLock = async (studentId: string, sessionId: string): Promise<boolean> => {
  if (!supabase) return true;
  try {
    const { data } = await supabase.from('locks').select('*').eq('student_id', studentId).single();
    const now = Date.now();
    if (data && data.session_id !== sessionId && now - data.updated_at < 600000) {
      return false; // locked by someone else
    }
    await supabase.from('locks').upsert({ student_id: studentId, session_id: sessionId, updated_at: now });
    return true;
  } catch (e) {
    return true; // fail open
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  if (!supabase) return;
  try {
    await supabase.from('locks').upsert({ student_id: studentId, session_id: sessionId, updated_at: Date.now() });
  } catch (e) {}
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  if (!supabase) return;
  try {
    const { data } = await supabase.from('locks').select('*').eq('student_id', studentId).single();
    if (data && data.session_id === sessionId) {
      await supabase.from('locks').delete().eq('student_id', studentId);
    }
  } catch (e) {}
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  if (!supabase) return;
  try {
    await supabase.from('locks').delete().eq('student_id', studentId);
  } catch (e) {}
};

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  if (!supabase) {
    saveToLocalCache(result);
    throw new Error("Supabase is not configured.");
  }
  try {
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
    await Promise.race([
      supabase.from('assessments').upsert({ id: result.id, data: result }),
      timeoutPromise
    ]);
  } catch (e) {
    console.error("Failed to save to Supabase:", e);
    saveToLocalCache(result);
    throw new Error("Cannot save to server. Data is only saved on this device.");
  }
};

const saveToLocalCache = (result: AssessmentResult) => {
  try {
    const CACHE_KEY = 'voca_assess_cache';
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached: AssessmentResult[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    const filtered = cached.filter(a => a.id !== result.id);
    filtered.push(result);
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch (err) {}
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase.from('assessments').select('data').order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => row.data as AssessmentResult);
  } catch (err) {
    return [];
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[], error?: string) => void): (() => void) => {
  if (!supabase) {
    callback([], "Supabase is not configured.");
    return () => {};
  }
  
  const fetchAll = async () => {
    try {
      const { data } = await supabase.from('assessments').select('data').order('created_at', { ascending: false });
      if (data) callback(data.map((row: any) => row.data as AssessmentResult));
    } catch (e) {}
  };
  
  fetchAll();
  
  const channel = supabase
    .channel('assessments_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'assessments' }, () => fetchAll())
    .subscribe();
    
  return () => { supabase.removeChannel(channel); };
};

export const deleteAssessment = async (id: string): Promise<void> => {
  if (!supabase) return;
  try {
    await supabase.from('assessments').delete().eq('id', id);
  } catch (err) {}
};

export const checkStudentEligibilityRealTime = async (
  student: { room: string; studentNumber: string; fullName: string },
  sessionId: string
): Promise<{ canStart: boolean; reason?: string; existingResult?: AssessmentResult }> => {
  try {
    const normalizedTargetName = normalizeName(student.fullName);
    const assessments = await getAssessments();

    for (const a of assessments) {
      if (a.student.room === student.room && String(a.student.studentNumber).trim() === String(student.studentNumber).trim()) {
        return {
          canStart: false,
          reason: `นักเรียนเลขที่ ${student.studentNumber} ห้อง ${student.room} ได้ทำแบบทดสอบไปแล้ว`,
          existingResult: a
        };
      }
      const aFullName = normalizeName(`${a.student.firstName || ''} ${a.student.lastName || ''}`);
      if (aFullName && normalizedTargetName && aFullName === normalizedTargetName) {
        return {
          canStart: false,
          reason: `ชื่อ "${student.fullName}" ได้ทำแบบทดสอบไปแล้ว`,
          existingResult: a
        };
      }
    }
    return { canStart: true };
  } catch (err) {
    return { canStart: true };
  }
};
