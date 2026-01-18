import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WiaUser {
  id: string;
  windowsUsername: string;
  domain: string | null;
  email: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  authUserId: string | null;
}

interface WiaAuthState {
  wiaUser: WiaUser | null;
  isWiaEnabled: boolean;
  isLoading: boolean;
  error: string | null;
}

export type AuthMode = 'loading' | 'wia' | 'supabase';

export function useWiaAuth() {
  const [state, setState] = useState<WiaAuthState>({
    wiaUser: null,
    isWiaEnabled: false,
    isLoading: true,
    error: null,
  });

  const checkWiaAuth = useCallback(async (): Promise<{ enabled: boolean; user: WiaUser | null }> => {
    try {
      console.log('[useWiaAuth] Checking for WIA authentication...');
      
      // Check environment variable for auth mode
      const authMode = import.meta.env.VITE_AUTH_MODE;
      
      // If explicitly set to supabase, skip WIA check
      if (authMode === 'supabase') {
        console.log('[useWiaAuth] Auth mode set to supabase, skipping WIA check');
        return { enabled: false, user: null };
      }

      // Call the WIA edge function to check for Windows auth headers
      const { data, error } = await supabase.functions.invoke('wia-auth', {
        method: 'POST',
      });

      if (error) {
        console.warn('[useWiaAuth] WIA check failed:', error);
        return { enabled: false, user: null };
      }

      if (data?.wiaEnabled && data?.user) {
        console.log('[useWiaAuth] WIA authentication successful:', data.user.windowsUsername);
        return { enabled: true, user: data.user };
      }

      console.log('[useWiaAuth] WIA not enabled or no user returned');
      return { enabled: false, user: null };
    } catch (error) {
      console.warn('[useWiaAuth] WIA check exception:', error);
      return { enabled: false, user: null };
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initWiaAuth = async () => {
      const result = await checkWiaAuth();
      
      if (isMounted) {
        setState({
          wiaUser: result.user,
          isWiaEnabled: result.enabled,
          isLoading: false,
          error: null,
        });
      }
    };

    initWiaAuth();

    return () => {
      isMounted = false;
    };
  }, [checkWiaAuth]);

  const refreshWiaUser = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await checkWiaAuth();
    setState({
      wiaUser: result.user,
      isWiaEnabled: result.enabled,
      isLoading: false,
      error: null,
    });
  }, [checkWiaAuth]);

  return useMemo(() => ({
    wiaUser: state.wiaUser,
    isWiaEnabled: state.isWiaEnabled,
    isLoading: state.isLoading,
    error: state.error,
    refreshWiaUser,
    checkWiaAuth,
    // Convenience properties
    displayName: state.wiaUser?.displayName || state.wiaUser?.windowsUsername || null,
    email: state.wiaUser?.email || null,
    department: state.wiaUser?.department || null,
    jobTitle: state.wiaUser?.jobTitle || null,
  }), [state, refreshWiaUser, checkWiaAuth]);
}
