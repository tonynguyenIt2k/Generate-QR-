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
import { LabelTemplate, LabelElement, DatasetRow } from '../types/label';

export const firebaseConfig = {
  apiKey: "AIzaSyBWIz93afkxfmNPCFcF2xursIWCs_W1ERU",
  authDomain: "qr-smart-db1a0.firebaseapp.com",
  projectId: "qr-smart-db1a0",
  storageBucket: "qr-smart-db1a0.firebasestorage.app",
  messagingSenderId: "150848590110",
  appId: "1:150848590110:web:123e9bdad7c252974df90f"
};

function getFirebaseApp() {
  const existingApps = getApps();
  if (existingApps.length > 0) {
    const current = existingApps[0];
    if (current.options.projectId === firebaseConfig.projectId) {
      return current;
    }
  }
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();
export const db = getFirestore(app);
export const auth = getAuth(app);

// Attempt anonymous sign-in if no user is logged in so Firestore request.auth != null rules work
onAuthStateChanged(auth, (user) => {
  if (!user) {
    signInAnonymously(auth).catch((err) => {
      // Anonymous auth might not be enabled in console, that's okay
      console.info('Firebase anonymous auth notice:', err?.message || err);
    });
  }
});

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
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permissions')) {
      console.warn('[Firebase Firestore] Quyền ghi dữ liệu chưa được bật trong dự án Firebase. Đã lưu bộ nhớ cục bộ (LocalStorage) thành công.');
    } else {
      console.warn('Lỗi lưu cấu hình lên Firebase:', err);
    }
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
      console.warn('Firestore snapshot notice for appSettings:', err?.message || err);
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
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permissions')) {
      console.warn('[Firebase Firestore] Quyền ghi tem chưa được bật. Mẫu tem đã được lưu ở LocalStorage.');
    } else {
      console.warn('Lỗi lưu mẫu tem lên Firebase:', err);
    }
  }
}

// Delete a template from Firestore
export async function deleteTemplateFromFirebase(templateId: string) {
  try {
    const docRef = doc(db, 'templates', templateId);
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied' || err?.message?.includes('permissions')) {
      console.warn('[Firebase Firestore] Không thể xóa mẫu tem trên Firebase do chưa cấp quyền.');
    } else {
      console.warn('Lỗi xóa mẫu tem trên Firebase:', err);
    }
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

