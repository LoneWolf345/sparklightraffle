import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useCompanyBranding() {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanyLogo();
  }, []);

  const fetchCompanyLogo = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'company_logo_url')
        .maybeSingle();

      if (error) throw error;
      setLogoUrl(data?.value || null);
    } catch (error) {
      console.error('Error fetching company logo:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateCompanyLogo = async (url: string | null) => {
    try {
      const { data: session } = await supabase.auth.getSession();
      const userId = session?.session?.user?.id;

      if (url) {
        const { error } = await supabase
          .from('app_settings')
          .upsert(
            { 
              key: 'company_logo_url', 
              value: url, 
              updated_at: new Date().toISOString(),
              updated_by: userId 
            },
            { onConflict: 'key' }
          );

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('app_settings')
          .delete()
          .eq('key', 'company_logo_url');

        if (error) throw error;
      }

      setLogoUrl(url);
      return true;
    } catch (error) {
      console.error('Error updating company logo:', error);
      return false;
    }
  };

  return { logoUrl, isLoading, updateCompanyLogo, refetch: fetchCompanyLogo };
}
