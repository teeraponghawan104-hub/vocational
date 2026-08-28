import { AssessmentResult } from './types';
import { normalizeName } from './studentData';

const CACHE_KEY = 'voca_assess_cache';

export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  callback([]);
  return () => {};
};

export const acquireLock = async (studentId: string, sessionId: string): Promise<boolean> => {
  return true;
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {};
export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {};
export const forceReleaseLock = async (studentId: string): Promise<void> => {};

const mergeWithCache = (remote: AssessmentResult[]): AssessmentResult[] => {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached: AssessmentResult[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    const map = new Map<string, AssessmentResult>();
    
    cached.forEach(a => map.set(a.id || `${a.student.room}-${a.student.studentNumber}-${a.timestamp}`, a));
    remote.forEach(a => map.set(a.id || `${a.student.room}-${a.student.studentNumber}-${a.timestamp}`, a));
    
    const merged = Array.from(map.values());
    localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    return merged;
  } catch (e) {
    return remote;
  }
};

const getCachedOnly = (): AssessmentResult[] => {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    return cachedRaw ? JSON.parse(cachedRaw) : [];
  } catch (e) {
    return [];
  }
};

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached: AssessmentResult[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    cached.push(result);
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {}

  try {
    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result)
    });
    if (!res.ok) throw new Error('Failed to save to database');
    const data = await res.json();
    result.id = data.id;
  } catch (err: any) {
    console.warn("Notice saving assessment:", err?.message || err);
  }
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const res = await fetch('/api/assessments');
    if (!res.ok) throw new Error('Failed to fetch');
    const remoteAssessments = await res.json();
    return mergeWithCache(remoteAssessments);
  } catch (err: any) {
    console.warn("Notice fetching assessments:", err?.message || err);
    return getCachedOnly();
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[], error?: string) => void): (() => void) => {
  callback(getCachedOnly());

  let intervalId: any;
  
  const fetchAndCallback = async () => {
    try {
      const res = await fetch('/api/assessments');
      if (res.ok) {
        const remoteAssessments = await res.json();
        callback(mergeWithCache(remoteAssessments));
      }
    } catch (e) {}
  };

  fetchAndCallback();
  intervalId = setInterval(fetchAndCallback, 5000);

  return () => clearInterval(intervalId);
};

export const deleteAssessment = async (id: string): Promise<void> => {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached: AssessmentResult[] = JSON.parse(cachedRaw);
      const updated = cached.filter(a => a.id !== id);
      localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
    }
  } catch (e) {}

  try {
    await fetch(`/api/assessments/${id}`, { method: 'DELETE' });
  } catch (err: any) {
    console.error("Notice deleting assessment:", err?.message || err);
  }
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
          reason: `นักเรียนเลขที่ ${student.studentNumber} ห้อง ${student.room} ได้ทำแบบทดสอบไปแล้ว กรุณาตรวจสอบชื่อของคุณอีกครั้ง หากต้องการทำใหม่ กรุณาติดต่อครูผู้สอน`,
          existingResult: a
        };
      }

      const aFullName = normalizeName(`${a.student.firstName || ''} ${a.student.lastName || ''}`);
      if (aFullName && normalizedTargetName && aFullName === normalizedTargetName) {
        return {
          canStart: false,
          reason: `ชื่อ "${student.fullName}" ได้ทำแบบทดสอบไปแล้ว กรุณาตรวจสอบชื่อของคุณอีกครั้ง หากต้องการทำใหม่ กรุณาติดต่อครูผู้สอน`,
          existingResult: a
        };
      }
    }
    return { canStart: true };
  } catch (err) {
    return { canStart: true };
  }
};

