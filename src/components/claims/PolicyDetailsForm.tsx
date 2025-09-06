import { useEffect, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClaim, useUpdateClaimSilent, type Claim } from "@/hooks/useClaims";
import { useAutosave } from "@/hooks/useAutosave";
import { toast } from "sonner";
import { Save, Check } from "lucide-react";

interface PolicyDetailsFormProps {
  claim: Claim;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export const PolicyDetailsForm = ({ claim }: PolicyDetailsFormProps) => {
  const updateClaimMutation = useUpdateClaim();
  const updateClaimSilent = useUpdateClaimSilent();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm({
    defaultValues: claim.form_data || {}
  });

  const fields = (claim.policy_types?.fields || []) as FormField[];
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [editingLabels, setEditingLabels] = useState<Set<string>>(new Set());

  // Autosave functionality - memoized to prevent infinite loops
  const handleAutosave = useCallback(async (data: Record<string, any>) => {
    await updateClaimMutation.mutateAsync({
      id: claim.id,
      updates: {
        form_data: data,
      },
    });
  }, [claim.id, updateClaimMutation]);

  useAutosave({
    control,
    onSave: handleAutosave,
    delay: 2000,
    enabled: false,
  });

  useEffect(() => {
    // Reset form with current claim data, merging both standard and dynamic fields
    const allFormData = { ...claim.form_data };
    reset(allFormData);
    setFieldLabels((claim.form_data?.field_labels || {}) as Record<string, string>);
  }, [claim.form_data, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    try {
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: { ...data, field_labels: fieldLabels },
        },
      });
      toast.success("Policy details updated successfully!");
    } catch (error) {
      console.error("Failed to update claim:", error);
      toast.error("Failed to update policy details");
    }
  };

  const saveField = async (fieldName: string) => {
    try {
      const fieldValue = watch(fieldName);
      const existingData = claim.form_data || {};
      const dataToSave = {
        ...existingData,
        [fieldName]: fieldValue,
        field_labels: fieldLabels,
      } as Record<string, any>;

      await updateClaimSilent.mutateAsync({
        id: claim.id,
        updates: {
          form_data: dataToSave,
        },
      });

      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });

      // Show success toast when explicitly saved via tick or blur
      toast.success("Policy detail saved", { duration: 1800 });
    } catch (error) {
      console.error("Failed to save field:", error);
      toast.error("Failed to save field", { duration: 1800 });
    }
  };

  const renderField = (field: FormField) => {
    const fieldValue = watch(field.name);

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {editingLabels.has(field.name) ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? field.label}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => saveLabel(field.name)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Save label">
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label htmlFor={field.name} className="cursor-pointer" onClick={() => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; })}>
                  {(fieldLabels[field.name] ?? field.label)} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {pendingSaves.has(field.name) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saveField(field.name)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save field"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Input
              id={field.name}
              placeholder={`Enter ${(fieldLabels[field.name] ?? field.label).toLowerCase()}`}
              {...register(field.name, { 
                required: field.required ? `${(fieldLabels[field.name] ?? field.label)} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => {
                  if (pendingSaves.has(field.name)) {
                    saveField(field.name);
                  }
                }
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">
                {errors[field.name]?.message as string}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {editingLabels.has(field.name) ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? field.label}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => saveLabel(field.name)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Save label">
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label htmlFor={field.name} className="cursor-pointer" onClick={() => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; })}>
                  {(fieldLabels[field.name] ?? field.label)} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {pendingSaves.has(field.name) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saveField(field.name)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save field"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Input
              id={field.name}
              type="number"
              placeholder={`Enter ${(fieldLabels[field.name] ?? field.label).toLowerCase()}`}
              {...register(field.name, { 
                required: field.required ? `${(fieldLabels[field.name] ?? field.label)} is required` : false,
                valueAsNumber: true,
                onChange: (e) => {
                  const newValue = (e.target as HTMLInputElement).value;
                  if (newValue !== String(claim.form_data?.[field.name] ?? '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => {
                  if (pendingSaves.has(field.name)) {
                    saveField(field.name);
                  }
                }
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">
                {errors[field.name]?.message as string}
              </p>
            )}
          </div>
        );

      case 'date':
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {editingLabels.has(field.name) ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? field.label}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => saveLabel(field.name)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Save label">
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label htmlFor={field.name} className="cursor-pointer" onClick={() => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; })}>
                  {(fieldLabels[field.name] ?? field.label)} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {pendingSaves.has(field.name) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saveField(field.name)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save field"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Input
              id={field.name}
              type="date"
              {...register(field.name, { 
                required: field.required ? `${(fieldLabels[field.name] ?? field.label)} is required` : false,
                onChange: (e) => {
                  if ((e.target as HTMLInputElement).value !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => {
                  if (pendingSaves.has(field.name)) {
                    saveField(field.name);
                  }
                }
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">
                {errors[field.name]?.message as string}
              </p>
            )}
          </div>
        );

      case 'textarea':
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {editingLabels.has(field.name) ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? field.label}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => saveLabel(field.name)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Save label">
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label htmlFor={field.name} className="cursor-pointer" onClick={() => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; })}>
                  {(fieldLabels[field.name] ?? field.label)} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {pendingSaves.has(field.name) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saveField(field.name)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save field"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Textarea
              id={field.name}
              placeholder={`Enter ${(fieldLabels[field.name] ?? field.label).toLowerCase()}`}
              rows={4}
              {...register(field.name, { 
                required: field.required ? `${(fieldLabels[field.name] ?? field.label)} is required` : false,
                onChange: (e) => {
                  if ((e.target as HTMLTextAreaElement).value !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => {
                  if (pendingSaves.has(field.name)) {
                    saveField(field.name);
                  }
                }
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">
                {errors[field.name]?.message as string}
              </p>
            )}
          </div>
        );

      case 'select':
        const hasOtherOption = field.options?.includes('Other');
        const isOtherSelected = fieldValue === 'Other';
        const otherFieldName = `${field.name}_other`;
        const otherFieldValue = watch(otherFieldName);
        
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {editingLabels.has(field.name) ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? field.label}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => saveLabel(field.name)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Save label">
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label htmlFor={field.name} className="cursor-pointer" onClick={() => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; })}>
                  {(fieldLabels[field.name] ?? field.label)} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {pendingSaves.has(field.name) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saveField(field.name)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save field"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
            <Select
              value={fieldValue || ""}
              onValueChange={(value) => {
                setValue(field.name, value);
                // Clear the other field when switching away from "Other"
                if (value !== 'Other') {
                  setValue(otherFieldName, '');
                }
                if (value !== (claim.form_data?.[field.name] || '')) {
                  setPendingSaves(prev => new Set([...prev, field.name]));
                }
              }}
              onOpenChange={(open) => {
                if (!open && pendingSaves.has(field.name)) {
                  setTimeout(() => saveField(field.name), 100);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
              </SelectTrigger>
              <SelectContent>
                {field.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors[field.name] && (
              <p className="text-sm text-destructive">
                {errors[field.name]?.message as string}
              </p>
            )}
            
            {/* Conditional "Other" text input */}
            {hasOtherOption && isOtherSelected && (
              <div className="space-y-2">
                <Label htmlFor={otherFieldName}>
                  Please specify {field.label.toLowerCase()}:
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={otherFieldName}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  {...register(otherFieldName, { 
                    required: isOtherSelected ? `Please specify ${field.label.toLowerCase()}` : false,
                    onChange: (e) => {
                      if ((e.target as HTMLInputElement).value !== (claim.form_data?.[otherFieldName] || '')) {
                        setPendingSaves(prev => new Set([...prev, otherFieldName]));
                      }
                    },
                    onBlur: () => {
                      if (pendingSaves.has(otherFieldName)) {
                        saveField(otherFieldName);
                      }
                    }
                  })}
                />
                {errors[otherFieldName] && (
                  <p className="text-sm text-destructive">
                    {errors[otherFieldName]?.message as string}
                  </p>
                )}
              </div>
            )}
          </div>
        );

      case 'checkbox':
        return (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={field.name}
                  checked={fieldValue || false}
                  onCheckedChange={(checked) => {
                    setValue(field.name, !!checked);
                    if (checked !== (claim.form_data?.[field.name] || false)) {
                      setPendingSaves(prev => new Set([...prev, field.name]));
                      setTimeout(() => {
                        if (pendingSaves.has(field.name)) {
                          saveField(field.name);
                        }
                      }, 500);
                    }
                  }}
                />
                {editingLabels.has(field.name) ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={fieldLabels[field.name] ?? field.label}
                      onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                      onBlur={() => saveLabel(field.name)}
                      className="text-sm font-normal w-auto max-w-xs"
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => saveLabel(field.name)} className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50" title="Save label">
                      <Check className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Label htmlFor={field.name} className="text-sm font-normal cursor-pointer" onClick={() => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; })}>
                    {fieldLabels[field.name] ?? field.label}
                  </Label>
                )}
              </div>
              {pendingSaves.has(field.name) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => saveField(field.name)}
                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                  title="Save field"
                >
                  <Check className="h-3 w-3" />
                </Button>
              )}
            </div>
        );

      default:
        return null;
    }
  };

  // Standard policy information fields
  const standardFields = [
    { name: 'registration_id', label: 'Registration ID', type: 'text' as const, required: true },
    { name: 'insured_name', label: 'Insured Name', type: 'text' as const, required: true },
    { name: 'insurer', label: 'Insurer', type: 'select' as const, required: true, options: ['AIG', 'Allianz', 'AXA', 'Zurich', 'Liberty', 'Other'] },
    { name: 'assigned_surveyor', label: 'Assigned Surveyor', type: 'select' as const, required: false, options: ['John Smith', 'Sarah Johnson', 'Mike Brown', 'Emma Davis', 'Other'] },
    { name: 'policy_number', label: 'Policy Number', type: 'text' as const, required: false },
    { name: 'sum_insured', label: 'Sum Insured', type: 'number' as const, required: false },
    { name: 'date_of_loss', label: 'Date of Loss', type: 'date' as const, required: false },
    { name: 'loss_description', label: 'Loss Description', type: 'textarea' as const, required: false },
  ];

  const saveLabel = async (fieldName: string) => {
    try {
      const existingData = claim.form_data || {};
      const updatedLabels = { ...(existingData.field_labels || {}), ...fieldLabels };
      await updateClaimSilent.mutateAsync({
        id: claim.id,
        updates: { form_data: { ...existingData, field_labels: updatedLabels } },
      });
      setEditingLabels(prev => { const next = new Set(prev); next.delete(fieldName); return next; });
      toast.success("Label updated", { duration: 1500 });
    } catch (e) {
      console.error("Failed to save label", e);
      toast.error("Failed to save label", { duration: 1500 });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader className="bg-slate-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Save className="w-5 h-5" />
            Policy Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Standard Policy Information Fields */}
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Policy Details
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {standardFields.map(renderField)}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <Button 
                type="submit" 
                disabled={updateClaimMutation.isPending}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all duration-200"
              >
                {updateClaimMutation.isPending ? "Saving..." : "Save Policy Details"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};