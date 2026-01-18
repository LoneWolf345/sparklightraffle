import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Link } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { 
  validateState, 
  getAndClearCodeVerifier, 
  getLinkingRedirectUri,
  getAndClearLinkingAuthUserId,
} from '@/lib/entra-auth';

type CallbackState = 'processing' | 'success' | 'error';

export default function AuthCallbackLink() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<CallbackState>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const returnedState = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle errors from Microsoft
        if (error) {
          throw new Error(errorDescription || error);
        }

        if (!code || !returnedState) {
          throw new Error('Missing authorization code or state');
        }

        // Validate state parameter
        if (!validateState(returnedState)) {
          throw new Error('Invalid state parameter - possible CSRF attack');
        }

        // Get the auth user ID that was stored before redirect
        const authUserId = getAndClearLinkingAuthUserId();
        if (!authUserId) {
          throw new Error('No user ID found for linking - session may have expired');
        }

        // Get PKCE verifier
        const codeVerifier = getAndClearCodeVerifier();
        if (!codeVerifier) {
          throw new Error('PKCE verifier not found - session may have expired');
        }

        // Call the linking edge function
        const { data, error: functionError } = await supabase.functions.invoke('entra-link-account', {
          body: {
            code,
            codeVerifier,
            redirectUri: getLinkingRedirectUri(),
            authUserId,
          },
        });

        if (functionError) {
          throw new Error(functionError.message || 'Failed to link account');
        }

        if (!data?.success) {
          throw new Error(data?.error || 'Account linking failed');
        }

        setState('success');

        // Redirect to settings after a brief delay
        setTimeout(() => {
          navigate('/settings?linked=true', { replace: true });
        }, 1500);

      } catch (err) {
        console.error('Account linking error:', err);
        setErrorMessage(err instanceof Error ? err.message : 'An unexpected error occurred');
        setState('error');
      }
    };

    processCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {state === 'processing' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Linking Account
              </>
            )}
            {state === 'success' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                Account Linked
              </>
            )}
            {state === 'error' && (
              <>
                <AlertCircle className="h-5 w-5 text-destructive" />
                Linking Failed
              </>
            )}
          </CardTitle>
          <CardDescription>
            {state === 'processing' && 'Connecting your Microsoft account...'}
            {state === 'success' && 'Your Microsoft account has been successfully connected!'}
            {state === 'error' && 'We couldn\'t connect your Microsoft account'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {state === 'processing' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Link className="h-6 w-6 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Fetching your Microsoft profile data...
              </p>
            </div>
          )}

          {state === 'success' && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Redirecting to settings...
              </p>
            </div>
          )}

          {state === 'error' && (
            <>
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>

              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/settings', { replace: true })}>
                  Return to Settings
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
