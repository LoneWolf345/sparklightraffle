import { useState, useEffect, useRef } from 'react';
import { Shield, Users, RefreshCw, UserPlus, Image, Upload, X, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useCompanyBranding } from '@/hooks/use-company-branding';

interface UserWithRole {
  id: string;
  user_id: string;
  email: string;
  created_at: string;
  role: 'admin' | 'user' | null;
}

export function AdminPanel() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteUserId, setPromoteUserId] = useState<string | null>(null);
  const [savingLogo, setSavingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  
  const { logoUrl, isLoading: logoLoading, updateCompanyLogo } = useCompanyBranding();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, email, created_at')
        .order('created_at', { ascending: true });

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles: UserWithRole[] = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id)
            .maybeSingle();

          return {
            ...profile,
            role: (roleData?.role as 'admin' | 'user') || null,
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handlePromote = async () => {
    if (!promoteUserId) return;

    try {
      // Check if user already has admin role
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', promoteUserId)
        .maybeSingle();

      if (existingRole?.role === 'admin') {
        toast({
          title: 'Already Admin',
          description: 'This user is already an admin',
        });
        setPromoteUserId(null);
        return;
      }

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from('user_roles')
          .update({ role: 'admin' })
          .eq('user_id', promoteUserId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: promoteUserId, role: 'admin' });

        if (error) throw error;
      }

      toast({
        title: 'User Promoted',
        description: 'User has been promoted to admin',
      });

      // Refresh the list
      fetchUsers();
    } catch (error) {
      console.error('Error promoting user:', error);
      toast({
        title: 'Error',
        description: 'Failed to promote user',
        variant: 'destructive',
      });
    } finally {
      setPromoteUserId(null);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid File',
        description: 'Please upload an image file',
        variant: 'destructive',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File Too Large',
        description: 'Please upload an image smaller than 5MB',
        variant: 'destructive',
      });
      return;
    }

    setSavingLogo(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      const success = await updateCompanyLogo(dataUrl);
      if (success) {
        toast({
          title: 'Logo Saved',
          description: 'Company logo has been updated for all users',
        });
      } else {
        toast({
          title: 'Error',
          description: 'Failed to save company logo',
          variant: 'destructive',
        });
      }
      setSavingLogo(false);
    };
    reader.readAsDataURL(file);
  };

  const handleClearLogo = async () => {
    setSavingLogo(true);
    const success = await updateCompanyLogo(null);
    if (success) {
      toast({
        title: 'Logo Removed',
        description: 'Company logo has been removed',
      });
      if (logoInputRef.current) logoInputRef.current.value = '';
    } else {
      toast({
        title: 'Error',
        description: 'Failed to remove company logo',
        variant: 'destructive',
      });
    }
    setSavingLogo(false);
  };

  const userToPromote = users.find(u => u.user_id === promoteUserId);

  return (
    <div className="space-y-6">
      {/* Company Branding Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Company Branding</CardTitle>
          </div>
          <CardDescription>
            Set the company logo that appears in presenter mode for all users and sessions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Company Logo</Label>
            <div className="flex items-center gap-4">
              {logoLoading ? (
                <div className="h-16 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground animate-pulse">
                  Loading...
                </div>
              ) : logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Company logo"
                    className="h-16 max-w-[200px] object-contain rounded border bg-background p-2"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={handleClearLogo}
                    disabled={savingLogo}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-16 w-32 border-2 border-dashed rounded flex items-center justify-center text-muted-foreground">
                  <Image className="h-6 w-6" />
                </div>
              )}
              <div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoUpload}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={savingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {savingLogo ? 'Saving...' : 'Upload Logo'}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG or JPG, max 5MB. Visible to all users.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Management Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <CardTitle>User Management</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <CardDescription>
            Manage user roles and permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              No registered users found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      {user.role === 'admin' ? (
                        <Badge className="bg-primary/10 text-primary">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {user.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setPromoteUserId(user.user_id)}
                        >
                          <UserPlus className="h-4 w-4 mr-1" />
                          Make Admin
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        <AlertDialog open={!!promoteUserId} onOpenChange={() => setPromoteUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Promote to Admin?</AlertDialogTitle>
              <AlertDialogDescription>
                This will give <strong>{userToPromote?.email}</strong> full admin access 
                including the ability to import participants, run raffles, and manage other users.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePromote}>
                Promote to Admin
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    </div>
  );
}
