import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { LayoutDashboard } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sign In Form State
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Sign Up Form State
  const [signUpData, setSignUpData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    displayName: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    department: "",
    employeeId: "",
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) throw error;
      
      toast.success("Signed in successfully!");
      navigate("/");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error("Sign in failed: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (signUpData.password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setIsSubmitting(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Step 1: Create the user account
      const { data, error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) throw error;
      
      if (data.user) {
        // Step 2: Create user role
        try {
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({ 
              user_id: data.user.id, 
              role: 'user' 
            }, { 
              onConflict: 'user_id' 
            });
          
          if (roleError) {
            console.error('Role creation error:', roleError);
          }
        } catch (roleError) {
          console.error('Failed to create user role:', roleError);
        }

        // Step 3: Create profile with additional information
        try {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              user_id: data.user.id,
              first_name: signUpData.firstName,
              display_name: signUpData.displayName || signUpData.firstName,
              last_name: signUpData.lastName,
              phone: signUpData.phone,
              address: signUpData.address,
              department: signUpData.department,
              employee_id: signUpData.employeeId,
            }, {
              onConflict: 'user_id'
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            toast.warning("Account created but profile update failed. You can update it later.");
          }
        } catch (profileError) {
          console.error('Failed to create profile:', profileError);
        }

        // Step 4: Show success message
        if (data.user.email_confirmed_at) {
          toast.success("Account created and signed in successfully!");
        } else {
          toast.success("Account created! Please check your email to confirm your account.");
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      toast.error("Sign up failed: " + errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center pb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard className="w-10 h-10 text-white" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold">Gondalia Insurance</CardTitle>
          <CardDescription>Welcome to the Claims Management System</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Sign In Tab */}
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    placeholder="••••••••"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Email and Password */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={signUpData.phone}
                      onChange={(e) => setSignUpData({ ...signUpData, phone: e.target.value })}
                    />
                  </div>
                </div>
                
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="signup-displayname">Display Name *</Label>
                  <Input
                    id="signup-displayname"
                    type="text"
                    placeholder="How you want to be called"
                    value={signUpData.displayName}
                    onChange={(e) => setSignUpData({ ...signUpData, displayName: e.target.value })}
                    required
                  />
                </div>

                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-firstname">First Name</Label>
                    <Input
                      id="signup-firstname"
                      type="text"
                      placeholder="John"
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-lastname">Last Name</Label>
                    <Input
                      id="signup-lastname"
                      type="text"
                      placeholder="Doe"
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                    />
                  </div>
                </div>

                {/* Department and Employee ID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-department">Department</Label>
                    <Input
                      id="signup-department"
                      type="text"
                      placeholder="Claims Department"
                      value={signUpData.department}
                      onChange={(e) => setSignUpData({ ...signUpData, department: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-employeeid">Employee ID</Label>
                    <Input
                      id="signup-employeeid"
                      type="text"
                      placeholder="GIS-USR-001"
                      value={signUpData.employeeId}
                      onChange={(e) => setSignUpData({ ...signUpData, employeeId: e.target.value })}
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="space-y-2">
                  <Label htmlFor="signup-address">Address</Label>
                  <Input
                    id="signup-address"
                    type="text"
                    placeholder="123 Business Park, Mumbai, Maharashtra"
                    value={signUpData.address}
                    onChange={(e) => setSignUpData({ ...signUpData, address: e.target.value })}
                  />
                </div>

                {/* Password Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.password}
                      onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">Confirm Password *</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="••••••••"
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating account..." : "Create Account"}
                </Button>

                <p className="text-xs text-gray-500 text-center mt-2">
                  * Required fields
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;