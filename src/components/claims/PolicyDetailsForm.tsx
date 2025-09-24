import { useEffect, useCallback, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClaim, useUpdateClaimSilent, type Claim } from "@/hooks/useClaims";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { useSurveyors } from "@/hooks/useSurveyors";
import { useAddInsurer, useInsurers } from "@/hooks/useInsurers";
import { useAutosave } from "@/hooks/useAutosave";
import { toast } from "sonner";
import { Save, Check } from "lucide-react";

interface PolicyDetailsFormProps {
  claim: Claim;
}

interface FormField {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  required: boolean;
  options?: string[];
}
export const PolicyDetailsForm = ({ claim }: PolicyDetailsFormProps) => {
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm({
    defaultValues: claim.form_data || {}
  });

  const isMountedRef= useRef(true);


  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const { data: surveyors = [], isLoading: surveyorsLoading, error: surveyorsError } = useSurveyors();
  const { data: insurers = [], isLoading: insurersLoading, error: insurersError } = useInsurers();
  const addInsurerMutation = useAddInsurer();

   useEffect(() => {
    console.log("[PolicyDetailsForm] Surveyors:", { 
      loading: surveyorsLoading, 
      count: surveyors.length, 
      error: surveyorsError,
      data: surveyors 
    });
    console.log("[PolicyDetailsForm] Insurers:", { 
      loading: insurersLoading, 
      count: insurers.length, 
      error: insurersError,
      data: insurers 
    });
  }, [surveyors, insurers, surveyorsLoading, insurersLoading, surveyorsError, insurersError]);

  const updateClaimSilent = useUpdateClaimSilent();
  const updateClaimMutation = useUpdateClaim();

  const fields = (claim.policy_types?.fields || []) as FormField[];
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [editingLabels, setEditingLabels] = useState<Set<string>>(new Set());

  const handleAutosave = useCallback(async (data: Record<string, any>) => {
    await updateClaimMutation.mutateAsync({
      id: claim.id,
      updates: { form_data: data }
    });
  }, [claim.id, updateClaimMutation]);

  useAutosave({ control, onSave: handleAutosave, delay: 2000, enabled: false });

  useEffect(() => {
    const allFormData = { ...claim.form_data };
    reset(allFormData);
    setFieldLabels((claim.form_data?.field_labels || {}) as Record<string, string>);
  }, [claim.form_data, reset]);

  const saveLabel = async (fieldName: string) => {
    try {
      const existingData = claim.form_data || {};
      const updatedLabels = {
        ...((typeof existingData.field_labels === "object" && existingData.field_labels !== null) ? existingData.field_labels : {}),
        ...fieldLabels,
      };

      await updateClaimSilent.mutateAsync({
        id: claim.id,
        updates: { form_data: { ...existingData, field_labels: updatedLabels } },
      });

      setEditingLabels((prev) => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });

      toast.success("Label updated", { duration: 1500 });
    } catch (e) {
      console.error("Failed to save label", e);
      toast.error("Failed to save label", { duration: 1500 });
    }
  };

  const saveField = async (fieldName: string) => {
    if(!isMountedRef.current) return;
    try {
      const fieldValue = watch(fieldName);
      const existingData = claim.form_data || {};
      const dataToSave = {
        ...existingData,
        [fieldName]: fieldValue,
        field_labels: fieldLabels,
      };

      await updateClaimSilent.mutateAsync({
        id: claim.id,
        updates: { form_data: dataToSave as any },
      });
      if(isMountedRef.current){
      setPendingSaves((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });

      toast.success("Policy detail saved", { duration: 1800 }); }
    } catch (error) {
      if(isMountedRef.current){
      console.error("Failed to save field:", error);
      toast.error("Failed to save field", { duration: 1800 });
    }
  }
  };

  const renderField = (field: FormField) => {
    const fieldValue = watch(field.name);

    switch (field.type) {
      case "text":
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              id={field.name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || "")) {
                    setPendingSaves((prev) => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => pendingSaves.has(field.name) && saveField(field.name)
              })}
            />
            {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>}
          </div>
        );

      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              id={field.name}
              type="number"
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                valueAsNumber: true,
                onChange: (e) => {
                  if (e.target.value !== String(claim.form_data?.[field.name] ?? "")) {
                    setPendingSaves((prev) => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => pendingSaves.has(field.name) && saveField(field.name)
              })}
            />
            {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>}
          </div>
        );

      case "date":
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            <Input
              id={field.name}
              type="date"
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || "")) {
                    setPendingSaves((prev) => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => pendingSaves.has(field.name) && saveField(field.name)
              })}
            />
            {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>}
          </div>
        );

      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            <Textarea
              id={field.name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              rows={4}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || "")) {
                    setPendingSaves((prev) => new Set([...prev, field.name]));
                  }
                },
                onBlur: () => pendingSaves.has(field.name) && saveField(field.name)
              })}
            />
            {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>}
          </div>
        );

      case "select":
      // Special handling for surveyor field
      if (field.name === "assigned_surveyor") {
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            
            {/* Show error if data fetching failed */}
            {surveyorsError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Failed to load surveyors: {surveyorsError.message}
              </div>
            )}
            
            <SearchableSelect
              options={surveyors.map((s) => s.name)}
              value={fieldValue || ""}
              placeholder={surveyorsLoading ? "Loading surveyors..." : "Select surveyor..."}
              searchPlaceholder="Search surveyors..."
              onValueChange={(val) => {
                setValue(field.name, val);
                if (val !== (claim.form_data?.[field.name] || "")) {
                  setPendingSaves((prev) => new Set([...prev, field.name]));
                  setTimeout(() => saveField(field.name), 500);
                }
              }}
              disabled={surveyorsLoading || !!surveyorsError}
              allowClear
              allowCreate={false}
              className="w-full"
            />
          </div>
        );
      }

      // Special handling for insurer field
      if (field.name === "insurer") {
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            
            {/* Show error if data fetching failed */}
            {insurersError && (
              <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                Failed to load insurers: {insurersError.message}
              </div>
            )}
            
            <SearchableSelect
              options={insurers.map((i) => i.name)}
              value={fieldValue || ""}
              placeholder={insurersLoading ? "Loading insurers..." : "Select or add insurer..."}
              searchPlaceholder="Search or add insurer..."
              onValueChange={(val) => {
                setValue(field.name, val);
                if (val !== (claim.form_data?.[field.name] || "")) {
                  setPendingSaves((prev) => new Set([...prev, field.name]));
                  setTimeout(() => saveField(field.name), 500);
                }
              }}
              allowClear
              allowCreate
              onCreateOption={async (val) => {
                await addInsurerMutation.mutateAsync(val);
              }}
              createOptionText="Add insurer"
              disabled={insurersLoading || addInsurerMutation.isPending || !!insurersError}
              className="w-full"
            />
          </div>
        );
      }

        // Regular select for other fields
        return (
          <div key={field.name} className="space-y-2">
            <Label>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
            <Select
              value={typeof fieldValue === "string" ? fieldValue : ""}
              onValueChange={(value) => {
                setValue(field.name, value);
                if (value !== (claim.form_data?.[field.name] || "")) {
                  setPendingSaves((prev) => new Set([...prev, field.name]));
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
            {errors[field.name] && <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>}
          </div>
        );

      case "checkbox":
        return (
          <div key={field.name} className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id={field.name}
                checked={fieldValue || false}
                onCheckedChange={(checked) => {
                  setValue(field.name, !!checked);
                  if (checked !== (claim.form_data?.[field.name] || false)) {
                    setPendingSaves((prev) => new Set([...prev, field.name]));
                    setTimeout(() => pendingSaves.has(field.name) && saveField(field.name), 500);
                  }
                }}
              />
              <Label htmlFor={field.name}>{field.label}</Label>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Define the standard fields including insurer and surveyor
  const standardFields = [
    { name: "registration_id", label: "Registration ID", type: "text" as const, required: true },
    { name: "insured_name", label: "Insured Name", type: "text" as const, required: true },
    { name: "insurer", label: "Insurer", type: "select" as const, required: false },
    { name: "assigned_surveyor", label: "Assigned Surveyor", type: "select" as const, required: false },
    { name: "policy_number", label: "Policy Number", type: "text" as const, required: false },
    { name: "sum_insured", label: "Sum Insured", type: "number" as const, required: false },
    { name: "date_of_loss", label: "Date of Loss", type: "date" as const, required: false },
    { name: "loss_description", label: "Loss Description", type: "textarea" as const, required: false },
  ];

  const onSubmit = async (data: Record<string, any>) => {
    try {
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: { form_data: { ...data, field_labels: fieldLabels } },
      });
      toast.success("Policy details updated successfully!");
    } catch (error) {
      console.error("Failed to update claim:", error);
      toast.error("Failed to update policy details");
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
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-primary rounded-full"></div>
                <h3 className="text-lg font-semibold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Policy Details
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {standardFields.map(renderField)}
                {/* Add any additional dynamic fields from policy type */}
                {fields.map(renderField)}
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