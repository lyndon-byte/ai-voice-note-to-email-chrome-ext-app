import { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { firebaseConfig } from './config/firebase-config';
import { Loader } from './components/Loader';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const getCurrentUser = () => {
  return auth.currentUser;
};

export const getToken = async () => {

  const user = auth.currentUser

  return await user.getIdToken();

};

const useFirebaseAuth = () => {

  const [authState, setAuthState] = useState({
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {

    const unsubscribe = onIdTokenChanged(auth, (user) => {
      setAuthState({
        isAuthenticated: !!user,
        isLoading: false,
      });
    });

    return () => unsubscribe();

  }, []);

  return authState;

};

// 3. AUTH GUARD COMPONENT: Protects your routes
const AuthGuard = ({ children }) => {

  const { isAuthenticated, isLoading } = useFirebaseAuth();
  const location = useLocation();

  if (isLoading) {

    return (

      <Loader color='bg-gray-900' />

    );

  }

  if (!isAuthenticated) {
    return <Navigate to="/sign-in" state={{ from: location }} replace />;
  }

  return children;
};

export default AuthGuard;
