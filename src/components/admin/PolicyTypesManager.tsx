import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, Edit, Plus, Settings } from "lucide-react";
import { usePolicyTypes } from "@/hooks/useClaims";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PolicyType {
  id: string;
  name: string;
  description: string;
  fields: any[];
}

export const PolicyTypesManager = () => {
  const { data: policyTypes, isLoading, refetch } = usePolicyTypes();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<PolicyType | null>(null);
  const [newType, setNewType] = useState({ name: "", description: "" });
  const [loading, setLoading] = useState(false);

  const handleAddPolicyType = async () => {
    if (!newType.name.trim()) {
      toast.error("Policy type name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("policy_types")
        .insert({
          name: newType.name,
          description: newType.description,
          fields: []
        });

      if (error) throw error;

      toast.success("Policy type added successfully");
      setNewType({ name: "", description: "" });
      setIsAddDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to add policy type");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePolicyType = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("policy_types")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Policy type deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete policy type");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePolicyType = async () => {
    if (!editingType || !editingType.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("policy_types")
        .update({
          name: editingType.name,
          description: editingType.description
        })
        .eq("id", editingType.id);

      if (error) throw error;

      toast.success("Policy type updated successfully");
      setEditingType(null);
      refetch();
    } catch (error) {
      toast.error("Failed to update policy type");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Policy Types Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Policy Types Management
            </CardTitle>
            <CardDescription>
              Manage insurance policy types available for claims
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Policy Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Policy Type</DialogTitle>
                <DialogDescription>
                  Create a new insurance policy type
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newType.name}
                    onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Marine, Fire, Engineering"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newType.description}
                    onChange={(e) => setNewType(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Brief description of this policy type"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddPolicyType} disabled={loading}>
                    {loading ? "Adding..." : "Add Policy Type"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {policyTypes && policyTypes.length > 0 ? (
          <div className="space-y-4">
            {policyTypes.map((type) => (
              <div key={type.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{type.name}</h3>
                    <Badge variant="secondary">
                      {type.fields?.length || 0} fields
                    </Badge>
                  </div>
                  {type.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {type.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingType(type)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeletePolicyType(type.id, type.name)}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              No policy types found. Add your first policy type to get started.
            </AlertDescription>
          </Alert>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editingType} onOpenChange={() => setEditingType(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Policy Type</DialogTitle>
              <DialogDescription>
                Update the policy type details
              </DialogDescription>
            </DialogHeader>
            {editingType && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    value={editingType.name}
                    onChange={(e) => setEditingType(prev => prev ? { ...prev, name: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingType.description || ""}
                    onChange={(e) => setEditingType(prev => prev ? { ...prev, description: e.target.value } : null)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingType(null)}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePolicyType} disabled={loading}>
                    {loading ? "Updating..." : "Update Policy Type"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};