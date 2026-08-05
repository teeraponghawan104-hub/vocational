import { AssessmentResult } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot, getDoc, setDoc, updateDoc } from 'firebase/firestore';

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
            lockedIds.push(doc.id); // doc.id is studentId (e.g. "room-number")
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
    const lockSnap = await getDoc(lockRef);
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
    
    await setDoc(lockRef, {
      is_locked: true,
      locked_by: sessionId,
      locked_at: now
    });
    return true;
  } catch (err) {
    console.error("Error acquiring lock:", err);
    // If network fails, we allow them to proceed so they aren't permanently locked out
    return true;
  }
};

export const renewLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists() && lockSnap.data().locked_by === sessionId) {
      await updateDoc(lockRef, {
        locked_at: Date.now()
      });
    }
  } catch (err) {
    console.error("Error renewing lock:", err);
  }
};

export const releaseLock = async (studentId: string, sessionId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    const lockSnap = await getDoc(lockRef);
    if (lockSnap.exists() && lockSnap.data().locked_by === sessionId) {
      await updateDoc(lockRef, {
        is_locked: false,
        locked_by: null,
        locked_at: null
      });
    }
  } catch (err) {
    console.error("Error releasing lock:", err);
  }
};

export const forceReleaseLock = async (studentId: string): Promise<void> => {
  try {
    const lockRef = doc(db, LOCKS_COLLECTION, studentId);
    await updateDoc(lockRef, {
      is_locked: false,
      locked_by: null,
      locked_at: null
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
      // Use the firestore document ID if available
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
      callback([]); // Optional error handling, clear or keep previous state.
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
