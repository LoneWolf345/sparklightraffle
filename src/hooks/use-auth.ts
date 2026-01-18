import { useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'user' | null;

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  isLoading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    isLoading: true,
  });

  const fetchUserRole = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        return null;
      }

      return data?.role as UserRole || null;
    } catch (error) {
      console.error('Error fetching user role:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Check for existing session FIRST
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      
      if (session?.user) {
        setAuthState(prev => ({
          ...prev,
          session,
          user: session.user,
        }));
        
        fetchUserRole(session.user.id).then(role => {
          if (isMounted) {
            setAuthState(prev => ({
              ...prev,
              role,
              isLoading: false,
            }));
          }
        });
      } else {
        setAuthState(prev => ({
          ...prev,
          session: null,
          user: null,
          role: null,
          isLoading: false,
        }));
      }
    });

    // Set up auth state listener for future changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        
        setAuthState(prev => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          fetchUserRole(session.user.id).then(role => {
            if (isMounted) {
              setAuthState(prev => ({
                ...prev,
                role,
                isLoading: false,
              }));
            }
          });
        } else {
          setAuthState(prev => ({
            ...prev,
            role: null,
            isLoading: false,
          }));
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

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
    ...authState,
    isAdmin: authState.role === 'admin',
    isAuthenticated: !!authState.user,
    signUp,
    signIn,
    signOut,
  };
}
