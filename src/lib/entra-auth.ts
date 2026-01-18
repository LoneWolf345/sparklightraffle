// Microsoft Entra ID OIDC Authentication with PKCE

const TENANT_ID = 'd283f563-83f4-4d65-a9d1-028758bd1572';
const AUTHORIZATION_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`;
const TOKEN_ENDPOINT = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;
const SCOPES = 'openid profile email User.Read';

// Storage keys
const PKCE_VERIFIER_KEY = 'entra_pkce_verifier';
const STATE_KEY = 'entra_state';
const LINKING_AUTH_USER_ID_KEY = 'entra_linking_auth_user_id';

// Generate random string for PKCE and state
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// Generate PKCE code verifier (43-128 characters)
export function generateCodeVerifier(): string {
  return generateRandomString(32); // 64 hex chars
}

// Generate PKCE code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)));
  // Convert to base64url
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Get the redirect URI based on current origin
export function getRedirectUri(): string {
  return `${window.location.origin}/auth/callback`;
}

// Get the redirect URI for account linking flow
export function getLinkingRedirectUri(): string {
  return `${window.location.origin}/auth/callback/link`;
}

// Start the Entra ID login flow
export async function startEntraLogin(clientId: string): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);
  
  // Store PKCE verifier and state for callback
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(STATE_KEY, state);
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getRedirectUri(),
    scope: SCOPES,
    response_mode: 'query',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Request ID token claims
    nonce: generateRandomString(16),
  });
  
  window.location.href = `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

// Parse ID token claims (JWT)
export function parseIdToken(idToken: string): EntraIdTokenClaims | null {
  try {
    const parts = idToken.split('.');
    if (parts.length !== 3) return null;
    
    const payload = parts[1];
    // Decode base64url
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

// Validate state parameter
export function validateState(returnedState: string): boolean {
  const storedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  return storedState === returnedState;
}

// Get and clear the stored PKCE verifier
export function getAndClearCodeVerifier(): string | null {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  return verifier;
}

// Store the auth user ID for account linking
export function storeLinkingAuthUserId(authUserId: string): void {
  sessionStorage.setItem(LINKING_AUTH_USER_ID_KEY, authUserId);
}

// Get and clear the linking auth user ID
export function getAndClearLinkingAuthUserId(): string | null {
  const userId = sessionStorage.getItem(LINKING_AUTH_USER_ID_KEY);
  sessionStorage.removeItem(LINKING_AUTH_USER_ID_KEY);
  return userId;
}

// Start the Entra ID account linking flow
export async function startEntraLinking(clientId: string, authUserId: string): Promise<void> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateRandomString(16);
  
  // Store PKCE verifier, state, and auth user ID for callback
  sessionStorage.setItem(PKCE_VERIFIER_KEY, codeVerifier);
  sessionStorage.setItem(STATE_KEY, state);
  storeLinkingAuthUserId(authUserId);
  
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: getLinkingRedirectUri(),
    scope: SCOPES,
    response_mode: 'query',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    nonce: generateRandomString(16),
  });
  
  window.location.href = `${AUTHORIZATION_ENDPOINT}?${params.toString()}`;
}

// Types for Entra ID tokens
export interface EntraIdTokenClaims {
  iss: string;         // Issuer
  sub: string;         // Subject ID
  aud: string;         // Audience (client ID)
  exp: number;         // Expiration
  iat: number;         // Issued at
  nbf: number;         // Not before
  name?: string;       // Display name
  preferred_username?: string; // Email (UPN)
  email?: string;      // Email (if available)
  tid: string;         // Tenant ID
  oid: string;         // Object ID
  nonce?: string;      // Nonce for validation
}

export interface EntraTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  id_token: string;
}

export interface EntraUser {
  subjectId: string;
  tenantId: string;
  displayName: string;
  email: string;
}

// Extract user info from ID token
export function extractUserFromIdToken(claims: EntraIdTokenClaims): EntraUser {
  return {
    subjectId: claims.sub,
    tenantId: claims.tid,
    displayName: claims.name || claims.preferred_username || 'Unknown User',
    email: claims.preferred_username || claims.email || '',
  };
}

export { TOKEN_ENDPOINT, SCOPES };
