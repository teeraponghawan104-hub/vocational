import { AssessmentResult } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, onSnapshot, runTransaction, setDoc } from 'firebase/firestore';
import { normalizeName } from './studentData';

const COLLECTION_NAME = 'assessments';
const LOCKS_COLLECTION = 'student_locks';
const CACHE_ASSESSMENTS_KEY = 'vocational_cached_assessments_v1';
const CACHE_PENDING_KEY = 'vocational_pending_assessments_v1';

// Helper: Get cached assessments from localStorage
export const getCachedAssessments = (): AssessmentResult[] => {
  try {
    const raw = localStorage.getItem(CACHE_ASSESSMENTS_KEY);
    if (raw) {
      return JSON.parse(raw) as AssessmentResult[];
    }
  } catch (e) {
    console.warn("Failed to parse cached assessments:", e);
  }
  return [];
};

// Helper: Save assessments to localStorage cache
export const setCachedAssessments = (items: AssessmentResult[]): void => {
  try {
    localStorage.setItem(CACHE_ASSESSMENTS_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to update cached assessments:", e);
  }
};

// Helper: Merge remote and local assessments cleanly without duplicates
const mergeAssessments = (remote: AssessmentResult[], local: AssessmentResult[]): AssessmentResult[] => {
  const map = new Map<string, AssessmentResult>();
  
  local.forEach(item => {
    const key = item.id || `${item.student.room}-${item.student.studentNumber}-${item.timestamp}`;
    map.set(key, item);
  });

  remote.forEach(item => {
    const key = item.id || `${item.student.room}-${item.student.studentNumber}-${item.timestamp}`;
    map.set(key, item);
  });

  return Array.from(map.values());
};

export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  try {
    return onSnapshot(
      collection(db, LOCKS_COLLECTION),
      (querySnapshot) => {
        const lockedIds: string[] = [];
        const now = Date.now();
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.is_locked) {
            const lockedAt = data.locked_at || 0;
            // 30 minutes expiration
            if (now - lockedAt < 30 * 60 * 1000) {
              lockedIds.push(doc.id);
            }
          }
        });
        callback(lockedIds);
      },
      (err) => {
        // Graceful handling when Firestore quota is exceeded or offline
        if (err?.message?.includes('Quota exceeded')) {
          console.warn("Firestore quota exceeded for locks. Running in offline/cached mode.");
        } else {
          console.warn("Locks listener notice:", err?.message || err);
        }
        callback([]);
      }
    );
  } catch (e) {
    callback([]);
    return () => {};
  }
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
          // Check timeout (30 minutes)
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
    // If quota exceeded or network error, allow test to proceed locally
    if (err?.message?.includes('Quota exceeded')) {
      console.warn("Firestore quota reached during lock acquisition. Allowing local session.");
      return true;
    }
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

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  // 1. Always immediately save to local cache
  const cached = getCachedAssessments();
  const updatedCache = mergeAssessments([result], cached);
  setCachedAssessments(updatedCache);

  // 2. Attempt remote Firestore save
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), result);
    result.id = docRef.id;
    // Update cached entry with remote doc id
    setCachedAssessments(mergeAssessments([result], updatedCache));
  } catch (err: any) {
    if (err?.message?.includes('Quota exceeded')) {
      console.warn("Firestore daily quota reached. Assessment saved safely to local storage.");
      // Store in pending queue to sync later if needed
      try {
        const pendingRaw = localStorage.getItem(CACHE_PENDING_KEY);
        const pending = pendingRaw ? JSON.parse(pendingRaw) : [];
        pending.push(result);
        localStorage.setItem(CACHE_PENDING_KEY, JSON.stringify(pending));
      } catch (pe) {}
      return; // Do not throw, keep user experience seamless
    }
    console.warn("Notice saving assessment to Firebase (saved to cache):", err?.message || err);
  }
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  const localData = getCachedAssessments();
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const remoteAssessments: AssessmentResult[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AssessmentResult;
      remoteAssessments.push({ ...data, id: doc.id });
    });
    const merged = mergeAssessments(remoteAssessments, localData);
    setCachedAssessments(merged);
    return merged;
  } catch (err: any) {
    if (err?.message?.includes('Quota exceeded')) {
      console.warn("Firestore quota reached. Serving data from local cache.");
    } else {
      console.warn("Notice fetching assessments from Firebase (using cache):", err?.message || err);
    }
    return localData;
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[]) => void): (() => void) => {
  // Immediately emit cached assessments so UI is responsive
  const initialCache = getCachedAssessments();
  callback(initialCache);

  try {
    return onSnapshot(
      collection(db, COLLECTION_NAME),
      (querySnapshot) => {
        const remoteAssessments: AssessmentResult[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data() as AssessmentResult;
          remoteAssessments.push({ ...data, id: doc.id });
        });
        const merged = mergeAssessments(remoteAssessments, getCachedAssessments());
        setCachedAssessments(merged);
        callback(merged);
      },
      (err) => {
        if (err?.message?.includes('Quota exceeded')) {
          console.warn("Firestore quota reached for assessments listener. Serving local cache.");
        } else {
          console.warn("Assessments listener notice:", err?.message || err);
        }
        callback(getCachedAssessments());
      }
    );
  } catch (e) {
    callback(getCachedAssessments());
    return () => {};
  }
};

export const deleteAssessment = async (id: string): Promise<void> => {
  // Remove from local cache
  const cached = getCachedAssessments().filter(a => a.id !== id);
  setCachedAssessments(cached);

  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err: any) {
    if (err?.message?.includes('Quota exceeded')) {
      console.warn("Firestore quota reached during deletion. Removed from local cache.");
      return;
    }
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
      // Check matching room + number
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

      // Check matching normalized full name
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
      // If Firestore read fails due to quota, proceed gracefully
    }

    return { canStart: true };
  } catch (err) {
    console.warn("Notice in eligibility check:", err);
    return { canStart: true };
  }
};

