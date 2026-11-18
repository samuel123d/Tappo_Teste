import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export const firebaseConfig = {
  apiKey: "AIzaSyAGZKcla9-jhQwacuTcj83Wn-7ZcGjZInI",
  authDomain: "tappo-main-database.firebaseapp.com",
  projectId: "tappo-main-database",
  storageBucket: "tappo-main-database.firebasestorage.app",
  messagingSenderId: "1093569834136",
  appId: "1:1093569834136:web:5e08d3cde5d82ce752f4ed",
  measurementId: "G-RN5LLYSLR7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Instância secundária isolada para o ADM cadastrar garçons sem deslogar sua própria sessão
export function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === "SecondaryStaffApp");
  const secondaryApp = existing || initializeApp(firebaseConfig, "SecondaryStaffApp");
  return getAuth(secondaryApp);
}
