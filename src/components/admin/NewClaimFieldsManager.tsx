import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, Plus, FileEdit, GripVertical } from "lucide-react";
import { usePolicyTypes } from "@/hooks/useClaims";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ClaimField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select';
  required: boolean;
  visible: boolean;
  order: number;
  options?: string[]; // For select fields
  placeholder?: string;
}

interface PolicyType {
  id: string;
  name: string;
  description: string;
  fields: any;
  parent_id?: string;
}

export const NewClaimFieldsManager = () => {
  const { data: policyTypes, isLoading, refetch } = usePolicyTypes();
  const [selectedPolicyType, setSelectedPolicyType] = useState<PolicyType | null>(null);
  const [claimFields, setClaimFields] = useState<ClaimField[]>([]);
  const [isAddFieldDialogOpen, setIsAddFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<ClaimField | null>(null);
  const [newField, setNewField] = useState<Partial<ClaimField>>({
    name: "",
    label: "",
    type: "text",
    required: false,
    visible: true,
    placeholder: "",
  });
  const [loading, setLoading] = useState(false);

  // Default fields that every policy type should have
  const defaultFields: ClaimField[] = [
    {
      id: "title",
      name: "title",
      label: "Claim Title",
      type: "text",
      required: true,
      visible: true,
      order: 1,
      placeholder: "Brief description of your claim"
    },
    {
      id: "claim_amount",
      name: "claim_amount",
      label: "Estimated Claim Amount (Rs.)",
      type: "number",
      required: false,
      visible: true,
      order: 2,
      placeholder: "0.00"
    },
    {
      id: "intimation_date",
      name: "intimation_date",
      label: "Intimation Date",
      type: "date",
      required: false,
      visible: true,
      order: 3,
      placeholder: ""
    },
    {
      id: "registration_id",
      name: "registration_id",
      label: "Registration ID",
      type: "text",
      required: true,
      visible: true,
      order: 4,
      placeholder: "Enter registration ID"
    },
    {
      id: "insured_name",
      name: "insured_name",
      label: "Insured Name",
      type: "text",
      required: true,
      visible: true,
      order: 5,
      placeholder: "Enter insured name"
    },
    {
      id: "insurer",
      name: "insurer",
      label: "Insurer",
      type: "select",
      required: false,
      visible: true,
      order: 6,
      placeholder: "Select or add insurer..."
    },
    {
      id: "assigned_surveyor",
      name: "assigned_surveyor",
      label: "Assigned Surveyor",
      type: "select",
      required: false,
      visible: true,
      order: 7,
      placeholder: "Select surveyor..."
    }
  ];

  // Load fields when policy type is selected
  useEffect(() => {
    if (selectedPolicyType) {
      const existingFields = selectedPolicyType.fields?.new_claim_fields || defaultFields;
      setClaimFields(existingFields);
    }
  }, [selectedPolicyType]);

  const handleSaveFields = async () => {
    if (!selectedPolicyType) return;

    setLoading(true);
    try {
      const updatedFields = {
        ...selectedPolicyType.fields,
        new_claim_fields: claimFields
      };

      const { error } = await supabase
        .from("policy_types")
        .update({ fields: updatedFields })
        .eq("id", selectedPolicyType.id);

      if (error) throw error;

      toast.success("Claim fields updated successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to update claim fields");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    if (!newField.name || !newField.label) {
      toast.error("Field name and label are required");
      return;
    }

    const field: ClaimField = {
      id: newField.name,
      name: newField.name,
      label: newField.label,
      type: newField.type || "text",
      required: newField.required || false,
      visible: newField.visible !== false,
      order: claimFields.length + 1,
      placeholder: newField.placeholder,
      options: newField.options
    };

    setClaimFields([...claimFields, field]);
    setNewField({
      name: "",
      label: "",
      type: "text",
      required: false,
      visible: true,
      placeholder: "",
    });
    setIsAddFieldDialogOpen(false);
    toast.success("Field added! Don't forget to save changes.");
  };

  const handleUpdateField = () => {
    if (!editingField) return;

    setClaimFields(prev =>
      prev.map(field =>
        field.id === editingField.id ? editingField : field
      )
    );
    setEditingField(null);
    toast.success("Field updated! Don't forget to save changes.");
  };

  const handleDeleteField = (fieldId: string) => {
    if (!confirm("Are you sure you want to remove this field?")) return;

    setClaimFields(prev => prev.filter(field => field.id !== fieldId));
    toast.success("Field removed! Don't forget to save changes.");
  };

  const handleToggleVisibility = (fieldId: string) => {
    setClaimFields(prev =>
      prev.map(field =>
        field.id === fieldId ? { ...field, visible: !field.visible } : field
      )
    );
  };

  const handleToggleRequired = (fieldId: string) => {
    setClaimFields(prev =>
      prev.map(field =>
        field.id === fieldId ? { ...field, required: !field.required } : field
      )
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="w-5 h-5" />
            New Claim Fields Manager
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
              <FileEdit className="w-5 h-5" />
              New Claim Dialog Fields
            </CardTitle>
            <CardDescription>
              Customize which fields appear when creating a new claim for each policy type
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Policy Type Selector */}
        <div className="space-y-2">
          <Label>Select Policy Type</Label>
          <Select
            value={selectedPolicyType?.id || ""}
            onValueChange={(value) => {
                const policyType = policyTypes?.find(pt => pt.id === value);
                setSelectedPolicyType(policyType || null);
            }}
            >
            <SelectTrigger>
                <SelectValue placeholder="Choose a policy type to configure..." />
            </SelectTrigger>
            <SelectContent>
                {policyTypes
                ?.filter(pt => !pt.parent_id)
                .map(mainType => (
                    <div key={mainType.id}>
                    {/* Parent policy type */}
                    <SelectItem value={mainType.id}>
                        {mainType.name} (Parent)
                    </SelectItem>
                    {/* Subtypes */}
                    {policyTypes
                        ?.filter(pt => pt.parent_id === mainType.id)
                        .map(subType => (
                        <SelectItem key={subType.id} value={subType.id} className="pl-6">
                            → {subType.name}
                        </SelectItem>
                        ))}
                    </div>
                ))}
            </SelectContent>
            </Select>
        </div>

        {/* Fields Configuration */}
        {selectedPolicyType && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">
                Fields for "{selectedPolicyType.name}"
              </h3>
              <Dialog open={isAddFieldDialogOpen} onOpenChange={setIsAddFieldDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Field
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Field</DialogTitle>
                    <DialogDescription>
                      Create a custom field for the new claim dialog
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="field-name">Field Name (Internal) *</Label>
                      <Input
                        id="field-name"
                        value={newField.name}
                        onChange={(e) => setNewField(prev => ({ ...prev, name: e.target.value.toLowerCase().replace(/\s+/g, '_') }))}
                        placeholder="e.g., policy_number"
                      />
                      <p className="text-xs text-muted-foreground">Used as the database field name</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-label">Field Label *</Label>
                      <Input
                        id="field-label"
                        value={newField.label}
                        onChange={(e) => setNewField(prev => ({ ...prev, label: e.target.value }))}
                        placeholder="e.g., Policy Number"
                      />
                      <p className="text-xs text-muted-foreground">Shown to users in the form</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-type">Field Type</Label>
                      <Select
                        value={newField.type}
                        onValueChange={(value: any) => setNewField(prev => ({ ...prev, type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="textarea">Textarea</SelectItem>
                          <SelectItem value="select">Select Dropdown</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="field-placeholder">Placeholder Text</Label>
                      <Input
                        id="field-placeholder"
                        value={newField.placeholder}
                        onChange={(e) => setNewField(prev => ({ ...prev, placeholder: e.target.value }))}
                        placeholder="e.g., Enter policy number"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="field-required"
                        checked={newField.required}
                        onCheckedChange={(checked) => setNewField(prev => ({ ...prev, required: checked }))}
                      />
                      <Label htmlFor="field-required">Required field</Label>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setIsAddFieldDialogOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleAddField}>
                        Add Field
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Fields List */}
            <div className="space-y-2">
              {claimFields
                .sort((a, b) => a.order - b.order)
                .map((field) => (
                  <Card key={field.id} className="border">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{field.label}</h4>
                              <code className="text-xs bg-muted px-2 py-1 rounded">
                                {field.name}
                              </code>
                              {field.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                              {!field.visible && (
                                <Badge variant="secondary" className="text-xs">Hidden</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              Type: {field.type} • Order: {field.order}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-2 mr-2">
                            <Label htmlFor={`visible-${field.id}`} className="text-xs">Visible</Label>
                            <Switch
                              id={`visible-${field.id}`}
                              checked={field.visible}
                              onCheckedChange={() => handleToggleVisibility(field.id)}
                            />
                          </div>
                          <div className="flex items-center gap-2 mr-2">
                            <Label htmlFor={`required-${field.id}`} className="text-xs">Required</Label>
                            <Switch
                              id={`required-${field.id}`}
                              checked={field.required}
                              onCheckedChange={() => handleToggleRequired(field.id)}
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingField(field)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>

            {claimFields.length === 0 && (
              <Alert>
                <AlertDescription>
                  No fields configured yet. Add your first field to get started.
                </AlertDescription>
              </Alert>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedPolicyType(null)}
              >
                Cancel
              </Button>
              <Button onClick={handleSaveFields} disabled={loading}>
                {loading ? "Saving..." : "Save Field Configuration"}
              </Button>
            </div>
          </div>
        )}

        {!selectedPolicyType && (
          <Alert>
            <AlertDescription>
              Select a policy type above to configure its new claim dialog fields.
            </AlertDescription>
          </Alert>
        )}

        {/* Edit Field Dialog */}
        <Dialog open={!!editingField} onOpenChange={() => setEditingField(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Field</DialogTitle>
              <DialogDescription>
                Update the field configuration
              </DialogDescription>
            </DialogHeader>
            {editingField && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-label">Field Label</Label>
                  <Input
                    id="edit-label"
                    value={editingField.label}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, label: e.target.value } : null)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-placeholder">Placeholder Text</Label>
                  <Input
                    id="edit-placeholder"
                    value={editingField.placeholder || ""}
                    onChange={(e) => setEditingField(prev => prev ? { ...prev, placeholder: e.target.value } : null)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingField(null)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateField}>
                    Update Field
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
