import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TENANT_ID = "d283f563-83f4-4d65-a9d1-028758bd1572";
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

interface TokenRequest {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

interface EntraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token: string;
}

interface IdTokenClaims {
  sub: string;
  tid: string;
  name?: string;
  preferred_username?: string;
  email?: string;
  oid: string;
}

interface GraphProfile {
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
  givenName?: string;
  surname?: string;
  jobTitle?: string;
  department?: string;
}

// Parse JWT without verification (we trust Microsoft's signature)
function parseJwt(token: string): IdTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Fetch user profile from Microsoft Graph
async function fetchGraphProfile(accessToken: string): Promise<GraphProfile | null> {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
      console.log("Graph profile fetch failed:", response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching Graph profile:", error);
    return null;
  }
}

// Fetch user profile photo from Microsoft Graph
async function fetchProfilePhoto(accessToken: string): Promise<string | null> {
  try {
    const response = await fetch("https://graph.microsoft.com/v1.0/me/photo/$value", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!response.ok) {
      console.log("Profile photo not available:", response.status);
      return null;
    }
    
    const photoBlob = await response.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(photoBlob)));
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.log("Error fetching profile photo:", error);
    return null;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { code, codeVerifier, redirectUri }: TokenRequest = await req.json();

    if (!code || !codeVerifier || !redirectUri) {
      return new Response(
        JSON.stringify({ error: "Missing required parameters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientId = Deno.env.get("ENTRA_CLIENT_ID");
    if (!clientId) {
      console.error("ENTRA_CLIENT_ID not configured");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Exchange authorization code for tokens (with User.Read scope)
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      scope: "openid profile email User.Read",
      code: code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier,
    });

    console.log("Exchanging code for tokens...");

    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenParams.toString(),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error("Token exchange failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Token exchange failed", details: errorText }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokens: EntraTokenResponse = await tokenResponse.json();
    console.log("Token exchange successful");

    // Parse ID token to get user info
    const claims = parseJwt(tokens.id_token);
    if (!claims) {
      return new Response(
        JSON.stringify({ error: "Failed to parse ID token" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch additional profile data from Microsoft Graph
    const graphProfile = await fetchGraphProfile(tokens.access_token);
    const profilePhotoUrl = await fetchProfilePhoto(tokens.access_token);
    
    console.log("Graph profile fetched:", graphProfile ? "yes" : "no");
    console.log("Profile photo fetched:", profilePhotoUrl ? "yes" : "no");

    // Use Graph profile data if available, fallback to ID token claims
    const email = graphProfile?.mail || graphProfile?.userPrincipalName || claims.preferred_username || claims.email || "";
    const displayName = graphProfile?.displayName || claims.name || email;

    // Create Supabase admin client to create/sign in user
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user exists by email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    let supabaseUser = existingUsers?.users?.find(u => u.email === email);

    if (!supabaseUser) {
      // Create new user with a random password (they'll use SSO)
      const randomPassword = crypto.randomUUID() + crypto.randomUUID();
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: {
          name: displayName,
          entra_subject_id: claims.sub,
          entra_tenant_id: claims.tid,
        },
      });

      if (createError) {
        console.error("Failed to create user:", createError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      supabaseUser = newUser.user;
      console.log("Created new Supabase user:", supabaseUser.id);
    } else {
      // Update existing user metadata
      await supabaseAdmin.auth.admin.updateUserById(supabaseUser.id, {
        user_metadata: {
          name: displayName,
          entra_subject_id: claims.sub,
          entra_tenant_id: claims.tid,
        },
      });
      console.log("Updated existing user:", supabaseUser.id);
    }

    // Upsert entra_users record with profile photo and job info
    const { data: entraUserRecord, error: entraError } = await supabaseAdmin
      .from("entra_users")
      .upsert({
        tenant_id: claims.tid,
        subject_id: claims.sub,
        display_name: displayName,
        email: email,
        auth_user_id: supabaseUser.id,
        last_login_at: new Date().toISOString(),
        profile_photo_url: profilePhotoUrl,
        job_title: graphProfile?.jobTitle || null,
        department: graphProfile?.department || null,
      }, {
        onConflict: "tenant_id,subject_id",
      })
      .select()
      .single();

    if (entraError) {
      console.error("Failed to upsert entra_users:", entraError);
    }

    // Log the login action
    if (entraUserRecord) {
      await supabaseAdmin.rpc("log_action", {
        p_user_id: entraUserRecord.id,
        p_action_type: "LOGIN",
        p_entity_type: "session",
        p_entity_id: null,
        p_details_json: { method: "entra_sso", tenant_id: claims.tid },
      });
    }

    // Generate a session for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: email,
      options: {
        redirectTo: `${redirectUri.replace("/auth/callback", "/")}`,
      },
    });

    if (sessionError) {
      console.error("Failed to generate session link:", sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract the token from the magic link
    const magicLinkUrl = new URL(sessionData.properties.action_link);
    const token = magicLinkUrl.searchParams.get("token");
    const tokenType = magicLinkUrl.searchParams.get("type");

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: supabaseUser.id,
          email: email,
          displayName: displayName,
          entraSubjectId: claims.sub,
          entraTenantId: claims.tid,
          profilePhotoUrl: profilePhotoUrl,
        },
        entraUserId: entraUserRecord?.id,
        verifyToken: token,
        verifyType: tokenType,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Token exchange error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
