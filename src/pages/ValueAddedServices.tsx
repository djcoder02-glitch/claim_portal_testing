import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ValueAddedService {
  id: string;
  service_name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const ValueAddedServices = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<ValueAddedService | null>(null);
  const [formData, setFormData] = useState({
    service_name: "",
    description: "",
  });

  const queryClient = useQueryClient();

  const { data: services, isLoading } = useQuery<ValueAddedService[]>({
    queryKey: ["value-added-services"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("value_added_services")
        .select("*")
        .order("service_name");

      if (error) throw error;
      return data || [];
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async (newService: { service_name: string; description: string }) => {
      const { data, error } = await supabase
        .from("value_added_services")
        .insert([newService])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["value-added-services"] });
      toast.success("Service added successfully!");
      setIsAddDialogOpen(false);
      setFormData({ service_name: "", description: "" });
    },
    onError: (error) => {
      toast.error("Failed to add service: " + (error as Error).message);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { service_name: string; description: string };
    }) => {
      const { data, error } = await supabase
        .from("value_added_services")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["value-added-services"] });
      toast.success("Service updated successfully!");
      setIsEditDialogOpen(false);
      setSelectedService(null);
      setFormData({ service_name: "", description: "" });
    },
    onError: (error) => {
      toast.error("Failed to update service: " + (error as Error).message);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("value_added_services")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["value-added-services"] });
      toast.success("Service deleted successfully!");
    },
    onError: (error) => {
      toast.error("Failed to delete service: " + (error as Error).message);
    },
  });

  const handleAdd = () => {
    if (!formData.service_name.trim()) {
      toast.error("Service name is required");
      return;
    }
    addServiceMutation.mutate(formData);
  };

  const handleEdit = (service: ValueAddedService) => {
    setSelectedService(service);
    setFormData({
      service_name: service.service_name,
      description: service.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!selectedService || !formData.service_name.trim()) {
      toast.error("Service name is required");
      return;
    }
    updateServiceMutation.mutate({
      id: selectedService.id,
      updates: formData,
    });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this service?")) {
      deleteServiceMutation.mutate(id);
    }
  };

  const filteredServices = services?.filter((service) =>
    service.service_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Value Added Services</h1>
        <p className="text-gray-600">Manage your value-added service offerings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Services</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_name">Service Name *</Label>
                    <Input
                      id="service_name"
                      value={formData.service_name}
                      onChange={(e) =>
                        setFormData({ ...formData, service_name: e.target.value })
                      }
                      placeholder="Enter service name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      placeholder="Enter service description"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setFormData({ service_name: "", description: "" });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAdd} disabled={addServiceMutation.isPending}>
                    {addServiceMutation.isPending ? "Adding..." : "Add Service"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading services...</div>
          ) : filteredServices && filteredServices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Service Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredServices.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.service_name}</TableCell>
                    <TableCell>{service.description || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(service)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(service.id)}
                          disabled={deleteServiceMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No services found" : "No services yet. Add your first service!"}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Service</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit_service_name">Service Name *</Label>
              <Input
                id="edit_service_name"
                value={formData.service_name}
                onChange={(e) =>
                  setFormData({ ...formData, service_name: e.target.value })
                }
                placeholder="Enter service name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter service description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setSelectedService(null);
                setFormData({ service_name: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateServiceMutation.isPending}>
              {updateServiceMutation.isPending ? "Updating..." : "Update Service"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};