import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "dogwood-provider-lcf5x",
  appId: "1:462562646689:web:d002cbc35d38f921706ee0",
  apiKey: "AIzaSyCqCrkizf9tfbLyZB8Hk7c8p6SPWMfDdHs",
  authDomain: "dogwood-provider-lcf5x.firebaseapp.com",
  storageBucket: "dogwood-provider-lcf5x.firebasestorage.app",
  messagingSenderId: "462562646689"
};

export const app = initializeApp(firebaseConfig);
export const firestore = getFirestore(app);

// Enable offline persistence
enableIndexedDbPersistence(firestore).catch((err) => {
  console.warn("Firebase persistence error:", err);
});
