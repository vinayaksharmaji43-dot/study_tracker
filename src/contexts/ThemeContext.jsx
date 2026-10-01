import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  // Default is false (White and Blue Theme)
  const [isEyeCare, setIsEyeCare] = useState(() => {
    try {
      const saved = localStorage.getItem('study_tracker_eye_care');
      if (saved !== null) {
        return saved === 'true';
      }
      return false; // Default: White & Blue
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('study_tracker_eye_care', String(isEyeCare));
    } catch {
      // Ignore storage errors
    }

    const root = document.documentElement;
    if (isEyeCare) {
      root.classList.add('eye-care-black');
      root.classList.remove('theme-light-blue');
    } else {
      root.classList.add('theme-light-blue');
      root.classList.remove('eye-care-black');
    }
  }, [isEyeCare]);

  const toggleEyeCare = () => {
    setIsEyeCare(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ isEyeCare, toggleEyeCare }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      isEyeCare: false,
      toggleEyeCare: () => {}
    };
  }
  return context;
}
