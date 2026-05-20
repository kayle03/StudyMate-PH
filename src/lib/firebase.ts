import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, EmailAuthProvider } from "firebase/auth";
import { getFirestore, doc, runTransaction, increment, arrayUnion } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
export const emailProvider = new EmailAuthProvider();

export const awardPoints = async (userId: string, points: number) => {
  try {
    const userRef = doc(db, "users", userId);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) return;
      
      const currentPoints = (userDoc.data().points || 0) + points;
      
      let rank = userDoc.data().rank || "Beginner";
      const badges = userDoc.data().badges || [];
      
      // Basic rank progression
      if (currentPoints >= 1000) rank = "Master";
      else if (currentPoints >= 500) rank = "Scholar";
      else if (currentPoints >= 200) rank = "Achiever";
      else if (currentPoints >= 50) rank = "Student";
      
      const updateData: any = {
        points: increment(points),
        rank: rank
      };
      
      // Award badges based on milestones
      if (currentPoints >= 100 && !badges.includes("Bronze Contributor")) {
        updateData.badges = arrayUnion("Bronze Contributor");
      }
      if (currentPoints >= 500 && !badges.includes("Silver Contributor")) {
        updateData.badges = arrayUnion("Silver Contributor");
      }
      if (currentPoints >= 1000 && !badges.includes("Gold Legend")) {
        updateData.badges = arrayUnion("Gold Legend");
      }
      
      transaction.update(userRef, updateData);
    });
  } catch (err) {
    console.error("Gamification error:", err);
  }
};

export const deductPoints = async (userId: string, points: number) => {
  try {
    const userRef = doc(db, "users", userId);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) return;
      
      const currentPoints = userDoc.data().points || 0;
      if (currentPoints < points) {
        throw new Error("Insufficient points");
      }
      
      transaction.update(userRef, {
        points: currentPoints - points
      });
    });
    return true;
  } catch (err) {
    console.error("Deduct points error:", err);
    throw err;
  }
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  const jsonErr = JSON.stringify(errInfo);
  console.error('Firestore Error: ', jsonErr);
  // Also alert for easier debugging by user
  if (errInfo.error.includes('Missing or insufficient permissions')) {
    alert(`DEBUG: Permission Denied at ${path} [${operationType}]. Please check if you are a member.`);
  } else {
    alert(`DEBUG Firestore Error: ${errInfo.error}`);
  }
  throw new Error(jsonErr);
}
