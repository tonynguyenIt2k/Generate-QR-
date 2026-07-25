import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  deleteDoc,
  query,
  where
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LabelTemplate, LabelElement, DatasetRow } from '../types/label';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

// Authentication Helpers
export async function signInWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return res.user;
}

export async function signInWithEmail(email: string, pass: string): Promise<User> {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  return res.user;
}

export async function signUpWithEmail(email: string, pass: string): Promise<User> {
  const res = await createUserWithEmailAndPassword(auth, email, pass);
  return res.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export function subscribeAuthState(onChange: (user: User | null) => void) {
  return onAuthStateChanged(auth, (user) => {
    onChange(user);
  });
}

export interface StoredAppSettings {
  currentTemplate: LabelTemplate;
  elements: LabelElement[];
  dataset: DatasetRow[];
  darkMode?: boolean;
  updatedAt: number;
}

// Get setting document reference based on current user
function getSettingsDocRef() {
  const user = auth.currentUser;
  if (user && !user.isAnonymous) {
    return doc(db, 'userSettings', user.uid);
  }
  return doc(db, 'appSettings', 'global');
}

// Save app state to Firestore (isolated per user if logged in)
export async function saveAppSettingsToFirebase(data: {
  currentTemplate: LabelTemplate;
  elements: LabelElement[];
  dataset: DatasetRow[];
  darkMode?: boolean;
}) {
  try {
    const docRef = getSettingsDocRef();
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: Date.now(),
        userId: auth.currentUser?.uid || 'guest',
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving app settings to Firebase:', err);
  }
}

// Subscribe to app state updates from Firestore
export function subscribeAppSettingsFromFirebase(
  onUpdate: (data: Partial<StoredAppSettings>) => void
) {
  const docRef = getSettingsDocRef();
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (snapshot.metadata.hasPendingWrites) {
        return;
      }
      if (snapshot.exists()) {
        const data = snapshot.data() as StoredAppSettings;
        onUpdate(data);
      }
    },
    (err) => {
      console.warn('Firestore snapshot error for appSettings:', err);
    }
  );
}

// Save a custom template to Firestore
export async function saveTemplateToFirebase(template: LabelTemplate) {
  try {
    const userId = auth.currentUser?.uid || 'guest';
    const docRef = doc(db, 'templates', template.id);
    await setDoc(docRef, {
      ...template,
      userId,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error saving template to Firebase:', err);
  }
}

// Delete a template from Firestore
export async function deleteTemplateFromFirebase(templateId: string) {
  try {
    const docRef = doc(db, 'templates', templateId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting template from Firebase:', err);
  }
}

// Subscribe to saved templates from Firestore
export function subscribeTemplatesFromFirebase(
  onUpdate: (templates: LabelTemplate[]) => void
) {
  const userId = auth.currentUser?.uid || 'guest';
  const colRef = collection(db, 'templates');
  
  return onSnapshot(
    colRef,
    (snapshot) => {
      const templates: LabelTemplate[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as LabelTemplate & { userId?: string };
        // Include default templates, public templates, or templates created by this user
        if (!data.userId || data.userId === 'guest' || data.userId === userId) {
          templates.push(data);
        }
      });
      onUpdate(templates);
    },
    (err) => {
      console.warn('Firestore snapshot error for templates:', err);
    }
  );
}

