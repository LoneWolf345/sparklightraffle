import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, User, Shield, Clock, Bell, Palette, Mail, Briefcase, Building, Calendar, LogOut, Link2, CheckCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/use-auth-safe';
import { useEntraUser } from '@/hooks/use-entra-user';
import { useCompanyBranding } from '@/hooks/use-company-branding';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { startEntraLinking } from '@/lib/entra-auth';
import { toast } from 'sonner';

// Microsoft logo SVG component
const MicrosoftLogo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
  </svg>
);

export default function Settings() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAdmin, isAuthenticated, isLoading: authLoading, signOut } = useAuth();
  const { displayName, profilePhotoUrl, jobTitle, department, email: entraEmail, isEntraUser } = useEntraUser();
  const { logoUrl: companyLogoUrl } = useCompanyBranding();

  // Preferences state (stored in localStorage)
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    soundEffects: true,
    reducedMotion: false,
    darkMode: false,
  });

  // Entra config state
  const [entraClientId, setEntraClientId] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  // Load preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('userPreferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse preferences:', e);
      }
    }
  }, []);

  // Fetch Entra config on mount
  useEffect(() => {
    supabase.functions.invoke('get-entra-config').then(({ data }) => {
      if (data?.enabled && data?.clientId) {
        setEntraClientId(data.clientId);
      }
    });
  }, []);

  // Check for success redirect from linking flow
  useEffect(() => {
    if (searchParams.get('linked') === 'true') {
      toast.success('Microsoft account connected successfully!', {
        description: 'Your profile photo, job title, and department are now available.',
      });
      // Clean up the URL
      window.history.replaceState({}, '', '/settings');
    }
  }, [searchParams]);

  // Save preferences to localStorage
  const updatePreference = (key: keyof typeof preferences, value: boolean) => {
    const updated = { ...preferences, [key]: value };
    setPreferences(updated);
    localStorage.setItem('userPreferences', JSON.stringify(updated));
  };

  // Handle Microsoft account linking
  const handleLinkMicrosoft = async () => {
    if (!entraClientId || !user?.id) {
      toast.error('Unable to connect Microsoft account', {
        description: 'Configuration is not available. Please try again later.',
      });
      return;
    }

    setIsLinking(true);
    try {
      await startEntraLinking(entraClientId, user.id);
    } catch (error) {
      console.error('Failed to start Microsoft linking:', error);
      toast.error('Failed to start Microsoft linking');
      setIsLinking(false);
    }
  };

  const userDisplayName = displayName || user?.email;
  const userEmail = entraEmail || user?.email;

  // Session info
  const sessionCreatedAt = user?.created_at ? new Date(user.created_at) : null;
  const lastSignIn = user?.last_sign_in_at ? new Date(user.last_sign_in_at) : null;

  // Redirect if not authenticated
  if (!authLoading && !isAuthenticated) {
    navigate('/auth');
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <h1 className="text-lg font-semibold">Settings</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-8">
          {/* Profile Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile
              </CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-6">
                <Avatar className="h-20 w-20">
                  {profilePhotoUrl ? (
                    <AvatarImage src={profilePhotoUrl} alt={userDisplayName || "User"} />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {userDisplayName?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <h3 className="text-xl font-semibold">{userDisplayName}</h3>
                  <div className="flex flex-wrap gap-2">
                    {isAdmin && (
                      <span className="flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                    {isEntraUser && (
                      <span className="flex items-center gap-1 text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full">
                        Microsoft SSO
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Profile Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Mail className="h-3 w-3" />
                    Email
                  </Label>
                  <p className="text-sm font-medium">{userEmail || 'Not available'}</p>
                </div>

                {jobTitle && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Briefcase className="h-3 w-3" />
                      Job Title
                    </Label>
                    <p className="text-sm font-medium">{jobTitle}</p>
                  </div>
                )}

                {department && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <Building className="h-3 w-3" />
                      Department
                    </Label>
                    <p className="text-sm font-medium">{department}</p>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3 w-3" />
                    User ID
                  </Label>
                  <p className="text-sm font-mono text-muted-foreground truncate" title={user?.id}>
                    {user?.id}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Microsoft Account Linking - Only show for non-Entra users */}
          {!isEntraUser && entraClientId && (
            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MicrosoftLogo className="h-5 w-5" />
                  Connect Microsoft Account
                </CardTitle>
                <CardDescription>
                  Link your Microsoft account to display your profile photo, job title, and department
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                  <Link2 className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Connecting your Microsoft account will:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li>Display your Microsoft profile photo</li>
                      <li>Show your job title from your organization</li>
                      <li>Show your department from your organization</li>
                    </ul>
                  </div>
                </div>
                <Button 
                  onClick={handleLinkMicrosoft} 
                  className="gap-2"
                  disabled={isLinking}
                >
                  <MicrosoftLogo className="h-4 w-4" />
                  {isLinking ? 'Connecting...' : 'Connect Microsoft Account'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Already linked indicator */}
          {isEntraUser && entraClientId && (
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  Microsoft Account Connected
                </CardTitle>
                <CardDescription>
                  Your Microsoft account is linked and providing your profile data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 rounded-lg text-sm">
                  <MicrosoftLogo className="h-5 w-5" />
                  <span className="text-green-700 dark:text-green-400">
                    Profile photo, job title, and department are synced from Microsoft
                  </span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleLinkMicrosoft}
                  disabled={isLinking}
                  className="gap-2"
                >
                  <Link2 className="h-4 w-4" />
                  {isLinking ? 'Refreshing...' : 'Refresh Profile'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Session Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Information
              </CardTitle>
              <CardDescription>
                Details about your current session and account activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Account Created
                  </Label>
                  <p className="text-sm font-medium">
                    {sessionCreatedAt 
                      ? sessionCreatedAt.toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      : 'Not available'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Last Sign In
                  </Label>
                  <p className="text-sm font-medium">
                    {lastSignIn 
                      ? lastSignIn.toLocaleString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Not available'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Authentication Method</Label>
                  <p className="text-sm font-medium">
                    {isEntraUser ? 'Microsoft Entra ID (SSO)' : 'Email & Password'}
                  </p>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Session Status</Label>
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    Active
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Preferences Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Preferences
              </CardTitle>
              <CardDescription>
                Customize your experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sound-effects" className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    Sound Effects
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Play sound effects during raffle animations
                  </p>
                </div>
                <Switch
                  id="sound-effects"
                  checked={preferences.soundEffects}
                  onCheckedChange={(checked) => updatePreference('soundEffects', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reduced-motion" className="flex items-center gap-2">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    Reduced Motion
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Minimize animations for accessibility
                  </p>
                </div>
                <Switch
                  id="reduced-motion"
                  checked={preferences.reducedMotion}
                  onCheckedChange={(checked) => updatePreference('reducedMotion', checked)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications" className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    Email Notifications
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Receive email updates about draw results
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={preferences.emailNotifications}
                  onCheckedChange={(checked) => updatePreference('emailNotifications', checked)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sign Out Section */}
          <Card className="border-destructive/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <LogOut className="h-5 w-5" />
                Sign Out
              </CardTitle>
              <CardDescription>
                End your current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="destructive" 
                onClick={() => {
                  signOut();
                  navigate('/');
                }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
