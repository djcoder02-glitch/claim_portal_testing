import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

interface ClientAddress {
  id: string;
  company_id: string;
  address_label: string | null;
  full_address: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  is_primary: boolean;
  is_active: boolean;
}

interface ClientCompany {
  id: string;
  company_name: string;
}

export const ClientAddresses = () => {
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null);
  const [formData, setFormData] = useState({
    address_label: "",
    full_address: "",
    city: "",
    state: "",
    pincode: "",
    is_primary: false,
  });

  const queryClient = useQueryClient();

  const { data: companies } = useQuery<ClientCompany[]>({
    queryKey: ["client-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_companies").select("id, company_name").order("company_name");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: addresses, isLoading } = useQuery<ClientAddress[]>({
    queryKey: ["client-addresses", selectedCompanyId],
    queryFn: async () => {
      if (!selectedCompanyId) return [];
      const { data, error } = await supabase.from("client_addresses").select("*").eq("company_id", selectedCompanyId).order("is_primary", { ascending: false }).order("address_label");
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedCompanyId,
  });

  const addMutation = useMutation({
    mutationFn: async (newAddress: any) => {
      const { data, error } = await supabase.from("client_addresses").insert([{ ...newAddress, company_id: selectedCompanyId }]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-addresses"] });
      toast.success("Address added!");
      setIsAddDialogOpen(false);
      setFormData({ address_label: "", full_address: "", city: "", state: "", pincode: "", is_primary: false });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const { data, error } = await supabase.from("client_addresses").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-addresses"] });
      toast.success("Address updated!");
      setIsEditDialogOpen(false);
      setSelectedAddress(null);
      setFormData({ address_label: "", full_address: "", city: "", state: "", pincode: "", is_primary: false });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_addresses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-addresses"] });
      toast.success("Address deleted!");
    },
  });

  const selectedCompanyName = companies?.find(c => c.id === selectedCompanyId)?.company_name || "";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Client Addresses</CardTitle>
          <div className="flex gap-2">
            <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Select Company" />
              </SelectTrigger>
              <SelectContent>
                {companies?.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!selectedCompanyId}><Plus className="w-4 h-4 mr-2" />Add Address</Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Add Address for {selectedCompanyName}</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Address Label</Label><Input value={formData.address_label} onChange={(e) => setFormData({ ...formData, address_label: e.target.value })} placeholder="e.g., Pune Plant" /></div>
                    <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Full Address *</Label><Textarea value={formData.full_address} onChange={(e) => setFormData({ ...formData, full_address: e.target.value })} rows={3} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>State</Label><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Pincode</Label><Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} /></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox checked={formData.is_primary} onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked as boolean })} />
                    <Label>Set as primary address</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setFormData({ address_label: "", full_address: "", city: "", state: "", pincode: "", is_primary: false }); }}>Cancel</Button>
                  <Button onClick={() => formData.full_address.trim() ? addMutation.mutate(formData) : toast.error("Address required")}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedCompanyId ? (
          <div className="text-center py-12 text-gray-500"><Building2 className="w-12 h-12 mx-auto mb-4 text-gray-400" /><p>Select a company to view and manage addresses</p></div>
        ) : isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : addresses && addresses.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Label</TableHead><TableHead>Address</TableHead><TableHead>City</TableHead><TableHead>State</TableHead><TableHead>Pincode</TableHead><TableHead>Primary</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {addresses.map((addr) => (
                <TableRow key={addr.id}>
                  <TableCell className="font-medium">{addr.address_label || "-"}</TableCell>
                  <TableCell className="max-w-xs truncate">{addr.full_address}</TableCell>
                  <TableCell>{addr.city || "-"}</TableCell>
                  <TableCell>{addr.state || "-"}</TableCell>
                  <TableCell>{addr.pincode || "-"}</TableCell>
                  <TableCell>{addr.is_primary && <Badge>Primary</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedAddress(addr); setFormData({ address_label: addr.address_label || "", full_address: addr.full_address, city: addr.city || "", state: addr.state || "", pincode: addr.pincode || "", is_primary: addr.is_primary }); setIsEditDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" className="ml-2" onClick={() => confirm("Delete address?") && deleteMutation.mutate(addr.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-gray-500">No addresses for {selectedCompanyName}. Add one!</div>
        )}
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Edit Address</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Address Label</Label><Input value={formData.address_label} onChange={(e) => setFormData({ ...formData, address_label: e.target.value })} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Full Address *</Label><Textarea value={formData.full_address} onChange={(e) => setFormData({ ...formData, full_address: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>State</Label><Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} /></div>
              <div className="space-y-2"><Label>Pincode</Label><Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} /></div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox checked={formData.is_primary} onCheckedChange={(checked) => setFormData({ ...formData, is_primary: checked as boolean })} />
              <Label>Set as primary address</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedAddress(null); }}>Cancel</Button>
            <Button onClick={() => selectedAddress && formData.full_address.trim() ? updateMutation.mutate({ id: selectedAddress.id, updates: formData }) : toast.error("Address required")}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};