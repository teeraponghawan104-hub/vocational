import { AssessmentResult } from './types';
import { normalizeName } from './studentData';
import { firestore } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';

export const syncOfflineData = async () => {
  // Firebase handles offline syncing automatically!
};

export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  const q = query(collection(firestore, 'locks'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const now = Date.now();
    const locks: string[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      // Locks expire after 10 minutes (600,000 ms) of inactivity
      if (now - data.timestamp < 600000) {
        locks.push(docSnap.id);
      }
    });
    callback(locks);
  });
  return unsubscribe;
};

export const acquireLock = async (studentId: string, sessionId: string): Promise<boolean> => {
  try {
    const lockRef = doc(firestore, 'locks', studentId);
    const lockSnap = await getDoc(lockRef);
    const now = Date.now();
    
    if (lockSnap.exists()) {
      const data = lockSnap.data();
      if (data.sessionId !== sessionId && now - data.timestamp < 600000) {
        return false; // locked by someone else
      }
    }
    
    await setDoc(lockRef, { sessionId, timestamp: now });
    return true;
  } catch (e) {
    console.error("Lock error:", e);
    return true; // fail open so students aren't blocked by db errors
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(firestore, 'locks', studentId);
    await setDoc(lockRef, { sessionId, timestamp: Date.now() }, { merge: true });
  } catch (e) {}
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(firestore, 'locks', studentId);
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists() && lockSnap.data().sessionId === sessionId) {
      await deleteDoc(lockRef);
    }
  } catch (e) {}
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, 'locks', studentId));
  } catch (e) {}
};

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  try {
    // Save to Firebase
    const docRef = doc(firestore, 'assessments', result.id);
    await setDoc(docRef, result);
  } catch (e) {
    console.error("Failed to save to Firebase:", e);
    throw new Error("Cannot save to server. Data is only saved on this device.");
  }
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const q = query(collection(firestore, 'assessments'), orderBy('timestamp', 'desc'));
    const snapshot = await getDocs(q);
    const assessments: AssessmentResult[] = [];
    snapshot.forEach(docSnap => {
      assessments.push(docSnap.data() as AssessmentResult);
    });
    return assessments;
  } catch (err) {
    console.warn("Notice fetching assessments:", err);
    return [];
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[], error?: string) => void): (() => void) => {
  const q = query(collection(firestore, 'assessments'), orderBy('timestamp', 'desc'));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const assessments: AssessmentResult[] = [];
    snapshot.forEach(docSnap => {
      assessments.push(docSnap.data() as AssessmentResult);
    });
    callback(assessments);
  }, (error) => {
    callback([], error.message);
  });
  return unsubscribe;
};

export const deleteAssessment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(firestore, 'assessments', id));
  } catch (err) {
    console.error("Error deleting assessment:", err);
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
