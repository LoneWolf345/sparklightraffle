import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'user' | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isLoading: boolean;
  roleLoading: boolean;
}

function getProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.split('.')[0] ?? null;
  } catch {
    return null;
  }
}

function readStoredSession(): Session | null {
  if (typeof window === 'undefined') return null;

  try {
    const projectRef = getProjectRefFromUrl(import.meta.env.VITE_SUPABASE_URL);
    if (!projectRef) return null;

    const key = `sb-${projectRef}-auth-token`;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const session = (parsed?.currentSession ?? parsed?.session ?? parsed) as Session | null;

    if (!session || typeof session !== 'object') return null;
    if (!('user' in session) || !session.user) return null;

    return session;
  } catch {
    return null;
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error('timeout')), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    roleLoading: false,
  });

  const isMountedRef = useRef(true);
  const lastRoleUserIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) return null;
      return (data?.role as UserRole) ?? null;
    } catch {
      return null;
    }
  }, []);

  const scheduleRoleFetch = useCallback(
    (userId: string) => {
      // Avoid refetching role unnecessarily for same user
      if (lastRoleUserIdRef.current === userId) return;
      lastRoleUserIdRef.current = userId;

      setTimeout(() => {
        fetchUserRole(userId).then((role) => {
          if (!isMountedRef.current) return;
          setAuthState((prev) => ({
            ...prev,
            role,
            roleLoading: false,
          }));
        });
      }, 0);
    },
    [fetchUserRole]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // Listener FIRST (must be synchronous callback)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMountedRef.current) return;

      const nextUserId = session?.user?.id ?? null;
      const userChanged = nextUserId !== currentUserIdRef.current;
      currentUserIdRef.current = nextUserId;

      if (userChanged) {
        // Ensure we refetch role for a new user
        lastRoleUserIdRef.current = null;
      }

      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false,
        role: nextUserId ? (userChanged ? null : prev.role) : null,
        roleLoading: !!nextUserId,
      }));

      if (session?.user) {
        scheduleRoleFetch(session.user.id);
      } else {
        lastRoleUserIdRef.current = null;
      }
    });

    // Then quick init using stored session first (no hanging promises)
    const stored = readStoredSession();
    if (stored?.user) {
      currentUserIdRef.current = stored.user.id;
      lastRoleUserIdRef.current = null;

      setAuthState((prev) => ({
        ...prev,
        session: stored,
        user: stored.user,
        isLoading: false,
        roleLoading: true,
      }));
      scheduleRoleFetch(stored.user.id);
    }

    // Best-effort getSession with timeout (optional, but helps correctness)
    (async () => {
      try {
        const { data, error } = await withTimeout(supabase.auth.getSession(), 1500);
        if (error) throw error;

        if (!isMountedRef.current) return;

        const session = data.session;

        const nextUserId = session?.user?.id ?? null;
        const userChanged = nextUserId !== currentUserIdRef.current;
        currentUserIdRef.current = nextUserId;
        if (userChanged) lastRoleUserIdRef.current = null;

        setAuthState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false,
          roleLoading: !!session?.user,
          role: nextUserId ? (userChanged ? null : prev.role) : null,
        }));

        if (session?.user) {
          scheduleRoleFetch(session.user.id);
        }
      } catch {
        // If we didn't have stored session, we should still stop loading
        if (!isMountedRef.current) return;
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
        }));
      }
    })();

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
    // Intentionally do not include authState in deps; we use functional setState
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleRoleFetch]);

  const signUp = useCallback(async (email: string, password: string) => {
    const allowedDomains = ['@cableone.biz', '@sparklight.biz'];
    const isValidDomain = allowedDomains.some((domain) => email.toLowerCase().endsWith(domain));

    if (!isValidDomain) {
      return {
        error: {
          message: 'Only @cableone.biz or @sparklight.biz email addresses are allowed',
        },
      };
    }

    const redirectUrl = `${window.location.origin}/`;

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });

    return { error };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { error };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  }, []);

  return useMemo(
    () => ({
      user: authState.user,
      session: authState.session,
      role: authState.role,
      isLoading: authState.isLoading,
      roleLoading: authState.roleLoading,
      isAdmin: authState.role === 'admin',
      isAuthenticated: !!authState.user,
      signUp,
      signIn,
      signOut,
    }),
    [authState, signIn, signOut, signUp]
  );
}
