import { AssessmentResult } from './types';
import { normalizeName } from './studentData';

const CACHE_KEY = 'voca_assess_cache';

const getLocalCache = (): AssessmentResult[] => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveToLocalCache = (result: AssessmentResult) => {
  try {
    const cached = getLocalCache();
    const filtered = cached.filter((a) => a.id !== result.id);
    filtered.push(result);
    localStorage.setItem(CACHE_KEY, JSON.stringify(filtered));
  } catch (e) {}
};

export const syncOfflineData = async () => {
  try {
    const cached = getLocalCache();
    if (cached.length === 0) return;

    for (const item of cached) {
      try {
        await fetch('/api/assessments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        });
      } catch (e) {}
    }
  } catch (e) {}
};

export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  let isSubscribed = true;

  const fetchLocks = async () => {
    try {
      const res = await fetch('/api/locks');
      if (res.ok) {
        const data = await res.json();
        if (isSubscribed && Array.isArray(data.locks)) {
          callback(data.locks);
        }
      }
    } catch (e) {}
  };

  fetchLocks();
  const interval = setInterval(fetchLocks, 4000);

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
};

export const acquireLock = async (studentId: string, sessionId: string): Promise<boolean> => {
  try {
    const res = await fetch('/api/locks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, sessionId }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.acquired ?? true;
    }
    return true;
  } catch (e) {
    return true; // Fail-open
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    await fetch('/api/locks', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, sessionId }),
    });
  } catch (e) {}
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    await fetch(`/api/locks?studentId=${encodeURIComponent(studentId)}&sessionId=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  } catch (e) {}
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  try {
    await fetch(`/api/locks?studentId=${encodeURIComponent(studentId)}&force=true`, {
      method: 'DELETE',
    });
  } catch (e) {}
};

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  saveToLocalCache(result);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    const res = await fetch('/api/assessments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(result),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('API error saving assessment:', errData);
    }
  } catch (e) {
    console.warn('Network error saving assessment, preserved in offline cache:', e);
  }
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const res = await fetch('/api/assessments');
    if (res.ok) {
      const json = await res.json();
      if (Array.isArray(json.data)) {
        return json.data;
      }
    }
  } catch (e) {
    console.warn('Failed to fetch from API, falling back to local cache:', e);
  }
  return getLocalCache();
};

export const subscribeToAssessments = (
  callback: (assessments: AssessmentResult[], error?: string) => void
): (() => void) => {
  let isSubscribed = true;

  const fetchAll = async () => {
    try {
      const res = await fetch('/api/assessments');
      if (res.ok) {
        const json = await res.json();
        if (isSubscribed && Array.isArray(json.data)) {
          callback(json.data);
          return;
        }
      }
    } catch (e) {
      if (isSubscribed) {
        callback(getLocalCache());
      }
    }
  };

  fetchAll();
  const interval = setInterval(fetchAll, 3500);

  return () => {
    isSubscribed = false;
    clearInterval(interval);
  };
};

export const deleteAssessment = async (id: string): Promise<void> => {
  try {
    // Remove from local cache
    const cached = getLocalCache().filter((a) => a.id !== id);
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));

    await fetch(`/api/assessments?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (err) {
    console.error('Error deleting assessment:', err);
  }
};

export const checkStudentEligibilityRealTime = async (
  student: { room: string; studentNumber: string; fullName: string },
  _sessionId: string
): Promise<{ canStart: boolean; reason?: string; existingResult?: AssessmentResult }> => {
  try {
    const normalizedTargetName = normalizeName(student.fullName);
    const assessments = await getAssessments();

    for (const a of assessments) {
      if (
        a.student.room === student.room &&
        String(a.student.studentNumber).trim() === String(student.studentNumber).trim()
      ) {
        return {
          canStart: false,
          reason: `นักเรียนเลขที่ ${student.studentNumber} ห้อง ${student.room} ได้ทำแบบทดสอบไปแล้ว`,
          existingResult: a,
        };
      }
      const aFullName = normalizeName(`${a.student.firstName || ''} ${a.student.lastName || ''}`);
      if (aFullName && normalizedTargetName && aFullName === normalizedTargetName) {
        return {
          canStart: false,
          reason: `ชื่อ "${student.fullName}" ได้ทำแบบทดสอบไปแล้ว`,
          existingResult: a,
        };
      }
    }
    return { canStart: true };
  } catch (err) {
    return { canStart: true };
  }
};
