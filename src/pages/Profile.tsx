import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  Edit,
  Target,
  Award,
  Activity,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  address: string | null;
  department: string | null;
  employee_id: string | null;
  created_at: string;
  display_name: string | null;
}

export const Profile = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    displayName: "",
    lastName: "",
    phone: "",
    address: "",
    department: "",
    employeeId: "",
  });

  // Fetch profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data as ProfileData;
    },
    enabled: !!user?.id,
  });

  // Fetch claims count for stats
  const { data: claimsStats, isLoading: statsLoading } = useQuery({
    queryKey: ['claims-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return { total: 0, completed: 0 };

      const { data, error } = await supabase
        .from('claims')
        .select('id, status')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error fetching claims stats:', error);
        return { total: 0, completed: 0 };
      }

      const total = data.length;
      const completed = data.filter(c => 
        c.status === 'approved' || c.status === 'paid'
      ).length;

      return { total, completed };
    },
    enabled: !!user?.id,
  });

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name || "",
        displayName: profile.display_name || "",
        lastName: profile.last_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        department: profile.department || "",
        employeeId: profile.employee_id || "",
      });
    }
  }, [profile]);

  // Mutation to update profile
  const updateProfileMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!user?.id) throw new Error("No user ID");

      const { error } = await supabase
        .from('profiles')
        .upsert({
            display_name: data.displayName,
          user_id: user.id,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          address: data.address,
          department: data.department,
          employee_id: data.employeeId,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      toast.success("Profile updated successfully");
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    },
  });

  const getUserInitials = () => {
  if (formData.displayName) {
    return formData.displayName.substring(0, 2).toUpperCase();
  }
  if (formData.firstName && formData.lastName) {
    return `${formData.firstName.charAt(0)}${formData.lastName.charAt(0)}`.toUpperCase();
  }
  return user?.email?.charAt(0).toUpperCase() || "U";
};

  const handleSaveChanges = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (profileLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const completionRate = claimsStats && claimsStats.total > 0
    ? ((claimsStats.completed / claimsStats.total) * 100).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-1">Manage your personal information and preferences</p>
        </div>
        <Button
          onClick={() => setIsEditing(!isEditing)}
          className="bg-blue-600 hover:bg-blue-700"
          disabled={updateProfileMutation.isPending}
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center">
                {/* Avatar */}
                <Avatar className="w-32 h-32 bg-blue-600 text-white text-4xl font-bold mb-4">
                  <AvatarFallback className="bg-blue-600 text-white text-4xl">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>

                {/* Name and Role */}
                <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {formData.displayName || 
                (formData.firstName || formData.lastName
                    ? `${formData.firstName || ''} ${formData.lastName || ''}`.trim()
                    : user?.email?.split('@')[0] || "User")}
                </h2>
                <p className="text-gray-600 mb-3">
                  {userRole === 'admin' ? 'System Administrator' : 'User'}
                </p>
                
                {/* Status Badge */}
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 mb-6">
                  Active
                </Badge>

                {/* Contact Info */}
                <div className="w-full space-y-3 text-left">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm break-all">{user?.email}</span>
                  </div>
                  {formData.phone && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Phone className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{formData.phone}</span>
                    </div>
                  )}
                  {formData.address && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">{formData.address.split(',')[0]}</span>
                    </div>
                  )}
                  {profile?.created_at && (
                    <div className="flex items-center gap-3 text-gray-600">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span className="text-sm">
                        Joined {format(new Date(profile.created_at), 'MMM yyyy')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Personal Information */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="text-blue-600">👤</span>
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Display Name */}
                <div>
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                    id="displayName"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    className="mt-1"
                    placeholder="How you want to be called"
                />
                </div>
              <div className="space-y-6">
                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="mt-1 bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    rows={3}
                    className="mt-1"
                  />
                </div>

                {/* Department and Employee ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      name="department"
                      value={formData.department}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employeeId">Employee ID</Label>
                    <Input
                      id="employeeId"
                      name="employeeId"
                      value={formData.employeeId}
                      onChange={handleInputChange}
                      disabled={!isEditing}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Save Button */}
                {isEditing && (
                  <Button
                    onClick={handleSaveChanges}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Tasks Completed</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {claimsStats?.completed || 0}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Out of {claimsStats?.total || 0} total claims
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-full">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <h3 className="text-3xl font-bold text-gray-900">{completionRate}%</h3>
                <p className="text-sm text-green-600 mt-1">
                  {Number(completionRate) >= 50 ? "Great progress" : "Keep going"}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-full">
                <Award className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Active Claims</p>
                <h3 className="text-3xl font-bold text-gray-900">
                  {(claimsStats?.total || 0) - (claimsStats?.completed || 0)}
                </h3>
                <p className="text-sm text-blue-600 mt-1">In progress</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-full">
                <Activity className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};