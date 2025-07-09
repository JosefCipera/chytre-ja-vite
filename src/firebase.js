import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC0TwN948Lmr7-pnwDv0a2gIeJncEq360E",
  authDomain: "chytre-ja.firebaseapp.com",
  projectId: "chytre-ja",
  storageBucket: "chytre-ja.firebasestorage.app",
  messagingSenderId: "682672937743",
  appId: "1:682672937743:web:31ce58b0ab8005d055bc7a",
  measurementId: "G-8VL8YX1V8F"
};

// Toto je to klíčové místo:
let app;
if (getApps().length === 0) {
  // Pokud žádná Firebase aplikace ještě neexistuje, inicializuj ji
  app = initializeApp(firebaseConfig);
} else {
  // Jinak, získej existující výchozí aplikaci
  app = getApp();
}

// Exportuj instance služeb, které budeš používat
export const auth = getAuth(app);
export const db = getFirestore(app);

// Můžeš exportovat i samotnou 'app' instanci, pokud ji potřebuješ jinde
export { app };