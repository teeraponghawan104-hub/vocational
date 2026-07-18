import { AssessmentResult } from './types';
import { db } from './firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';

const COLLECTION_NAME = 'assessments';

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
