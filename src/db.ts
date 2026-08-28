import { AssessmentResult } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { normalizeName } from './studentData';

const COLLECTION_NAME = 'assessments';
const LOCKS_COLLECTION = 'student_locks';

export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  return onSnapshot(
    collection(db, LOCKS_COLLECTION),
    (querySnapshot) => {
      const lockedIds: string[] = [];
      const now = Date.now();
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.is_locked) {
          const lockedAt = data.locked_at || 0;
          if (now - lockedAt < 30 * 60 * 1000) {
            lockedIds.push(doc.id);
          }
        }
      });
      callback(lockedIds);
    },
    (err) => {
      console.warn("Locks listener error/quota:", err?.message || err);
      callback([]);
    }
  );
};

export const acquireLock = async (studentId: string, sessionId: string): Promise<boolean> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    return await runTransaction(db, async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      const now = Date.now();
      
      if (lockSnap.exists()) {
        const data = lockSnap.data();
        if (data.is_locked) {
          const lockedAt = data.locked_at || 0;
          if (now - lockedAt < 30 * 60 * 1000 && data.locked_by !== sessionId) {
            return false;
          }
        }
      }
      
      transaction.set(lockRef, {
        is_locked: true,
        locked_by: sessionId,
        locked_at: now
      });
      return true;
    });
  } catch (err: any) {
    console.warn("Notice acquiring lock:", err?.message || err);
    return true; // Fallback to allow student to take test
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await setDoc(lockRef, {
      is_locked: true,
      locked_by: sessionId,
      locked_at: Date.now()
    }, { merge: true });
  } catch (err: any) {
    // Silent fail if quota exceeded
  }
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await setDoc(lockRef, {
      is_locked: false,
      locked_by: null,
      locked_at: null
    }, { merge: true });
  } catch (err) {
    // Silent catch
  }
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await setDoc(lockRef, {
      is_locked: false,
      locked_by: null,
      locked_at: null
    }, { merge: true });
  } catch (err) {
    console.warn("Notice force releasing lock:", err);
  }
};

const CACHE_KEY = 'voca_assess_cache';

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  // Always save to cache first
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached: AssessmentResult[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    cached.push(result);
    localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (e) {}

  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), result);
    result.id = docRef.id;
    
    // Update cache with the assigned ID
    try {
      const cachedRaw = localStorage.getItem(CACHE_KEY);
      if (cachedRaw) {
        const cached: AssessmentResult[] = JSON.parse(cachedRaw);
        const match = cached.find(a => a.timestamp === result.timestamp && a.student.studentNumber === result.student.studentNumber);
        if (match) {
          match.id = result.id;
          localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
        }
      }
    } catch (e) {}
  } catch (err: any) {
    console.warn("Notice saving assessment to Firebase:", err?.message || err);
    throw err;
  }
};

const mergeWithCache = (remote: AssessmentResult[]): AssessmentResult[] => {
  try {
    const cachedRaw = localStorage.getItem(CACHE_KEY);
    const cached: AssessmentResult[] = cachedRaw ? JSON.parse(cachedRaw) : [];
    const map = new Map<string, AssessmentResult>();
    
    // Add local first
    cached.forEach(a => {
      const key = a.id || `${a.student.room}-${a.student.studentNumber}-${a.timestamp}`;
      map.set(key, a);
    });
    
    // Overwrite with remote
    remote.forEach(a => {
      const key = a.id || `${a.student.room}-${a.student.studentNumber}-${a.timestamp}`;
      map.set(key, a);
    });
    
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

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const remoteAssessments: AssessmentResult[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AssessmentResult;
      remoteAssessments.push({ ...data, id: doc.id });
    });
    return mergeWithCache(remoteAssessments);
  } catch (err: any) {
    console.warn("Notice fetching assessments from Firebase:", err?.message || err);
    return getCachedOnly();
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[], error?: string) => void): (() => void) => {
  // Emit initial cache immediately
  callback(getCachedOnly());

  return onSnapshot(
    collection(db, COLLECTION_NAME),
    (querySnapshot) => {
      const remoteAssessments: AssessmentResult[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AssessmentResult;
        remoteAssessments.push({ ...data, id: doc.id });
      });
      callback(mergeWithCache(remoteAssessments));
    },
    (err) => {
      console.warn("Assessments listener error:", err?.message || err);
      callback(getCachedOnly(), err?.message || "Error connecting to database");
    }
  );
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
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err: any) {
    console.error("Notice deleting assessment:", err?.message || err);
  }
};

/**
 * Real-time verification before allowing a student to start
 */
export const checkStudentEligibilityRealTime = async (
  student: { room: string; studentNumber: string; fullName: string },
  sessionId: string
): Promise<{ canStart: boolean; reason?: string; existingResult?: AssessmentResult }> => {
  try {
    const normalizedTargetName = normalizeName(student.fullName);
    const assessments = await getAssessments();

    // 1. Check duplicate against all submitted assessments
    for (const a of assessments) {
      if (
        a.student.room === student.room &&
        String(a.student.studentNumber).trim() === String(student.studentNumber).trim()
      ) {
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

    // 2. Check active lock (someone currently doing test)
    try {
      const lockId = `${student.room}-${student.studentNumber}`.replace(/\//g, '_');
      const lockRef = doc(db, LOCKS_COLLECTION, lockId);
      const lockSnap = await getDoc(lockRef);
      if (lockSnap.exists()) {
        const data = lockSnap.data();
        const now = Date.now();
        if (data.is_locked && (now - (data.locked_at || 0) < 30 * 60 * 1000) && data.locked_by !== sessionId) {
          return {
            canStart: false,
            reason: `นักเรียนคนนี้กำลังทำแบบทดสอบอยู่บนอุปกรณ์อื่น กรุณารอสักครู่หรือติดต่อครูผู้สอน`
          };
        }
      }
    } catch (lockErr) {
      // If Firestore read fails, proceed gracefully
    }

    return { canStart: true };
  } catch (err) {
    console.warn("Notice in eligibility check:", err);
    return { canStart: true };
  }
};

