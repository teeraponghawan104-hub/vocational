import { AssessmentResult } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, onSnapshot, runTransaction } from 'firebase/firestore';
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
          if (now - lockedAt < 15 * 1000) {
            lockedIds.push(doc.id); // doc.id is formatted "room-number" (e.g. "ม.1_1-1")
          }
        }
      });
      callback(lockedIds);
    },
    (err) => {
      console.error("Failed to listen for locks:", err);
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
          // Check timeout (15 seconds = 15 * 1000)
          const lockedAt = data.locked_at || 0;
          if (now - lockedAt < 15 * 1000 && data.locked_by !== sessionId) {
            return false; // Locked by someone else and not expired
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
  } catch (err) {
    console.error("Error acquiring lock:", err);
    return false;
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await runTransaction(db, async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists() && lockSnap.data().locked_by === sessionId) {
        transaction.update(lockRef, {
          locked_at: Date.now()
        });
      }
    });
  } catch (err) {
    console.error("Error renewing lock:", err);
  }
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await runTransaction(db, async (transaction) => {
      const lockSnap = await transaction.get(lockRef);
      if (lockSnap.exists() && lockSnap.data().locked_by === sessionId) {
        transaction.update(lockRef, {
          is_locked: false,
          locked_by: null,
          locked_at: null
        });
      }
    });
  } catch (err) {
    console.error("Error releasing lock:", err);
  }
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await runTransaction(db, async (transaction) => {
      transaction.update(lockRef, {
        is_locked: false,
        locked_by: null,
        locked_at: null
      });
    });
  } catch (err) {
    console.error("Error force releasing lock:", err);
  }
};

export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  try {
    const docRef = await addDoc(collection(db, COLLECTION_NAME), result);
    result.id = docRef.id;
  } catch (err) {
    console.error("Error saving assessment to Firebase:", err);
    throw err;
  }
};

export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const assessments: AssessmentResult[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data() as AssessmentResult;
      assessments.push({ ...data, id: doc.id });
    });
    return assessments;
  } catch (err) {
    console.error("Failed to fetch assessments from Firebase:", err);
    return [];
  }
};

export const subscribeToAssessments = (callback: (assessments: AssessmentResult[]) => void): (() => void) => {
  return onSnapshot(
    collection(db, COLLECTION_NAME),
    (querySnapshot) => {
      const assessments: AssessmentResult[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as AssessmentResult;
        assessments.push({ ...data, id: doc.id });
      });
      callback(assessments);
    },
    (err) => {
      console.error("Failed to listen for assessments:", err);
      callback([]);
    }
  );
};

export const deleteAssessment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
  } catch (err) {
    console.error("Failed to delete assessment from Firebase:", err);
    throw err;
  }
};

/**
 * Real-time atomic verification before allowing a student to start
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
    const lockId = `${student.room}-${student.studentNumber}`.replace(/\//g, '_');
    const lockRef = doc(db, LOCKS_COLLECTION, lockId);
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists()) {
      const data = lockSnap.data();
      const now = Date.now();
      if (data.is_locked && (now - (data.locked_at || 0) < 15 * 1000) && data.locked_by !== sessionId) {
        return {
          canStart: false,
          reason: `นักเรียนคนนี้กำลังทำแบบทดสอบอยู่บนอุปกรณ์อื่น กรุณารอสักครู่หรือติดต่อครูผู้สอน`
        };
      }
    }

    return { canStart: true };
  } catch (err) {
    console.error("Error in real-time eligibility check:", err);
    // Allow fallback if temporary network issue but log warning
    return { canStart: true };
  }
};
