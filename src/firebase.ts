import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App with user's official project configuration
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication
export const auth = getAuth(app);

// Safe initialization of Firebase Realtime Database
let rtdbInstance: Database | null = null;
try {
  rtdbInstance = getDatabase(app);
} catch (error) {
  console.warn('Realtime Database initialization info:', error);
}
export const rtdb = rtdbInstance;

// Safe initialization of Firebase Firestore Database
let dbInstance: Firestore | null = null;
try {
  const databaseId = (firebaseConfig as any).firestoreDatabaseId;
  dbInstance = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
} catch (error) {
  console.warn('Firestore Database initialization info:', error);
}
export const db = dbInstance;

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
  };
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
    path,
  };
  console.warn('Firebase Operation Notice: ', JSON.stringify(errInfo));
  return errInfo;
}
