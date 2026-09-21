import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { generateRollNumber } from '../utils/rollNumberGenerator';
import LoadingSpinner from '../components/LoadingSpinner';
import { calculateStudentLevel, getDefaultStreamLevels, getStreamId, normalizeLevelConfig } from '../utils/levelSystem';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [levelConfig, setLevelConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state changes and fetch Firestore user profile
  useEffect(() => {
    let unsubscribeProfile = null;
    let isMounted = true;

    // Safety fallback timeout to prevent infinite blank screen if firebase auth is slow/unresponsive
    const timer = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 4000);

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!isMounted) return;
      setCurrentUser(user);

      if (user) {
        // Real-time listener for user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          if (!isMounted) return;
          const isAuthorizedAdminEmail = 
            user.email?.toLowerCase() === 'vaultstore27@gmail.com' ||
            user.email?.toLowerCase() === 'thunderworld766@gmail.com';

          if (snapshot.exists()) {
            const data = snapshot.data();
            const role = isAuthorizedAdminEmail ? 'admin' : (data.role || 'student');
            
            // 1. Check if account is banned by Admin
            if (data.banned && !isAuthorizedAdminEmail) {
              const reason = data.banReason || 'Account suspended by administrator.';
              alert(`⚠️ ACCOUNT SUSPENDED: ${reason}`);
              await signOut(auth);
              setUserProfile(null);
              setCurrentUser(null);
              setLoading(false);
              return;
            }

            // 2. Check if remote force logout was triggered by Admin
            if (data.forceLogout) {
              try {
                await updateDoc(userDocRef, { forceLogout: false });
              } catch (e) {
                console.warn("Could not reset forceLogout flag:", e);
              }
              alert('⚠️ SESSION LOGGED OUT: Your session was remotely logged out by the Administrator.');
              await signOut(auth);
              setUserProfile(null);
              setCurrentUser(null);
              setLoading(false);
              return;
            }

            // Automatically ensure role: 'admin' is saved in Firestore database
            if (isAuthorizedAdminEmail && data.role !== 'admin') {
              try {
                await setDoc(userDocRef, { role: 'admin' }, { merge: true });
              } catch (e) {
                console.error("Could not set admin role:", e);
              }
            }

            // Backfill Roll Number if missing (for students)
            if (!data.rollNumber && role !== 'admin') {
              try {
                const newRoll = await generateRollNumber(data.name, data.course || 'CA', data.level || 'Foundation');
                await updateDoc(userDocRef, { rollNumber: newRoll });
                data.rollNumber = newRoll; // Update local copy immediately
              } catch (e) {
                console.error("Could not backfill roll number:", e);
              }
            }

            setUserProfile({ uid: snapshot.id, ...data, role });
          } else {
            // Document does not exist in Firestore yet! Create it with role: 'admin'
            if (isAuthorizedAdminEmail) {
              try {
                await setDoc(userDocRef, {
                  uid: user.uid,
                  name: user.displayName || 'Platform Administrator',
                  email: user.email,
                  role: 'admin',
                  createdAt: serverTimestamp(),
                  studyHours: 0,
                  points: 0
                });
              } catch (e) {
                console.warn("Could not create admin doc in Firestore:", e);
              }
            }

            setUserProfile({
              uid: user.uid,
              name: user.displayName || (isAuthorizedAdminEmail ? 'Platform Administrator' : user.email.split('@')[0]),
              email: user.email,
              role: isAuthorizedAdminEmail ? 'admin' : 'student',
              course: 'CA Foundation',
              attempt: 'January 2027',
              studyHours: 0,
              points: 0
            });
          }
          setLoading(false);
        }, (error) => {
          console.error("Error listening to user profile:", error);
          if (isMounted) setLoading(false);
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      clearTimeout(timer);
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const streamId = userProfile ? getStreamId(userProfile.course, userProfile.level) : null;

  useEffect(() => {
    if (!streamId || userProfile?.role === 'admin') return undefined;

    const configRef = doc(db, 'levelConfigs', streamId);
    return onSnapshot(configRef, async (snapshot) => {
      if (snapshot.exists() && Array.isArray(snapshot.data().levels) && snapshot.data().levels.length === 35) {
        setLevelConfig(normalizeLevelConfig(snapshot.data().levels, streamId));
        return;
      }

      const defaults = getDefaultStreamLevels(streamId);
      setLevelConfig(defaults);
      try {
        await setDoc(configRef, {
          stream: streamId,
          course: streamId.split('_')[0],
          level: streamId.split('_')[1],
          levels: defaults,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.warn('Could not initialize level configuration:', error);
      }
    }, (error) => {
      console.error('Level configuration listener error:', error);
      setLevelConfig(getDefaultStreamLevels(streamId));
    });
  }, [streamId, userProfile?.role]);

  useEffect(() => {
    if (!currentUser?.uid || !userProfile || userProfile.role === 'admin' || !levelConfig) return;

    const levelInfo = calculateStudentLevel(userProfile.points, levelConfig);
    const previousLevel = Number(userProfile.currentLevel) || null;
    const isFirstSync = previousLevel === null;
    const levelChanged = previousLevel !== null && previousLevel !== levelInfo.currentLevelNumber;
    const nextLastNotified = isFirstSync
      ? levelInfo.currentLevelNumber
      : (levelChanged && levelInfo.currentLevelNumber < previousLevel
        ? levelInfo.currentLevelNumber
        : (Number(userProfile.lastNotifiedLevel) || 1));

    const userRef = doc(db, 'users', currentUser.uid);
    const levelDataRef = doc(db, 'studentLevelData', currentUser.uid);
    const levelData = {
      studentId: currentUser.uid,
      stream: streamId,
      currentLevel: levelInfo.currentLevelNumber,
      levelName: levelInfo.currentLevelName,
      badge: levelInfo.badge,
      totalPoints: levelInfo.totalPoints,
      lastNotifiedLevel: nextLastNotified,
      updatedAt: serverTimestamp()
    };

    const updates = {
      currentLevel: levelInfo.currentLevelNumber,
      levelName: levelInfo.currentLevelName,
      badge: levelInfo.badge,
      lastNotifiedLevel: nextLastNotified,
      levelStream: streamId,
      levelUpdatedAt: serverTimestamp()
    };

    const shouldUpdateProfile = previousLevel !== levelInfo.currentLevelNumber ||
      userProfile.levelName !== levelInfo.currentLevelName ||
      userProfile.badge !== levelInfo.badge ||
      userProfile.lastNotifiedLevel !== nextLastNotified ||
      userProfile.levelStream !== streamId;

    const syncLevel = async () => {
      try {
        await setDoc(levelDataRef, levelData, { merge: true });
        if (shouldUpdateProfile) await updateDoc(userRef, updates);

        if (levelChanged) {
          await setDoc(doc(db, 'users', currentUser.uid, 'levelHistory', `level_${levelInfo.currentLevelNumber}`), {
            studentId: currentUser.uid,
            stream: streamId,
            fromLevel: previousLevel,
            toLevel: levelInfo.currentLevelNumber,
            levelNumber: levelInfo.currentLevelNumber,
            levelName: levelInfo.currentLevelName,
            badge: levelInfo.badge,
            pointsAtLevelUp: levelInfo.totalPoints,
            achievedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (error) {
        console.error('Could not synchronize student level:', error);
      }
    };

    syncLevel();
  }, [currentUser?.uid, userProfile, levelConfig, streamId]);

  // Login function with Remember Me persistence support & Ban check
  async function login(email, password, rememberMe = true) {
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const isAuthorizedAdmin = 
      user.email?.toLowerCase() === 'vaultstore27@gmail.com' ||
      user.email?.toLowerCase() === 'thunderworld766@gmail.com';

    if (!isAuthorizedAdmin) {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && userDoc.data().banned) {
        await signOut(auth);
        const reason = userDoc.data().banReason || 'Account suspended by administrator.';
        throw new Error(`ACCOUNT_BANNED: ${reason}`);
      }
    }

    if (isAuthorizedAdmin) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          role: 'admin',
          name: user.displayName || 'Platform Administrator'
        }, { merge: true });
      } catch (err) {
        console.warn("Error setting admin role on login:", err);
      }
    }

    return userCredential;
  }

  // Register function that also creates Firestore profile doc
  async function register({ name, email, phone, password, course, level, attempt }) {
    // 1. Create auth user
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    const isAuthorizedAdmin = 
      email.toLowerCase() === 'vaultstore27@gmail.com' ||
      email.toLowerCase() === 'thunderworld766@gmail.com';

    // Generate Roll Number
    const rollNumber = await generateRollNumber(name, course || 'CA', level || 'Foundation');

    // 2. Create user profile doc in Firestore
    const userDocData = {
      uid: user.uid,
      name: name || (isAuthorizedAdmin ? 'Platform Administrator' : 'Student'),
      email,
      phone: phone || '',
      course: course || 'CA',
      level: level || 'Foundation',
      attempt: attempt || 'Jan 27',
      rollNumber: rollNumber,
      createdAt: serverTimestamp(),
      role: isAuthorizedAdmin ? 'admin' : 'student',
      studyHours: 0,
      points: 0
    };

    await setDoc(doc(db, 'users', user.uid), userDocData);

    return user;
  }

  // Logout function
  function logout() {
    return signOut(auth);
  }

  // Reset password function
  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  const isCurrentAdmin = 
    userProfile?.role === 'admin' || 
    currentUser?.email?.toLowerCase() === 'vaultstore27@gmail.com' ||
    currentUser?.email?.toLowerCase() === 'thunderworld766@gmail.com';

  const value = {
    currentUser,
    userProfile,
    isAdmin: isCurrentAdmin,
    loading,
    login,
    register,
    logout,
    resetPassword
    ,levelInfo: userProfile ? calculateStudentLevel(userProfile.points, levelConfig || getDefaultStreamLevels(streamId || getStreamId(userProfile.course, userProfile.level))) : null
    ,levelConfig
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? <LoadingSpinner fullScreen text="Loading CA/CMA Blueprint..." /> : children}
    </AuthContext.Provider>
  );
}
