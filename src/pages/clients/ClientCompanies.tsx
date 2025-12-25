import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientCompany {
  id: string;
  company_name: string;
  company_code: string | null;
  is_active: boolean;
}

export const ClientCompanies = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ClientCompany | null>(null);
  const [formData, setFormData] = useState({ company_name: "", company_code: "" });

  const queryClient = useQueryClient();

  const { data: companies, isLoading } = useQuery<ClientCompany[]>({
    queryKey: ["client-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_companies").select("*").order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newCompany: { company_name: string; company_code: string }) => {
      const { data, error } = await supabase.from("client_companies").insert([newCompany]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-companies"] });
      toast.success("Company added!");
      setIsAddDialogOpen(false);
      setFormData({ company_name: "", company_code: "" });
    },
    onError: (error) => toast.error("Failed: " + (error as Error).message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { company_name: string; company_code: string } }) => {
      const { data, error } = await supabase.from("client_companies").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-companies"] });
      toast.success("Company updated!");
      setIsEditDialogOpen(false);
      setSelectedCompany(null);
      setFormData({ company_name: "", company_code: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_companies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-companies"] });
      queryClient.invalidateQueries({ queryKey: ["client-addresses"] });
      toast.success("Company deleted!");
    },
  });

  const filteredCompanies = companies?.filter((c) => 
    c.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.company_code?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Client Companies</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Company</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Company Name *</Label>
                  <Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder="e.g., Coca Cola" />
                </div>
                <div className="space-y-2">
                  <Label>Company Code</Label>
                  <Input value={formData.company_code} onChange={(e) => setFormData({ ...formData, company_code: e.target.value })} placeholder="e.g., COCA_COLA" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setFormData({ company_name: "", company_code: "" }); }}>Cancel</Button>
                <Button onClick={() => formData.company_name.trim() ? addMutation.mutate(formData) : toast.error("Company name required")}>Add</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>
        {isLoading ? <div className="text-center py-8">Loading...</div> : filteredCompanies && filteredCompanies.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Company</TableHead><TableHead>Code</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">{company.company_name}</TableCell>
                  <TableCell>{company.company_code || "-"}</TableCell>
                  <TableCell><Badge variant={company.is_active ? "default" : "secondary"}>{company.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedCompany(company); setFormData({ company_name: company.company_name, company_code: company.company_code || "" }); setIsEditDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" className="ml-2" onClick={() => confirm("Delete company and all addresses?") && deleteMutation.mutate(company.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <div className="text-center py-8 text-gray-500">No companies found</div>}
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Company Name *</Label><Input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Company Code</Label><Input value={formData.company_code} onChange={(e) => setFormData({ ...formData, company_code: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedCompany(null); }}>Cancel</Button>
            <Button onClick={() => selectedCompany && formData.company_name.trim() ? updateMutation.mutate({ id: selectedCompany.id, updates: formData }) : toast.error("Company name required")}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};