import { AssessmentResult } from './types';
import { normalizeName } from './studentData';

const CACHE_KEY = 'voca_assess_cache';

export const syncOfflineData = async () => {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    if (!cachedRaw) return;
    const cached: AssessmentResult[] = JSON.parse(cachedRaw);
    if (cached.length === 0) return;
    
    let remaining: AssessmentResult[] = [];
    for (const result of cached) {
      try {
        const res = await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(result)
        });
        if (!res.ok) {
          remaining.push(result);
        }
      } catch (e) {
        remaining.push(result);
      }
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(remaining));
  } catch (e) {}
};

// Try to auto-sync when the module loads
if (typeof window !== 'undefined') {
  setTimeout(syncOfflineData, 2000);
}

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

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  let savedOk = false;
  
  // Try sending to server with up to 3 attempts
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('/api/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      });
      if (res.ok) {
        const data = await res.json();
        if (data.id) result.id = data.id;
        savedOk = true;
        break;
      }
    } catch (err: any) {
      console.warn(`Attempt ${attempt} saving assessment failed:`, err?.message || err);
      await new Promise(r => setTimeout(r, 800));
    }
  }

  // Backup to localStorage
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached: AssessmentResult[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    const filtered = cached.filter(a => a.id !== result.id);
    filtered.push(result);
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch (e) {}

  if (!savedOk) {
    console.error("Critical: failed to reach /api/assessments after 3 attempts");
    throw new Error("Cannot save to server. Data is only saved on this device.");
  }
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const res = await fetch('/api/assessments?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch');
    const remoteAssessments: AssessmentResult[] = await res.json();
    return remoteAssessments;
  } catch (err: any) {
    console.warn("Notice fetching assessments:", err?.message || err);
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      return cachedRaw ? JSON.parse(cachedRaw) : [];
    } catch (e) {
      return [];
    }
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[], error?: string) => void): (() => void) => {
  let isMounted = true;
  let intervalId: any;
  
  const fetchAndCallback = async () => {
    try {
      const res = await fetch('/api/assessments?t=' + Date.now(), { cache: 'no-store' });
      if (res.ok && isMounted) {
        const remoteAssessments: AssessmentResult[] = await res.json();
        callback(remoteAssessments);
      }
    } catch (e) {}
  };

  fetchAndCallback();
  intervalId = setInterval(fetchAndCallback, 2500);

  return () => {
    isMounted = false;
    clearInterval(intervalId);
  };
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

