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
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientType {
  id: string;
  type_name: string;
  description: string | null;
  is_active: boolean;
}

export const ClientTypes = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ClientType | null>(null);
  const [formData, setFormData] = useState({ type_name: "", description: "" });

  const queryClient = useQueryClient();

  const { data: types, isLoading } = useQuery<ClientType[]>({
    queryKey: ["client-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("client_types").select("*").order("type_name");
      if (error) throw error;
      return data || [];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (newType: { type_name: string; description: string }) => {
      const { data, error } = await supabase.from("client_types").insert([newType]).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-types"] });
      toast.success("Client type added!");
      setIsAddDialogOpen(false);
      setFormData({ type_name: "", description: "" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { type_name: string; description: string } }) => {
      const { data, error } = await supabase.from("client_types").update(updates).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-types"] });
      toast.success("Client type updated!");
      setIsEditDialogOpen(false);
      setSelectedType(null);
      setFormData({ type_name: "", description: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("client_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-types"] });
      toast.success("Client type deleted!");
    },
  });

  const filteredTypes = types?.filter((type) => type.type_name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Client Types</CardTitle>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild><Button><Plus className="w-4 h-4 mr-2" />Add Type</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add Client Type</DialogTitle></DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Type Name *</Label>
                  <Input value={formData.type_name} onChange={(e) => setFormData({ ...formData, type_name: e.target.value })} placeholder="Enter type name" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); setFormData({ type_name: "", description: "" }); }}>Cancel</Button>
                <Button onClick={() => formData.type_name.trim() ? addMutation.mutate(formData) : toast.error("Type name required")}>Add</Button>
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
        {isLoading ? <div className="text-center py-8">Loading...</div> : filteredTypes && filteredTypes.length > 0 ? (
          <Table>
            <TableHeader><TableRow><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {filteredTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">{type.type_name}</TableCell>
                  <TableCell>{type.description || "-"}</TableCell>
                  <TableCell><Badge variant={type.is_active ? "default" : "secondary"}>{type.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedType(type); setFormData({ type_name: type.type_name, description: type.description || "" }); setIsEditDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                    <Button variant="outline" size="sm" className="ml-2" onClick={() => confirm("Delete?") && deleteMutation.mutate(type.id)}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : <div className="text-center py-8 text-gray-500">No types found</div>}
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Client Type</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><Label>Type Name *</Label><Input value={formData.type_name} onChange={(e) => setFormData({ ...formData, type_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setSelectedType(null); }}>Cancel</Button>
            <Button onClick={() => selectedType && formData.type_name.trim() ? updateMutation.mutate({ id: selectedType.id, updates: formData }) : toast.error("Type name required")}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};