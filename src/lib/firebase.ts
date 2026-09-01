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

function getDeviceId(): string {
  try {
    let id = localStorage.getItem('qr_label_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
      localStorage.setItem('qr_label_device_id', id);
    }
    return id;
  } catch {
    return 'dev_fallback';
  }
}

// Get setting document reference based on current user or unique device
function getSettingsDocRef() {
  const user = auth.currentUser;
  if (user && !user.isAnonymous) {
    return doc(db, 'userSettings', user.uid);
  }
  const deviceId = getDeviceId();
  return doc(db, 'guestSettings', deviceId);
}

// Write backoff tracking to prevent Firestore resource-exhausted spam
let firestoreBackoffUntil = 0;
let lastWriteTime = 0;

// Save app state to Firestore (isolated per user or device ID)
export async function saveAppSettingsToFirebase(data: {
  currentTemplate: LabelTemplate;
  elements: LabelElement[];
  dataset: DatasetRow[];
  darkMode?: boolean;
}) {
  const now = Date.now();
  // If in backoff period or less than 1.5s since last write, skip cloud write (LocalStorage is already up to date)
  if (now < firestoreBackoffUntil || now - lastWriteTime < 1500) {
    return;
  }

  try {
    lastWriteTime = now;
    const docRef = getSettingsDocRef();
    await setDoc(
      docRef,
      {
        ...data,
        updatedAt: now,
        userId: auth.currentUser?.uid || getDeviceId(),
      },
      { merge: true }
    );
    // Reset backoff on success
    firestoreBackoffUntil = 0;
  } catch (err: any) {
    const isResourceExhausted =
      err?.code === 'resource-exhausted' ||
      err?.message?.includes('resource-exhausted') ||
      err?.message?.includes('maximum bandwidth');

    if (isResourceExhausted) {
      // Backoff for 30 seconds if quota reached
      firestoreBackoffUntil = Date.now() + 30000;
      console.info('[Firebase Firestore] Băng thông Firebase đang bận. Ứng dụng tự động lưu trữ tức thì bằng LocalStorage.');
    } else if (err?.code === 'permission-denied' || err?.message?.includes('permissions')) {
      console.warn('[Firebase Firestore] Quyền ghi dữ liệu chưa được cấp. Đã lưu bộ nhớ cục bộ (LocalStorage) thành công.');
    } else {
      console.warn('Lưu cấu hình lên Firebase:', err?.message || err);
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

