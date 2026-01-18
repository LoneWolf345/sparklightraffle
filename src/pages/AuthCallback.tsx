import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { validateState, getAndClearCodeVerifier, getRedirectUri } from '@/lib/entra-auth';

type CallbackState = 'processing' | 'success' | 'error';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('processing');
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const returnedState = searchParams.get('state');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Check for OAuth error
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // Validate required parameters
        if (!code) {
          throw new Error('No authorization code received');
        }

        if (!returnedState) {
          throw new Error('No state parameter received');
        }

        // Validate state to prevent CSRF
        if (!validateState(returnedState)) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Get PKCE verifier
        const codeVerifier = getAndClearCodeVerifier();
        if (!codeVerifier) {
          throw new Error('No PKCE verifier found - please try logging in again');
        }

        // Exchange code for tokens via edge function
        const { data, error: invokeError } = await supabase.functions.invoke('entra-token-exchange', {
          body: {
            code,
            codeVerifier,
            redirectUri: getRedirectUri(),
          },
        });

        if (invokeError) {
          throw new Error(invokeError.message || 'Token exchange failed');
        }

        if (!data.success) {
          throw new Error(data.error || 'Authentication failed');
        }

        setUserName(data.user.displayName);

        // Verify the magic link token to complete authentication
        if (data.verifyToken && data.verifyType) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: data.verifyToken,
            type: data.verifyType,
          });

          if (verifyError) {
            console.error('OTP verification error:', verifyError);
            // Try alternative approach - the user might already be logged in
            const { data: session } = await supabase.auth.getSession();
            if (!session.session) {
              throw new Error('Failed to complete authentication');
            }
          }
        }

        setState('success');

        // Redirect to home after short delay
        setTimeout(() => {
          navigate('/', { replace: true });
        }, 1500);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setState('error');
      }
    };

    processCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>
            {state === 'processing' && 'Signing in...'}
            {state === 'success' && 'Welcome!'}
            {state === 'error' && 'Authentication Failed'}
          </CardTitle>
          <CardDescription>
            {state === 'processing' && 'Completing your sign-in with Microsoft Entra ID'}
            {state === 'success' && `Hello, ${userName}!`}
            {state === 'error' && 'There was a problem signing you in'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {state === 'processing' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}

          {state === 'success' && (
            <CheckCircle className="h-12 w-12 text-green-500" />
          )}

          {state === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive" />
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigate('/auth')}>
                  Try Again
                </Button>
                <Button variant="ghost" onClick={() => navigate('/')}>
                  Continue as Guest
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
