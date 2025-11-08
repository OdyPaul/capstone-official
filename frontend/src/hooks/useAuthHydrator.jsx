// src/hooks/useAuthHydrator.js
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { setUser as setAuthUser } from '../features/auth/authSlice';

const LS_KEY = 'user';

export default function useAuthHydrator() {
  const dispatch = useDispatch();
  const current = useSelector((s) => s.auth.user);

  useEffect(() => {
    const readLS = () => {
      let next = null;
      try { next = JSON.parse(localStorage.getItem(LS_KEY)); } catch {}
      if (!next) return;
      if (JSON.stringify(current) !== JSON.stringify(next)) {
        dispatch(setAuthUser(next));
      }
    };

    readLS(); // initial

    // cross-tab only; this won't fire in the same tab
    const onStorage = (e) => { if (e.key === LS_KEY) readLS(); };
    window.addEventListener('storage', onStorage);

    return () => window.removeEventListener('storage', onStorage);
  }, [dispatch, current]);
}
