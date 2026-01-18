import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { EntraUser } from '@/lib/entra-auth';

interface EntraUserRecord {
  id: string;
  tenant_id: string;
  subject_id: string;
  display_name: string;
  email: string;
  last_login_at: string;
  auth_user_id: string | null;
}

export function useEntraUser() {
  const [entraUser, setEntraUser] = useState<EntraUserRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch Entra user record for current authenticated user
  const fetchEntraUser = useCallback(async (authUserId: string) => {
    try {
      // Use type assertion since entra_users may not be in generated types yet
      const { data, error } = await (supabase
        .from('entra_users' as any)
        .select('*')
        .eq('auth_user_id', authUserId)
        .maybeSingle()) as { data: EntraUserRecord | null; error: any };

      if (error) {
        console.error('Error fetching Entra user:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching Entra user:', error);
      return null;
    }
  }, []);

  // Upsert Entra user record (called after successful SSO login)
  const upsertEntraUser = useCallback(async (
    user: EntraUser, 
    authUserId: string
  ): Promise<EntraUserRecord | null> => {
    try {
      // First, try to find existing record by tenant_id and subject_id
      const { data: existing } = await (supabase
        .from('entra_users' as any)
        .select('*')
        .eq('tenant_id', user.tenantId)
        .eq('subject_id', user.subjectId)
        .maybeSingle()) as { data: EntraUserRecord | null; error: any };

      if (existing) {
        // Update existing record
        const { data, error } = await (supabase
          .from('entra_users' as any)
          .update({
            display_name: user.displayName,
            email: user.email,
            last_login_at: new Date().toISOString(),
            auth_user_id: authUserId,
          })
          .eq('id', existing.id)
          .select()
          .single()) as { data: EntraUserRecord | null; error: any };

        if (error) throw error;
        setEntraUser(data);
        return data;
      } else {
        // Insert new record
        const { data, error } = await (supabase
          .from('entra_users' as any)
          .insert({
            tenant_id: user.tenantId,
            subject_id: user.subjectId,
            display_name: user.displayName,
            email: user.email,
            auth_user_id: authUserId,
          })
          .select()
          .single()) as { data: EntraUserRecord | null; error: any };

        if (error) throw error;
        setEntraUser(data);
        return data;
      }
    } catch (error) {
      console.error('Error upserting Entra user:', error);
      return null;
    }
  }, []);

  // Initialize - listen only to auth state changes (avoid duplicate getSession calls)
  useEffect(() => {
    // Mark as not loading immediately - don't block on this
    setIsLoading(false);

    // Listen for auth changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user) {
          // Fetch Entra user record in background using setTimeout to avoid deadlock
          setTimeout(() => {
            fetchEntraUser(session.user.id).then(record => {
              setEntraUser(record);
            });
          }, 0);
        } else {
          setEntraUser(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchEntraUser]);

  return {
    entraUser,
    isLoading,
    displayName: entraUser?.display_name || null,
    upsertEntraUser,
    isEntraUser: !!entraUser,
  };
}
