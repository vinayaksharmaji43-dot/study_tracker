import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const ThemeContext = createContext();

const STORAGE_KEY = 'study_tracker_eye_care';
const THEME_NAME_KEY = 'study_tracker_theme';

function getInitialTheme() {
  try {
    // 1. Primary localStorage key
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }

    // 2. Secondary theme name key
    const themeName = localStorage.getItem(THEME_NAME_KEY);
    if (themeName !== null) {
      return themeName === 'black' || themeName === 'dark';
    }

    // 3. Cookie fallback (useful for mobile webviews and PWA)
    if (typeof document !== 'undefined') {
      const match = document.cookie.match(/(?:^|; )study_tracker_eye_care=([^;]*)/);
      if (match && match[1]) {
        return match[1] === 'true';
      }
    }
    return false; // Default: White & Blue
  } catch {
    return false;
  }
}

function persistThemeToStorage(isBlack) {
  try {
    localStorage.setItem(STORAGE_KEY, String(isBlack));
    localStorage.setItem(THEME_NAME_KEY, isBlack ? 'black' : 'white');
  } catch (e) {
    // Ignore storage quota or access errors
  }

  try {
    if (typeof document !== 'undefined') {
      document.cookie = `study_tracker_eye_care=${isBlack}; path=/; max-age=31536000; SameSite=Lax`;
    }
  } catch (e) {
    // Ignore cookie errors
  }

  try {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (isBlack) {
        root.classList.add('eye-care-black');
        root.classList.remove('theme-light-blue');
      } else {
        root.classList.add('theme-light-blue');
        root.classList.remove('eye-care-black');
      }
    }
  } catch (e) {
    // Ignore DOM errors
  }

  // Also sync to Firestore user profile if authenticated
  try {
    if (auth.currentUser?.uid) {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      updateDoc(userRef, {
        eyeCareTheme: isBlack,
        theme: isBlack ? 'black' : 'white'
      }).catch(() => {});
    }
  } catch (e) {
    // Ignore firestore write errors
  }
}

export function ThemeProvider({ children }) {
  const [isEyeCare, setIsEyeCare] = useState(getInitialTheme);

  // Sync state to storage and DOM on mount and updates
  useEffect(() => {
    persistThemeToStorage(isEyeCare);
  }, [isEyeCare]);

  // Sync theme with Firestore user account
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user?.uid) return;
      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.eyeCareTheme !== undefined) {
            const firestoreIsBlack = Boolean(data.eyeCareTheme || data.theme === 'black');
            const localRaw = localStorage.getItem(STORAGE_KEY);
            if (localRaw === null) {
              setIsEyeCare(firestoreIsBlack);
              persistThemeToStorage(firestoreIsBlack);
            } else {
              const localIsBlack = localRaw === 'true';
              if (firestoreIsBlack !== localIsBlack) {
                // Keep local preference as current and update Firestore
                updateDoc(doc(db, 'users', user.uid), {
                  eyeCareTheme: localIsBlack,
                  theme: localIsBlack ? 'black' : 'white'
                }).catch(() => {});
              }
            }
          } else {
            // Initial save to Firestore user profile
            updateDoc(doc(db, 'users', user.uid), {
              eyeCareTheme: isEyeCare,
              theme: isEyeCare ? 'black' : 'white'
            }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('Theme Firestore sync notice:', err);
      }
    });

    return () => unsubscribe();
  }, []);

  const toggleEyeCare = () => {
    setIsEyeCare(prev => {
      const next = !prev;
      persistThemeToStorage(next);
      return next;
    });
  };

  const setEyeCareTheme = (val) => {
    const next = Boolean(val);
    setIsEyeCare(next);
    persistThemeToStorage(next);
  };

  return (
    <ThemeContext.Provider value={{ isEyeCare, toggleEyeCare, setEyeCareTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isEyeCare: false,
      toggleEyeCare: () => {},
      setEyeCareTheme: () => {}
    };
  }
  return context;
}
