import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientTypes } from "./clients/ClientTypes";
import { ClientCompanies } from "./clients/ClientCompanies";
import { ClientAddresses } from "./clients/ClientAdresses";

export const Clients = () => {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Client Management</h1>
        <p className="text-gray-600">Manage client companies and addresses</p>
      </div>

      <Tabs defaultValue="companies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="companies">Client Companies</TabsTrigger>
          <TabsTrigger value="addresses">Client Addresses</TabsTrigger>
          <TabsTrigger value="types">Client Types</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <ClientCompanies />
        </TabsContent>

        <TabsContent value="addresses">
          <ClientAddresses />
        </TabsContent>

        <TabsContent value="types">
          <ClientTypes />
        </TabsContent>
      </Tabs>
    </div>
  );
};