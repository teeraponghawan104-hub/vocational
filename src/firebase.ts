import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Silence verbose connection warnings during temporary offline/quota limits
setLogLevel('error');

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true
  },
  firebaseConfig.firestoreDatabaseId
);


