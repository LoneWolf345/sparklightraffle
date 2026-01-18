import { useState, useEffect, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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

    // Check for existing session
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

        // Set session/user and mark isLoading=false immediately
        // Role will be fetched in background
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false,
          roleLoading: !!session?.user,
        }));
        
        clearWatchdog();

        // Fetch role in background if user exists
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (isMountedRef.current) {
            setAuthState(prev => ({
              ...prev,
              role,
              roleLoading: false,
            }));
          }
        }
      } catch (error) {
        console.error('[useAuth] initSession failed:', error);
        if (isMountedRef.current) {
          setAuthState({
            user: null,
            session: null,
            role: null,
            isLoading: false,
            roleLoading: false,
          });
        }
        clearWatchdog();
      }
    };

    initSession();

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[useAuth] onAuthStateChange:', event);
        if (!isMountedRef.current) return;
        
        // Always update session/user immediately and mark loaded
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false,
          roleLoading: !!session?.user,
          role: session?.user ? prev.role : null, // Keep existing role if same user
        }));

        // Fetch role in background
        if (session?.user) {
          const role = await fetchUserRole(session.user.id);
          if (isMountedRef.current) {
            setAuthState(prev => ({
              ...prev,
              role,
              roleLoading: false,
            }));
          }
        } else {
          setAuthState(prev => ({
            ...prev,
            role: null,
            roleLoading: false,
          }));
        }
      }
    );

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

  return {
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
  };
}
