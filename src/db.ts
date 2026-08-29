import { AssessmentResult } from './types';
import { normalizeName } from './studentData';
import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  query,
  writeBatch
} from 'firebase/firestore';

const ASSESSMENTS_COLLECTION = 'assessments';
const LOCKS_COLLECTION = 'locks';

// 1. Subscribe to Assessments (Real-time Cloud Sync)
export const subscribeToAssessments = (
  callback: (assessments: AssessmentResult[], error?: string) => void
): (() => void) => {
  try {
    const q = collection(db, ASSESSMENTS_COLLECTION);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        let results: AssessmentResult[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data) {
            results.push(data as AssessmentResult);
          }
        });
        
        // Deduplicate by room and studentNumber (keeping the most recent)
        results = results.sort((a, b) => b.timestamp - a.timestamp);
        const uniqueResults: AssessmentResult[] = [];
        const seen = new Set<string>();
        
        results.forEach(item => {
          const key = `${item.student.room}-${item.student.studentNumber}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueResults.push(item);
          }
        });
        
        callback(uniqueResults);
      },
      (error) => {
        console.error('Error in Firestore snapshot:', error);
        callback([], error.message);
      }
    );
    return unsubscribe;
  } catch (err: any) {
    console.error('Failed to subscribe to assessments:', err);
    return () => {};
  }
};

// 2. Get All Assessments from Cloud
export const getAssessments = async (): Promise<AssessmentResult[]> => {
  try {
    const querySnapshot = await getDocs(collection(db, ASSESSMENTS_COLLECTION));
    let results: AssessmentResult[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      if (data) {
        results.push(data as AssessmentResult);
      }
    });

    results = results.sort((a, b) => b.timestamp - a.timestamp);
    const uniqueResults: AssessmentResult[] = [];
    const seen = new Set<string>();
    
    results.forEach(item => {
      const key = `${item.student.room}-${item.student.studentNumber}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueResults.push(item);
      }
    });

    return uniqueResults;
  } catch (error) {
    console.error('Error fetching assessments from Cloud Firestore:', error);
    return [];
  }
};

// 3. Save Assessment directly to Cloud
export const saveAssessment = async (result: AssessmentResult): Promise<void> => {
  try {
    const docRef = doc(db, ASSESSMENTS_COLLECTION, result.id);
    await setDoc(docRef, result);
  } catch (error) {
    console.error('Error saving assessment to Cloud Firestore:', error);
    throw error;
  }
};

// 4. Delete Single Assessment
export const deleteAssessment = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, ASSESSMENTS_COLLECTION, id));
  } catch (err) {
    console.error('Error deleting assessment from Cloud Firestore:', err);
    throw err;
  }
};

// 5. Reset All Assessments (Clear Cloud DB & Local Storage)
export const resetAllAssessments = async (): Promise<void> => {
  try {
    // 1. Delete all assessments in Firestore
    const assessSnap = await getDocs(collection(db, ASSESSMENTS_COLLECTION));
    const batch = writeBatch(db);
    assessSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    // 2. Delete all locks in Firestore
    const locksSnap = await getDocs(collection(db, LOCKS_COLLECTION));
    locksSnap.forEach((docSnap) => {
      batch.delete(docSnap.ref);
    });

    await batch.commit();

    // 3. Clean up localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('autosave-') || key.startsWith('voca_') || key.startsWith('assessment_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (err) {
    console.error('Error resetting all assessments in Cloud Firestore:', err);
    throw err;
  }
};

// 6. Real-time Locks Management
export const subscribeToLocks = (callback: (lockedStudentIds: string[]) => void): (() => void) => {
  try {
    const q = collection(db, LOCKS_COLLECTION);
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const now = Date.now();
        const activeLocks: string[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          // Lock expires after 10 minutes
          if (data && now - (data.updatedAt || 0) < 600000) {
            activeLocks.push(docSnap.id);
          }
        });
        callback(activeLocks);
      },
      (error) => {
        console.warn('Error in locks snapshot:', error);
      }
    );
    return unsubscribe;
  } catch (e) {
    return () => {};
  }
};

export const acquireLock = async (studentId: string, sessionId: string): Promise<boolean> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    const now = Date.now();
    await setDoc(lockRef, { sessionId, updatedAt: now });
    return true;
  } catch (e) {
    return true; // Fail-open
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await setDoc(lockRef, { sessionId, updatedAt: Date.now() }, { merge: true });
  } catch (e) {}
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await deleteDoc(lockRef);
  } catch (e) {}
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await deleteDoc(lockRef);
  } catch (e) {}
};

// 7. Check if student can start test
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

// 8. Dummy export for compatibility
export const syncOfflineData = async () => {};
