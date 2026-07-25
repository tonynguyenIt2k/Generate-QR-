import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  collection,
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { LabelTemplate, LabelElement, DatasetRow } from '../types/label';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || undefined);
export const auth = getAuth(app);

let isAuthInitialized = false;

export async function ensureAuth() {
  if (isAuthInitialized && auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    isAuthInitialized = true;
    return cred.user;
  } catch (err) {
    console.warn('Firebase anonymous authentication error:', err);
    return null;
  }
}

export interface StoredAppSettings {
  currentTemplate: LabelTemplate;
  elements: LabelElement[];
  dataset: DatasetRow[];
  darkMode?: boolean;
  updatedAt: number;
}

// Save global app state to Firestore
export async function saveAppSettingsToFirebase(data: {
  currentTemplate: LabelTemplate;
  elements: LabelElement[];
  dataset: DatasetRow[];
  darkMode?: boolean;
}) {
  try {
    await ensureAuth();
    const docRef = doc(db, 'appSettings', 'global');
    await setDoc(docRef, {
      ...data,
      updatedAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving app settings to Firebase:', err);
  }
}

// Subscribe to global app state updates from Firestore
export function subscribeAppSettingsFromFirebase(
  onUpdate: (data: Partial<StoredAppSettings>) => void
) {
  ensureAuth();
  const docRef = doc(db, 'appSettings', 'global');
  return onSnapshot(
    docRef,
    (snapshot) => {
      // Ignore local write echoes to prevent infinite refresh loop
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

// Save a template to Firestore
export async function saveTemplateToFirebase(template: LabelTemplate) {
  try {
    await ensureAuth();
    const docRef = doc(db, 'templates', template.id);
    await setDoc(docRef, {
      ...template,
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error('Error saving template to Firebase:', err);
  }
}

// Delete a template from Firestore
export async function deleteTemplateFromFirebase(templateId: string) {
  try {
    await ensureAuth();
    const docRef = doc(db, 'templates', templateId);
    await deleteDoc(docRef);
  } catch (err) {
    console.error('Error deleting template from Firebase:', err);
  }
}

// Subscribe to all saved templates from Firestore
export function subscribeTemplatesFromFirebase(
  onUpdate: (templates: LabelTemplate[]) => void
) {
  ensureAuth();
  const colRef = collection(db, 'templates');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const templates: LabelTemplate[] = [];
      snapshot.forEach((doc) => {
        templates.push(doc.data() as LabelTemplate);
      });
      onUpdate(templates);
    },
    (err) => {
      console.warn('Firestore snapshot error for templates:', err);
    }
  );
}
