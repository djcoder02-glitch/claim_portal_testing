import { ClaimsDashboard } from "@/components/claims/ClaimsDashboard";
import { PolicyTypesManager } from "@/components/admin/PolicyTypesManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/components/auth/AuthProvider";

const Index = () => {
  const { isAdmin } = useAuth();
  
  return (
    <div className="min-h-screen bg-background">
      <Tabs defaultValue="dashboard" className="w-full">
        <div className="border-b bg-card">
          <div className="container mx-auto">
            <TabsList className="w-full justify-start h-14 bg-transparent border-0">
              <TabsTrigger value="dashboard" className="text-base">
                Claims Dashboard
              </TabsTrigger>
              {isAdmin && (
                <TabsTrigger value="admin" className="text-base">
                  Admin Settings
                </TabsTrigger>
              )}
            </TabsList>
          </div>
        </div>
        <div className="container mx-auto p-6">
          <TabsContent value="dashboard" className="mt-0">
            <ClaimsDashboard />
          </TabsContent>
          {isAdmin && (
            <TabsContent value="admin" className="mt-0">
              <PolicyTypesManager />
            </TabsContent>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default Index;
