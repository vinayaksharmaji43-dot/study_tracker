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
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Subscribe to auth state changes and fetch Firestore user profile
  useEffect(() => {
    let unsubscribeProfile = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        // Real-time listener for user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
          const isAuthorizedAdminEmail = 
            user.email?.toLowerCase() === 'vaultstore27@gmail.com' ||
            user.email?.toLowerCase() === 'thunderworld766@gmail.com';

          if (snapshot.exists()) {
            const data = snapshot.data();
            const role = isAuthorizedAdminEmail ? 'admin' : (data.role || 'student');
            
            // 1. Check if account is banned by Admin
            if (data.banned && !isAuthorizedAdminEmail) {
              const reason = data.banReason || 'Account suspended by administrator.';
              alert(`🚫 ACCOUNT SUSPENDED: ${reason}`);
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
              alert('🚪 SESSION LOGGED OUT: Your session was remotely logged out by the Administrator.');
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
                console.warn("Could not sync role to Firestore:", e);
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
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        if (unsubscribeProfile) unsubscribeProfile();
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

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
  async function register({ name, email, phone, password, course, attempt }) {
    // 1. Create auth user
    const res = await createUserWithEmailAndPassword(auth, email, password);
    const user = res.user;

    const isAuthorizedAdmin = 
      email.toLowerCase() === 'vaultstore27@gmail.com' ||
      email.toLowerCase() === 'thunderworld766@gmail.com';

    // 2. Create user profile doc in Firestore
    const userDocData = {
      uid: user.uid,
      name: name || (isAuthorizedAdmin ? 'Platform Administrator' : 'Student'),
      email,
      phone: phone || '',
      course,
      attempt: attempt || '',
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
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
