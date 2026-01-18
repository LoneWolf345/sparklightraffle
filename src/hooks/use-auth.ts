import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useWiaAuth, AuthMode } from './use-wia-auth';
export type { WiaUser } from './use-wia-auth';
export type { AuthMode } from './use-wia-auth';

export type UserRole = 'admin' | 'user' | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isLoading: boolean;
  roleLoading: boolean;
}

const AUTH_TIMEOUT_MS = 5000; // Watchdog timeout - increased for network latency

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
    roleLoading: false,
  });
  
  // WIA authentication state
  const { wiaUser, isWiaEnabled, isLoading: wiaLoading, checkWiaAuth } = useWiaAuth();
  const [authMode, setAuthMode] = useState<AuthMode>('loading');
  
  const isMountedRef = useRef(true);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    try {
      console.log('[useAuth] fetchUserRole started for:', userId);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('[useAuth] Error fetching user role:', error);
        return null;
      }

      console.log('[useAuth] fetchUserRole result:', data?.role);
      return data?.role as UserRole || null;
    } catch (error) {
      console.error('[useAuth] fetchUserRole exception:', error);
      return null;
    }
  }, []);

  // Clear watchdog timer
  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  }, []);

  // Force complete auth loading (watchdog fallback)
  const forceComplete = useCallback(() => {
    console.warn('[useAuth] Watchdog fired - forcing isLoading=false');
    if (isMountedRef.current) {
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
      }));
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    console.log('[useAuth] useEffect init');

    // Start watchdog timer
    watchdogRef.current = setTimeout(forceComplete, AUTH_TIMEOUT_MS);

    // Set up auth state listener FIRST (before getSession)
    // CRITICAL: Keep this callback synchronous to avoid auth deadlocks
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] onAuthStateChange:', event, 'hasUser:', !!session?.user);
        if (!isMountedRef.current) return;
        
        // Clear watchdog immediately - we have a definitive auth state
        clearWatchdog();
        
        // Synchronously update session/user state - never await inside this callback
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false,
          roleLoading: !!session?.user,
          role: session?.user ? prev.role : null,
        }));

        // Defer role fetching outside the callback using setTimeout(0)
        if (session?.user) {
          const userId = session.user.id;
          setTimeout(() => {
            fetchUserRole(userId).then(role => {
              if (isMountedRef.current) {
                setAuthState(prev => ({
                  ...prev,
                  role,
                  roleLoading: false,
                }));
              }
            });
          }, 0);
        }
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      try {
        console.log('[useAuth] getSession started');
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[useAuth] getSession error:', error);
          throw error;
        }
        
        console.log('[useAuth] getSession resolved, hasUser:', !!session?.user);

        if (!isMountedRef.current) return;

        // Clear watchdog - we have session info
        clearWatchdog();

        // Set session/user and mark isLoading=false
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false,
          roleLoading: !!session?.user,
        }));

        // Fetch role in background if user exists (deferred)
        if (session?.user) {
          const userId = session.user.id;
          setTimeout(() => {
            fetchUserRole(userId).then(role => {
              if (isMountedRef.current) {
                setAuthState(prev => ({
                  ...prev,
                  role,
                  roleLoading: false,
                }));
              }
            });
          }, 0);
        }
      } catch (error) {
        console.error('[useAuth] initSession failed:', error);
        if (isMountedRef.current) {
          clearWatchdog();
          setAuthState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            roleLoading: false,
          });
        }
      }
    };

    initSession();

    return () => {
      console.log('[useAuth] cleanup');
      isMountedRef.current = false;
      clearWatchdog();
      subscription.unsubscribe();
    };
  }, [fetchUserRole, clearWatchdog, forceComplete]);

  const signUp = useCallback(async (email: string, password: string) => {
    // Validate email domain
    const allowedDomains = ['@cableone.biz', '@sparklight.biz'];
    const isValidDomain = allowedDomains.some(domain => 
      email.toLowerCase().endsWith(domain)
    );

    if (!isValidDomain) {
      return { 
        error: { 
          message: 'Only @cableone.biz or @sparklight.biz email addresses are allowed' 
        } 
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

  // Determine auth mode based on WIA status
  useEffect(() => {
    if (!wiaLoading) {
      if (isWiaEnabled && wiaUser) {
        setAuthMode('wia');
      } else {
        setAuthMode('supabase');
      }
    }
  }, [wiaLoading, isWiaEnabled, wiaUser]);

  // Combined loading state - wait for both WIA check and Supabase auth
  const combinedLoading = authState.isLoading || (authMode === 'loading');

  // Determine if user is authenticated (either via WIA or Supabase)
  const isAuthenticated = authMode === 'wia' ? !!wiaUser : !!authState.user;

  return useMemo(() => ({
    // Supabase auth state
    user: authState.user,
    session: authState.session,
    role: authState.role,
    isLoading: combinedLoading,
    roleLoading: authState.roleLoading,
    isAdmin: authState.role === 'admin',
    isAuthenticated,
    signUp,
    signIn,
    signOut,
    // WIA-specific state
    authMode,
    wiaUser,
    isWiaEnabled,
    isWiaAuthenticated: authMode === 'wia' && !!wiaUser,
  }), [authState, combinedLoading, isAuthenticated, signUp, signIn, signOut, authMode, wiaUser, isWiaEnabled]);
}
