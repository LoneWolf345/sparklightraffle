import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-remote-user, x-forwarded-user, remote-user',
};

interface WiaUser {
  id: string;
  windowsUsername: string;
  domain: string | null;
  email: string | null;
  displayName: string | null;
  department: string | null;
  jobTitle: string | null;
  authUserId: string | null;
}

interface ParsedUsername {
  username: string;
  domain: string | null;
  email: string | null;
}

function parseWindowsUsername(remoteUser: string): ParsedUsername {
  // Handle different formats:
  // - DOMAIN\username
  // - username@domain.com
  // - username
  
  if (remoteUser.includes('\\')) {
    // DOMAIN\username format
    const [domain, username] = remoteUser.split('\\');
    return {
      username: username.toLowerCase(),
      domain: domain.toUpperCase(),
      email: null,
    };
  }
  
  if (remoteUser.includes('@')) {
    // username@domain.com format (UPN)
    const [username, domainPart] = remoteUser.split('@');
    // Extract domain from email domain (e.g., cableone.biz -> CABLEONE)
    const domain = domainPart.split('.')[0].toUpperCase();
    return {
      username: username.toLowerCase(),
      domain,
      email: remoteUser.toLowerCase(),
    };
  }
  
  // Just username
  return {
    username: remoteUser.toLowerCase(),
    domain: null,
    email: null,
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get Windows username from reverse proxy headers
    const remoteUser = req.headers.get('x-remote-user') 
      || req.headers.get('x-forwarded-user')
      || req.headers.get('remote-user');

    console.log('[wia-auth] Checking for WIA headers');
    console.log('[wia-auth] x-remote-user:', req.headers.get('x-remote-user'));
    console.log('[wia-auth] x-forwarded-user:', req.headers.get('x-forwarded-user'));
    console.log('[wia-auth] remote-user:', req.headers.get('remote-user'));

    if (!remoteUser) {
      console.log('[wia-auth] No WIA headers found - WIA not enabled');
      return new Response(
        JSON.stringify({ 
          wiaEnabled: false, 
          user: null,
          message: 'No Windows authentication headers detected'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    console.log('[wia-auth] Found remote user:', remoteUser);

    // Parse the Windows username
    const { username, domain, email } = parseWindowsUsername(remoteUser);
    console.log('[wia-auth] Parsed username:', { username, domain, email });

    // Initialize Supabase client with service role for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Look up or create WIA user
    let wiaUser: WiaUser | null = null;

    // First, try to find existing user
    const { data: existingUser, error: fetchError } = await supabase
      .from('wia_users')
      .select('*')
      .eq('windows_username', username)
      .eq('domain', domain || '')
      .maybeSingle();

    if (fetchError) {
      console.error('[wia-auth] Error fetching WIA user:', fetchError);
      throw fetchError;
    }

    if (existingUser) {
      console.log('[wia-auth] Found existing WIA user:', existingUser.id);
      
      // Update last login time
      const { error: updateError } = await supabase
        .from('wia_users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', existingUser.id);

      if (updateError) {
        console.warn('[wia-auth] Failed to update last_login_at:', updateError);
      }

      wiaUser = {
        id: existingUser.id,
        windowsUsername: existingUser.windows_username,
        domain: existingUser.domain,
        email: existingUser.email,
        displayName: existingUser.display_name,
        department: existingUser.department,
        jobTitle: existingUser.job_title,
        authUserId: existingUser.auth_user_id,
      };
    } else {
      console.log('[wia-auth] Creating new WIA user');
      
      // Create new WIA user
      const { data: newUser, error: insertError } = await supabase
        .from('wia_users')
        .insert({
          windows_username: username,
          domain: domain || null,
          email: email,
          display_name: username, // Default to username, can be updated later
        })
        .select()
        .single();

      if (insertError) {
        console.error('[wia-auth] Error creating WIA user:', insertError);
        throw insertError;
      }

      console.log('[wia-auth] Created new WIA user:', newUser.id);

      wiaUser = {
        id: newUser.id,
        windowsUsername: newUser.windows_username,
        domain: newUser.domain,
        email: newUser.email,
        displayName: newUser.display_name,
        department: newUser.department,
        jobTitle: newUser.job_title,
        authUserId: newUser.auth_user_id,
      };
    }

    return new Response(
      JSON.stringify({
        wiaEnabled: true,
        user: wiaUser,
        message: 'Windows authentication successful'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error: unknown) {
    console.error('[wia-auth] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ 
        wiaEnabled: false, 
        user: null,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
