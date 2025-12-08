import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserCog, 
  Shield, 
  ShieldOff,
  ToggleLeft,
  ToggleRight,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

 interface UserProfile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  department: string | null;
  employee_id: string | null;
  created_at: string;
  email: string;
  role: string;
}

interface Surveyor {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

export const TeamManagement = () => {
  const queryClient = useQueryClient();
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: 'toggle' | 'role';
    userId?: string;
    currentStatus?: boolean;
    currentRole?: string;
  }>({ open: false, type: 'toggle' });

  // Fetch users with profiles and roles
  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['team-users'],
    queryFn: async () => {
      // Fetch all user roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at');
      
      if (rolesError) throw rolesError;

      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*');
      
      if (profilesError) throw profilesError;

      // Fetch all user emails using the database function
      // Fetch all user emails using the database function
      const { data: emails, error: emailsError } = await supabase
        .rpc('get_all_user_emails');
      
      if (emailsError) {
        console.error('Error fetching emails:', emailsError);
        toast.error('Failed to fetch emails: ' + emailsError.message);
      }
      
      console.log('Emails fetched:', emails);

      // Create a union of all unique user_ids
      const allUserIds = new Set<string>([
        ...(roles?.map(r => r.user_id).filter((id): id is string => !!id) || []),
        ...(profiles?.map(p => p.user_id).filter((id): id is string => !!id) || [])
      ]);

      // Combine data for each user
      const combined = Array.from(allUserIds).map(userId => {
        const userRole = roles?.find(r => r.user_id === userId);
        const userProfile = profiles?.find(p => p.user_id === userId);
        const userEmail = emails?.find(e => e.user_id === userId);
        
        const displayName = userProfile?.display_name 
          || userProfile?.first_name 
          || userEmail?.email?.split('@')[0]
          || `user-${userId.substring(0, 8)}`;

        return {
          user_id: userId,
          display_name: displayName,
          first_name: userProfile?.first_name || null,
          last_name: userProfile?.last_name || null,
          phone: userProfile?.phone || null,
          department: userProfile?.department || null,
          employee_id: userProfile?.employee_id || null,
          created_at: userProfile?.created_at || userRole?.created_at || new Date().toISOString(),
          email: userEmail?.email || 'No email',
          role: userRole?.role || 'user'
        };
      });
      
      return combined;
    },
  });

  // Fetch surveyors
  const { data: surveyors = [], isLoading: surveyorsLoading } = useQuery({
    queryKey: ['surveyors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('surveyors')
        .select('*');
      
      if (error) throw error;
      
      // Sort alphabetically by name on the frontend
      const sorted = (data as Surveyor[]).sort((a, b) => 
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      
      return sorted;
    },
  });

  // Toggle user role mutation
  const toggleRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-users'] });
      toast.success("User role updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });

  // Toggle surveyor active status
  // Toggle surveyor active status
  const toggleSurveyorMutation = useMutation({
    mutationFn: async ({ surveyorId, isActive }: { surveyorId: string; isActive: boolean }) => {
      const newStatus = !isActive;
      const { error } = await supabase
        .from('surveyors')
        .update({ is_active: newStatus })
        .eq('id', surveyorId);
      
      if (error) throw error;
      return newStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyors'] });
      toast.success("Surveyor status updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });

  const handleRoleToggle = (userId: string, currentRole: string) => {
    setConfirmDialog({
      open: true,
      type: 'role',
      userId,
      currentRole,
    });
  };

  const confirmRoleChange = () => {
    if (confirmDialog.userId && confirmDialog.currentRole) {
      const newRole = confirmDialog.currentRole === 'admin' ? 'user' : 'admin';
      toggleRoleMutation.mutate({ userId: confirmDialog.userId, newRole });
    }
    setConfirmDialog({ open: false, type: 'toggle' });
  };

  const handleSurveyorToggle = (surveyorId: string, isActive: boolean) => {
    toggleSurveyorMutation.mutate({ surveyorId, isActive });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-1">Manage users, roles, and surveyors</p>
      </div>

      {/* Tabs for Users and Surveyors */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="surveyors" className="flex items-center gap-2">
            <UserCog className="w-4 h-4" />
            Surveyors ({surveyors.length})
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No users found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell className="font-medium">
                          {user.display_name || user.first_name || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {user.email}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={user.role === 'admin' ? 'bg-blue-600' : ''}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRoleToggle(user.user_id, user.role)}
                            className="gap-2"
                          >
                            {user.role === 'admin' ? (
                              <>
                                <ShieldOff className="w-4 h-4" />
                                Remove Admin
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4" />
                                Make Admin
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Surveyors Tab */}
        <TabsContent value="surveyors" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Surveyor Management</CardTitle>
            </CardHeader>
            <CardContent>
              {surveyorsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : surveyors.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No surveyors found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40%]">Name</TableHead>
                      <TableHead className="w-[20%]">Status</TableHead>
                      <TableHead className="w-[20%]">Created</TableHead>
                      <TableHead className="text-right w-[20%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {surveyors.map((surveyor) => (
                      <TableRow key={surveyor.id}>
                        <TableCell className="font-medium">
                          {surveyor.name}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={surveyor.is_active ? 'default' : 'secondary'}
                            className={surveyor.is_active ? 'bg-green-600' : 'bg-gray-400'}
                          >
                            {surveyor.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(surveyor.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSurveyorToggle(surveyor.id, surveyor.is_active)}
                            className="gap-2"
                          >
                            {surveyor.is_active ? (
                              <>
                                <ToggleLeft className="w-4 h-4" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleRight className="w-4 h-4" />
                                Activate
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ ...confirmDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Role Change</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to {confirmDialog.currentRole === 'admin' ? 'remove admin privileges from' : 'grant admin privileges to'} this user?
              This will change their access level immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRoleChange}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};