import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors, UseFormSetValue } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUpdateClaimSilent, type Claim } from "@/hooks/useClaims";
import { useAutosave } from "@/hooks/useAutosave";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, Plus, X, Info, Check, Edit } from "lucide-react";
import { SearchableSelect} from "@/components/ui/searchable-select";
import { useFieldOptions, useAddFieldOption } from "@/hooks/useFieldOptions";
interface AdditionalInformationFormProps {
  claim: Claim;
}


interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
  isCustom?: boolean;
  section?: 'section1' | 'section2' | 'section3' | 'section4';
}

interface ImageGridProps {
  sectionKey: string;
  images: string[];
  setImages: (urls: string[]) => void;
  claimId: string;
  claimFormData: Record<string, unknown>;
  updateClaim: ReturnType<typeof useUpdateClaimSilent>;
  customFields: FormField[];
  hiddenFields: Set<string>;
  fieldLabels: Record<string, string>;
}


const ImageGrid: React.FC<ImageGridProps> = ({ sectionKey, images, setImages, claimId, claimFormData, updateClaim, customFields, hiddenFields, fieldLabels }) => {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
  if (!e.target.files?.length) return;

  const file = e.target.files[0];
  const formData = new FormData();
  formData.append("file", file);

  try {
    const res = await fetch("http://localhost:5000/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error("Upload failed");
    const data = await res.json();

    const updated = [...images];
    updated[index] = data.url;
    setImages(updated);

    // 🔥 Save into Supabase JSON
    await updateClaim.mutateAsync({
      id: claimId,
      updates: {
        form_data: {
          ...claimFormData,
          [`${sectionKey}_images`]: updated,
          custom_fields_metadata: customFields,
          hidden_fields: Array.from(hiddenFields),
          field_labels: fieldLabels,
        } as any,
      },
    });
  } catch (err) {
    console.error("Image upload failed", err);
  }
};

const handleRemove = async (index: number) => {
  const updated = [...images];
  updated[index] = "";
  setImages(updated);

  await updateClaim.mutateAsync({
    id: claimId,
    updates: {
      form_data: {
        ...claimFormData,
        [`${sectionKey}_images`]: updated,
        custom_fields_metadata: customFields,
        hidden_fields: Array.from(hiddenFields),
        field_labels: fieldLabels,
      } as any,
    },
  });
};


  return (
    <div className="mt-4">
      <p className="text-sm font-semibold mb-2">Optional Images</p>
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`${sectionKey}-img-${i}`}
            className="border border-dashed border-gray-300 rounded-md flex items-center justify-center relative aspect-square bg-gray-50"
          >
            {images[i] ? (
              <div className="relative w-full h-full">
                <img
                  src={images[i]}
                  alt={`Uploaded ${i + 1}`}
                  className="object-cover w-full h-full rounded-md"
                />
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="absolute top-1 right-1 bg-white/70 rounded-full p-1 text-red-600"
                >
                  ✕
                </button>
              </div>
            ) : (
              <label className="cursor-pointer text-gray-400 text-sm">
                + Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e, i)}
                />
              </label>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};


export const AdditionalInformationForm = ({ claim }: AdditionalInformationFormProps) => {
  const updateClaimMutation = useUpdateClaimSilent();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm({
    defaultValues: claim.form_data || {}
  });

  const addFieldOptionMutation = useAddFieldOption();
  
  const handleCreateFieldOption = async (fieldName: string, newValue: string) : Promise<void> => {
    await addFieldOptionMutation.mutateAsync({ fieldName, optionValue: newValue });
  };

  // State for collapsible sections
  const [openSections, setOpenSections] = useState({
    section1: true,
    section2: false,
    section3: false,
    section4: false,
  });

  const [sectionImages, setSectionImages] = useState<Record<string, string[]>>({});

  //Section editing states
  const [editingSection, setEditingSection]= useState <string |null>(null);

  const [sectionEditMode, setSectionEditMode] = useState({
    section1: false,
    section2: false,
    section3: false,
    section4: false,
  });

  
  // State for managing custom fields and hidden fields
  const [customFields, setCustomFields] = useState<FormField[]>([]);
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [editingLabels, setEditingLabels] = useState<Set<string>>(new Set());

  // Load custom fields from form_data on mount
  useEffect(() => {
    const savedCustomFields = (claim.form_data?.custom_fields_metadata || []) as FormField[];
    const savedHiddenFields = claim.form_data?.hidden_fields || [];
    const savedFieldLabels = (claim.form_data?.field_labels || {}) as Record<string, string>;

    // Backward-compatible: assign section if missing using prior index-based distribution
    const withSection = savedCustomFields.map((field, index) => ({
      ...field,
      section: field.section || (['section1','section2','section3','section4'][index % 4] as FormField['section']),
    }));

    setCustomFields(withSection);
    setHiddenFields(new Set(Array.isArray(savedHiddenFields) ? savedHiddenFields : []));
    setFieldLabels(savedFieldLabels);
    
    // Also set the form values for custom fields
    withSection.forEach((field) => {
      if (claim.form_data?.[field.name] !== undefined) {
        setValue(field.name, claim.form_data[field.name]);
      }
    });

    const imagesBySection: Record<string, string[]> = {};

  Object.keys(openSections).forEach((sectionKey) => {
    imagesBySection[sectionKey] = claim.form_data?.[`${sectionKey}_images`] || Array(6).fill("");
  });

  setSectionImages(imagesBySection);

  }, [claim.form_data, setValue, openSections]);

  // Autosave functionality - memoized to prevent infinite loops
  const handleAutosave = useCallback(async (data: Record<string, unknown>) => {
    // Exclude custom field values from autosave; only save standard fields
    const standardData = Object.fromEntries(
      Object.entries(data).filter(([k]) => !k.startsWith("custom_"))
    );

  const existingCustomEntries = Object.fromEntries(
    Object.entries(claim.form_data || {}).filter(([k]) => k.startsWith("custom_"))
  );

  await updateClaimMutation.mutateAsync({
    id: claim.id,
    updates: {
      form_data: {
        ...standardData,
        ...existingCustomEntries,
        // Preserve existing custom fields metadata and hidden fields
        custom_fields_metadata: (claim.form_data?.custom_fields_metadata as unknown[]) || [],
        hidden_fields: (claim.form_data?.hidden_fields as string[]) || [],
        field_labels: (claim.form_data?.field_labels as Record<string, string>) || {},
      } as any, // cast to any for Supabase Json
    },
  });
  }, [claim.id, updateClaimMutation, claim.form_data]);

  useAutosave({
    control,
    onSave: handleAutosave,
    delay: 2000,
    enabled: true,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    // Reset form with current claim data
    reset(claim.form_data || {});
  }, [claim.form_data, reset]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
      // Save any pending custom fields first
      const pendingFieldNames = Array.from(pendingSaves);
      if (pendingFieldNames.length > 0) {
        for (const fieldName of pendingFieldNames) {
          await saveCustomField(fieldName);
        }
      }

      // Only persist standard fields; custom fields are saved via tick
      const standardData = Object.fromEntries(
        Object.entries(data).filter(([k]) => !k.startsWith("custom_"))
      );
      const existingCustomEntries = Object.fromEntries(
        Object.entries(claim.form_data || {}).filter(([k]) => k.startsWith("custom_"))
      );

      const imagesData: Record<string, string[]> = {};
    Object.entries(sectionImages).forEach(([sectionKey, images]) => {
      imagesData[`${sectionKey}_images`] = images;
    });

    const dataWithMetadata = {
      ...standardData,
      ...existingCustomEntries,
      custom_fields_metadata: customFields,
      hidden_fields: Array.from(hiddenFields),
      field_labels: fieldLabels,
      ...imagesData, // merge in all sections’ images
    };

    await updateClaimMutation.mutateAsync({
      id: claim.id,
      updates: {
        form_data: dataWithMetadata as any,
      },
    });
      // Success toast only on tick mark saves
    } catch (error) {
      console.error("Failed to update claim:", error);
      toast.error("Failed to update additional information");
    }
  };

  const addCustomField = (sectionKey: string) => {
    const newField: FormField = {
      name: `custom_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      isCustom: true,
      section: sectionKey as FormField['section'],
    };
    setCustomFields(prev => [...prev, newField]);
    setPendingSaves(prev => new Set([...prev, newField.name]));
  };

  const saveCustomField = async (fieldName: string) => {
    try {
      const fieldValue = watch(fieldName);
      const existingData = claim.form_data || {};
      const dataWithMetadata = {
        ...existingData,
        [fieldName]: fieldValue,
        custom_fields_metadata: customFields,
        hidden_fields: Array.from(hiddenFields),
        field_labels: fieldLabels,
      };
      
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: dataWithMetadata as any, // cast for Supabase Json
        },
      });
      
      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
      
      // Show success toast only when explicitly saving via tick mark
      toast.success("Claim updated successfully!", {
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to save custom field:', error);
      toast.error("Failed to save field", {
        duration: 2000,
      });
    }
  };
  
  const saveFieldLabel = async (fieldName: string) => {
    try {
      const existingData = claim.form_data || {};
      const updatedLabels = { ...(typeof existingData.field_labels === "object" && existingData.field_labels !== null ? existingData.field_labels : {}), ...fieldLabels };
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: {
            ...existingData,
            field_labels: updatedLabels,
            custom_fields_metadata: customFields as unknown[], // cast for Supabase Json
            hidden_fields: Array.from(hiddenFields),
          } as any, // cast for Supabase Json
        },
      });
      setEditingLabels(prev => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
      toast.success("Label updated", { duration: 1500 });
    } catch (err) {
      console.error("Failed to save label", err);
      toast.error("Failed to save label", { duration: 1500 });
    }
  };

  const removeField = async (fieldName: string) => {
    const updatedHiddenFields = new Set([...hiddenFields, fieldName]);
    setHiddenFields(updatedHiddenFields);
    
    try {
      const currentFormData = watch();
      const dataWithMetadata = {
        ...currentFormData,
        custom_fields_metadata: customFields,
        hidden_fields: Array.from(updatedHiddenFields),
      };
      
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: dataWithMetadata as any, // cast for Supabase Json
        },
      });
    } catch (error) {
      console.error('Failed to save field removal:', error);
    }
  };

  const removeCustomField = (fieldName: string) => {
    setCustomFields(prev => prev.filter(field => field.name !== fieldName));
    setValue(fieldName, undefined);
    setPendingSaves(prev => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  };

  const updateCustomField = (fieldName: string, updates: Partial<FormField>) => {
    setCustomFields(prev => prev.map(field => 
      field.name === fieldName ? { ...field, ...updates } : field
    ));
    // Only mark as pending if this is a field value change, not label change
    if (updates.label === undefined) {
      setPendingSaves(prev => new Set([...prev, fieldName]));
    }
  };

// Toggle section for sections along with edit options
  const toggleSectionEdit = (sectionKey: string) => {
    // If we're already editing this section, turn off edit mode
    if (editingSection === sectionKey) {
      setEditingSection(null);
      setSectionEditMode(prev => ({
        ...prev,
        [sectionKey]: false
      }));
    } else {
      // Turn off any other section that might be editing and enable this one
      setEditingSection(sectionKey);
      setSectionEditMode({
        section1: false,
        section2: false,
        section3: false,
        section4: false,
        [sectionKey]: true
      });
    }
  };


const renderField = (field: FormField, isEditing = false) => {    const showActions = isEditing; // Red X buttons only show in edit mode
    const fieldValue = watch(field.name);
    const displayedLabel = fieldLabels[field.name] ?? field.label;
    const isEditingLabel = editingLabels.has(field.name);

    if (hiddenFields.has(field.name)) {
      return null;
    }

    switch (field.type) {

      
      case 'text':
        return (
          <div key={field.name} className={`relative space-y-2 transition-all duration-200 rounded-lg ${
            isEditing 
              ? 'border-l-4 border-blue-400 pl-4 pr-2 py-3 bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50/80' 
              : 'py-1'
          }`}>
            <div className="flex items-center justify-between">
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : isEditingLabel ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? displayedLabel}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveFieldLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                    placeholder="Field label"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveFieldLabel(field.name)}
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Save label"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label 
                  htmlFor={field.name} 
                  className={isEditing ? "cursor-pointer" : ""}
                  onClick={isEditing ? () => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; }) : undefined}
                >
                  {displayedLabel} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  {pendingSaves.has(field.name) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => saveCustomField(field.name)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Save field"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Input
              id={field.name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: (e) => {
                  if (pendingSaves.has(field.name)) {
                    saveCustomField(field.name);
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
          <div key={field.name} className={`relative space-y-2 transition-all duration-200 rounded-lg ${
            isEditing 
              ? 'border-l-4 border-blue-400 pl-4 pr-2 py-3 bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50/80' 
              : 'py-1'
          }`}>
            <div className="flex items-center justify-between">
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : isEditingLabel ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? displayedLabel}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveFieldLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                    placeholder="Field label"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveFieldLabel(field.name)}
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Save label"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label 
  htmlFor={field.name} 
  className={isEditing ? "cursor-pointer" : ""}
  onClick={isEditing ? () => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; }) : undefined}
>
                  {displayedLabel} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  {pendingSaves.has(field.name) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => saveCustomField(field.name)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Save field"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Input
              id={field.name}
              type="number"
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false,
                valueAsNumber: true,
                onChange: (e) => {
                  const newValue = e.target.valueAsNumber || e.target.value;
                  if (newValue !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: (e) => {
                  if (pendingSaves.has(field.name)) {
                    saveCustomField(field.name);
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
          <div key={field.name} className={`relative space-y-2 transition-all duration-200 rounded-lg ${
            isEditing 
              ? 'border-l-4 border-blue-400 pl-4 pr-2 py-3 bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50/80' 
              : 'py-1'
          }`}>
            <div className="flex items-center justify-between">
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : isEditingLabel ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? displayedLabel}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveFieldLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                    placeholder="Field label"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveFieldLabel(field.name)}
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Save label"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label 
  htmlFor={field.name} 
  className={isEditing ? "cursor-pointer" : ""}
  onClick={isEditing ? () => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; }) : undefined}
>
                  {displayedLabel} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  {pendingSaves.has(field.name) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => saveCustomField(field.name)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Save field"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Input
              id={field.name}
              type="date"
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: (e) => {
                  if (pendingSaves.has(field.name)) {
                    saveCustomField(field.name);
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
          <div key={field.name} className={`relative space-y-2 transition-all duration-200 rounded-lg ${
            isEditing 
              ? 'border-l-4 border-blue-400 pl-4 pr-2 py-3 bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50/80' 
              : 'py-1'
          }`}>
            <div className="flex items-center justify-between">
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : isEditingLabel ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={fieldLabels[field.name] ?? displayedLabel}
                    onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
                    onBlur={() => saveFieldLabel(field.name)}
                    className="text-sm font-medium w-auto max-w-xs"
                    placeholder="Field label"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveFieldLabel(field.name)}
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Save label"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Label 
  htmlFor={field.name} 
  className={isEditing ? "cursor-pointer" : ""}
  onClick={isEditing ? () => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; }) : undefined}
>
                  {displayedLabel} {field.required && <span className="text-destructive">*</span>}
                </Label>
              )}
              {showActions && (
                <div className="flex items-center gap-1">
                  {pendingSaves.has(field.name) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => saveCustomField(field.name)}
                      className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                      title="Save field"
                    >
                      <Check className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
                    className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
            <Textarea
              id={field.name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              rows={4}
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false,
                onChange: (e) => {
                  if (e.target.value !== (claim.form_data?.[field.name] || '')) {
                    setPendingSaves(prev => new Set([...prev, field.name]));
                  }
                },
                onBlur: (e) => {
                  if (pendingSaves.has(field.name)) {
                    saveCustomField(field.name);
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
  // Check if this field should be searchable
  if (['content_industry_use', 'arrival_details', 'number_packages'].includes(field.name)) {
    return (
      <SearchableSelectField
        key={field.name}
        field={field}
        fieldValue={fieldValue}
        displayedLabel={displayedLabel}
        isEditingLabel={isEditingLabel}
        showActions={showActions}
        claim={claim}
        isEditing={isEditing}
        fieldLabels={fieldLabels}
        setFieldLabels={setFieldLabels}
        editingLabels={editingLabels}
        setEditingLabels={setEditingLabels}
        pendingSaves={pendingSaves}
        setPendingSaves={setPendingSaves}
        setValue={setValue}
        errors={errors}
        saveCustomField={saveCustomField}
        saveFieldLabel={saveFieldLabel}
        removeField={removeField}
        removeCustomField={removeCustomField}
        updateCustomField={updateCustomField}
        handleCreateFieldOption={handleCreateFieldOption}
        addFieldOptionMutation={addFieldOptionMutation}
      />
    );
  }

  // Regular select for non-searchable fields
    return (
    <div key={field.name} className={`relative space-y-2 transition-all duration-200 rounded-lg ${
      isEditing 
        ? 'border-l-4 border-blue-400 pl-4 pr-2 py-3 bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50/80' 
        : 'py-1'
    }`}>
      <div className="flex items-center justify-between">
        {field.isCustom ? (
          <Input
            value={field.label}
            onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
            className="text-sm font-medium w-auto max-w-xs"
            placeholder="Field label"
          />
        ) : isEditingLabel ? (
          <div className="flex items-center gap-2">
            <Input
              value={fieldLabels[field.name] ?? displayedLabel}
              onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
              onBlur={() => saveFieldLabel(field.name)}
              className="text-sm font-medium w-auto max-w-xs"
              placeholder="Field label"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => saveFieldLabel(field.name)}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Save label"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
           <Label 
            htmlFor={field.name} 
            className={isEditing ? "cursor-pointer" : ""}
            onClick={isEditing ? () => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; }) : undefined}
          >
            {displayedLabel} {field.required && <span className="text-destructive">*</span>}
          </Label>
        )}
        {showActions && (
          <div className="flex items-center gap-1">
            {pendingSaves.has(field.name) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => saveCustomField(field.name)}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Save field"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      <Select
        value={typeof fieldValue === "string" ? fieldValue : ""}
        onValueChange={(value) => {
          setValue(field.name, value);
          if (value !== (claim.form_data?.[field.name] || '')) {
            setPendingSaves(prev => new Set([...prev, field.name]));
          }
        }}
        onOpenChange={(open) => {
          if (!open && pendingSaves.has(field.name)) {
            setTimeout(() => saveCustomField(field.name), 100);
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
    </div>
  );
      case 'checkbox':
        return (
          <div key={field.name} className={`relative flex items-center space-x-2 transition-all duration-200 rounded-lg ${
            isEditing 
              ? 'border-l-4 border-blue-400 pl-4 pr-2 py-3 bg-gradient-to-r from-blue-50/50 to-transparent hover:from-blue-50/80' 
              : 'py-1'
          }`}>
            <Checkbox
              id={field.name}
              checked={typeof fieldValue === "boolean" ? fieldValue : false}
              onCheckedChange={(checked) => {
                setValue(field.name, checked);
                if (checked !== (claim.form_data?.[field.name] || false)) {
                  setPendingSaves(prev => new Set([...prev, field.name]));
                  // For checkboxes, auto-save after a short delay since it's a discrete action
                  setTimeout(() => {
                    if (pendingSaves.has(field.name)) {
                      saveCustomField(field.name);
                    }
                  }, 500);
                }
              }}
            />
            {field.isCustom ? (
              <Input
                value={field.label}
                onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                className="text-sm font-normal w-auto max-w-xs"
                placeholder="Field label"
              />
            ) : (
              <Label htmlFor={field.name} className="text-sm font-normal">
                {field.label}
              </Label>
            )}
            {showActions && (
              <div className="flex items-center gap-1">
                {pendingSaves.has(field.name) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => saveCustomField(field.name)}
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                    title="Save field"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
                  className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  // Additional details fields based on policy type
  const getAdditionalDetailsFields = () => {
    const policyTypeName = claim.policy_types?.name?.toLowerCase() || '';
    
    // Common fields for all policy types
    const commonFields = [
      // Section 1 - Basic Information
      { name: 'consigner_name', label: 'Name of Consigner of Goods (Exporter)', type: 'text' as const, required: false },
      { name: 'consignee_name', label: 'Name of Consignee of Goods (Importer)', type: 'text' as const, required: false },
      { name: 'applicant_survey', label: 'Applicant of Survey', type: 'text' as const, required: false },
      { name: 'underwriter_name', label: 'Name of Underwriter / Insurer', type: 'text' as const, required: false },
      { name: 'cha_name', label: 'Name of CHA / Clearing Agent / Forwarder', type: 'text' as const, required: false },
      { name: 'certificate_no', label: 'Certificate No (if Applicable)', type: 'text' as const, required: false },
      { name: 'endorsement_no', label: 'Endorsement No (if Any)', type: 'text' as const, required: false },
      
      // Invoice Details
      { name: 'invoice_no', label: 'Invoice Details Invoice No', type: 'text' as const, required: false },
      { name: 'invoice_date', label: 'Invoice Details Invoice Date', type: 'date' as const, required: false },
      { name: 'invoice_value', label: 'Invoice Details Invoice Value', type: 'number' as const, required: false },
      { name: 'invoice_pkg_count', label: 'Invoice Details No of PKG', type: 'number' as const, required: false },
      { name: 'invoice_gross_wt', label: 'Invoice Details Gross WT', type: 'text' as const, required: false },
      { name: 'invoice_net_wt', label: 'Invoice Details Net WT', type: 'text' as const, required: false },
      
      // Section 2 - Survey Details
      { name: 'goods_description', label: 'Description of Goods', type: 'textarea' as const, required: false },
      { name: 'intimation_date', label: 'Date of Intimation of Survey', type: 'date' as const, required: false },
      { name: 'survey_date_place', label: 'Date and Place of Survey', type: 'textarea' as const, required: false },
      { name: 'external_condition_review', label: 'External Condition Upon Reviewing the Consignment as per Consignee', type: 'textarea' as const, required: false },
      { name: 'packing_nature', label: 'Nature of Packing', type: 'textarea' as const, required: false },
      { name: 'packing_condition', label: 'External Condition of Packing at the Time of Survey', type: 'textarea' as const, required: false },
      { name: 'damage_description', label: 'Description of Loss / Damage', type: 'textarea' as const, required: false },
      { name: 'loss_cause', label: 'Cause of Loss', type: 'textarea' as const, required: false },
      { name: 'joint_survey', label: 'Was Any Joint Survey Held', type: 'textarea' as const, required: false },
      { name: 'consignee_notice', label: 'Has Consignee Given Notice of Loss / Damage to or Made Claim Against Carriers?', type: 'textarea' as const, required: false },
      
      // Section 3 - Transportation Details
      { name: 'transporter_name', label: 'Name of the Transporter', type: 'text' as const, required: false },
      { name: 'vehicle_number', label: 'Vehicle Number', type: 'text' as const, required: false },
      { name: 'lr_date_issuance', label: 'LR & Date of Issuance', type: 'text' as const, required: false },
      { name: 'consignment_note', label: 'Consignment Note No / Docket No & Date', type: 'text' as const, required: false },
      { name: 'delivery_challan', label: 'Delivery Challan No', type: 'text' as const, required: false },
      { name: 'dispatch_condition', label: 'External Condition While Dispatching the Consignment from Port / CFS / Warehouse', type: 'textarea' as const, required: false },
      
      // Report Text Section
      { name: 'survey_address', label: 'Address of Survey', type: 'textarea' as const, required: false },
      { name: 'number_packages', label: 'Number of Packages', type: 'select' as const, required: false, options: ['BULK/RM', '1-10', '11-50', '51-100', '100+'] },
      { name: 'packing_contents', label: 'Whats Inside Packing Consignment', type: 'textarea' as const, required: false },
      { name: 'content_industry_use', label: 'Use of Content Industry it is Utilised in', type: 'select' as const, required: false, options: ['Manufacturing', 'Construction', 'Electronics', 'Textiles', 'Automotive', 'Food Processing', 'Other'] },
      { name: 'arrival_details', label: 'How Did it Arrive to the Premises Spot of Survey Mention Container No and or Vehicle No if Applicable', type: 'select' as const, required: false, options: ['By Road Transport', 'By Sea Container', 'By Air Cargo', 'By Rail', 'Other'] },
      { name: 'external_condition_tag', label: 'External Condition Tag', type: 'textarea' as const, required: false },
    ];

    // Policy-type specific fields can be added here
    if (policyTypeName.includes('marine') || policyTypeName.includes('cargo')) {
      // Add marine/cargo specific fields
      return [
        ...commonFields,
        { name: 'vessel_name', label: 'Vessel Name', type: 'text' as const, required: false },
        { name: 'port_loading', label: 'Port of Loading', type: 'text' as const, required: false },
        { name: 'port_discharge', label: 'Port of Discharge', type: 'text' as const, required: false },
        { name: 'bl_number', label: 'Bill of Lading Number', type: 'text' as const, required: false },
      ];
    }

    if (policyTypeName.includes('fire') || policyTypeName.includes('property')) {
      // Add fire/property specific fields
      return [
        ...commonFields,
        { name: 'building_type', label: 'Building Type', type: 'select' as const, required: false, options: ['Residential', 'Commercial', 'Industrial', 'Warehouse'] },
        { name: 'fire_brigade_called', label: 'Was Fire Brigade Called?', type: 'select' as const, required: false, options: ['Yes', 'No'] },
        { name: 'sprinkler_system', label: 'Sprinkler System Present?', type: 'select' as const, required: false, options: ['Yes', 'No'] },
      ];
    }

    return commonFields;
  };

  const additionalFields = getAdditionalDetailsFields();

    const renderSection = (
    sectionKey: keyof typeof openSections, 
    title: string, 
    fields: FormField[], 
    customFieldsForSection: FormField[],
    colorClass: string
  ) => {
    const allFields = [...fields, ...customFieldsForSection];
    const isOpen = openSections[sectionKey];
    const isEditing = sectionEditMode[sectionKey];

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <Card className={`bg-white/95 backdrop-blur-sm border shadow-sm transition-all duration-200 ${
              isEditing ? 'border-blue-400 shadow-blue-100' : 'border-slate-200'
            }`}>
                      <div className="flex items-stretch">
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  className={`flex-1 justify-between p-4 h-auto text-left ${colorClass} text-white hover:opacity-90 transition-all duration-200 rounded-tl-lg rounded-tr-none`}
                >
                  <h4 className="text-lg font-semibold flex items-center gap-2">
                    <Info className="w-5 h-5" />
                    {title}
                  </h4>
                  {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </Button>
              </CollapsibleTrigger>
{/*               
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSectionEdit(sectionKey);
                }}
                className={`h-auto px-3 py-2 rounded-tr-lg rounded-tl-none transition-all duration-200 ${
                  isEditing 
                    ? 'bg-white text-blue-600 hover:bg-blue-50 border-l border-blue-200' 
                    : `${colorClass} text-white hover:bg-white/20 border-l border-white/20`
                }`}
                title={isEditing ? 'Exit edit mode' : 'Edit section'}
              >
                <Edit className="w-4 h-4" />
              </Button> */}
            </div>
          
          <CollapsibleContent className="animate-accordion-down">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50">
    {allFields.map((field) => renderField(field, isEditing))}
  </div>
  <div className="px-6 pb-6 bg-slate-50/50">
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => addCustomField(sectionKey)}
      className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
    >
      <Plus className="h-3 w-3" />
      Add Field
    </Button>
  </div>

  {/* Image grid lives here */}
  <div className="px-6 pb-6 bg-slate-50/50">
    <ImageGrid
  sectionKey={sectionKey}
  images={sectionImages[sectionKey] || Array(6).fill("")}
  setImages={(urls) =>
    setSectionImages((prev) => ({
      ...prev,
      [sectionKey]: urls,
    }))
  }
  claimId={claim.id}
  claimFormData={claim.form_data || {}}
  updateClaim={updateClaimMutation}
  customFields={customFields}
  hiddenFields={hiddenFields}
  fieldLabels={fieldLabels}
/>

  </div>
</CollapsibleContent>

        </Card>
      </Collapsible>
    );
  };

  const section1Fields = additionalFields.slice(0, 13);
  const section2Fields = additionalFields.slice(13, 23);
  const section3Fields = additionalFields.slice(23, 29);
  const section4Fields = additionalFields.slice(29);

  const section1Custom = customFields.filter((f) => f.section === 'section1');
  const section2Custom = customFields.filter((f) => f.section === 'section2');
  const section3Custom = customFields.filter((f) => f.section === 'section3');
  const section4Custom = customFields.filter((f) => f.section === 'section4');

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader className="bg-slate-700 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Section 1 - Basic Information */}
            {renderSection('section1', 'Section 1 - Basic Information', section1Fields, section1Custom, 'bg-gradient-primary')}

            {/* Section 2 - Survey & Loss Details */}
            {renderSection('section2', 'Section 2 - Survey & Loss Details', section2Fields, section2Custom, 'bg-warning')}

            {/* Section 3 - Transportation Details */}
            {renderSection('section3', 'Section 3 - Transportation Details', section3Fields, section3Custom, 'bg-success')}

            {/* Section 4 - Report Section */}
            {renderSection('section4', 'Section 4 - Report Section', section4Fields, section4Custom, 'bg-info')}
            
            <div className="pt-6 border-t border-border/50">
              <Button 
                type="submit" 
                disabled={updateClaimMutation.isPending}
                className="w-full bg-slate-700 hover:bg-slate-800 text-white shadow-sm transition-all duration-200"
              >
                {updateClaimMutation.isPending ? "Saving..." : "Save Additional Information"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

// Add this at the bottom of the file, after the main component
interface SearchableSelectFieldProps {
  field: FormField;
  fieldValue: unknown; // we don't assume a string/boolean until used
  displayedLabel: string;
  isEditingLabel: boolean;
  showActions: boolean;
  isEditing:boolean;
  claim: Claim;
  fieldLabels: Record<string, string>;
  setFieldLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editingLabels: Set<string>;
  setEditingLabels: React.Dispatch<React.SetStateAction<Set<string>>>;
  pendingSaves: Set<string>;
  setPendingSaves: React.Dispatch<React.SetStateAction<Set<string>>>;
  // Use the library type for setValue so it matches useForm's return
  setValue: UseFormSetValue<Record<string, unknown>>;
  // FieldErrors from react-hook-form is the canonical type for errors
  errors: FieldErrors<Record<string, unknown>>;
  saveCustomField: (fieldName: string) => Promise<void> | void;
  saveFieldLabel: (fieldName: string) => Promise<void> | void;
  removeField: (fieldName: string) => void;
  removeCustomField: (fieldName: string) => void;
  updateCustomField: (fieldName: string, updates: Partial<FormField>) => void;
  // This will be an async function (it calls the mutation)
  handleCreateFieldOption: (fieldName: string, newValue: string) => Promise<void>;
  // Minimal type for the mutation object you use here
  addFieldOptionMutation: {
    isPending: boolean;
    mutateAsync?: (payload: { fieldName: string; optionValue: string }) => Promise<void>;
  };
}

const SearchableSelectField: React.FC<SearchableSelectFieldProps> = ({ 
  field, 
  fieldValue, 
  displayedLabel, 
  isEditingLabel, 
  showActions,
  claim,
  fieldLabels,
  setFieldLabels,
  editingLabels,
  setEditingLabels,
  pendingSaves,
  setPendingSaves,
  setValue,
  errors,
  saveCustomField,
  saveFieldLabel,
  removeField,
  removeCustomField,
  updateCustomField,
  handleCreateFieldOption,
  addFieldOptionMutation
}) => {
  // Hook called at component level - this is correct
  const { data: dynamicOptions = [], isLoading } = useFieldOptions(field.name);
  
  // Combine options
  const allOptions = [
    ...(field.options || []),
    ...dynamicOptions.filter(option => !(field.options || []).includes(option))
  ];

  return (
    <div className="relative space-y-2">
      {/* Label section */}
      <div className="flex items-center justify-between">
        {field.isCustom ? (
          <Input
            value={field.label}
            onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
            className="text-sm font-medium w-auto max-w-xs"
            placeholder="Field label"
          />
        ) : isEditingLabel ? (
          <div className="flex items-center gap-2">
            <Input
              value={fieldLabels[field.name] ?? displayedLabel}
              onChange={(e) => setFieldLabels(prev => ({ ...prev, [field.name]: e.target.value }))}
              onBlur={() => saveFieldLabel(field.name)}
              className="text-sm font-medium w-auto max-w-xs"
              placeholder="Field label"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => saveFieldLabel(field.name)}
              className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
              title="Save label"
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <Label 
            htmlFor={field.name} 
            className={isEditing ? "cursor-pointer" : ""}
            onClick={isEditing ? () => setEditingLabels(prev => { const next = new Set(prev); next.add(field.name); return next; }) : undefined}
          >
            {displayedLabel} {field.required && <span className="text-destructive">*</span>}
          </Label>
        )}
        
        {showActions && (
          <div className="flex items-center gap-1">
            {pendingSaves.has(field.name) && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => saveCustomField(field.name)}
                className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Save field"
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => field.isCustom ? removeCustomField(field.name) : removeField(field.name)}
              className="h-6 w-6 p-0 text-destructive hover:text-destructive"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center space-x-2 text-xs text-muted-foreground">
          <div className="animate-spin h-3 w-3 border-2 border-primary border-t-transparent rounded-full"></div>
          <span>Loading options...</span>
        </div>
      )}

      {!isLoading && (
        <SearchableSelect
          options={allOptions}
          value={typeof fieldValue === "string" ? fieldValue : ""}
          placeholder={`Select ${field.label.toLowerCase()}...`}
          searchPlaceholder={`Search or add ${field.label.toLowerCase()}...`}
          onValueChange={(value) => {
            setValue(field.name, value);
            if (value !== (claim.form_data?.[field.name] || '')) {
              setPendingSaves(prev => new Set([...prev, field.name]));
            }
          }}
          allowClear={true}
          allowCreate={true}
          onCreateOption={(newValue) => handleCreateFieldOption(field.name, newValue)}
          createOptionText={`Add ${field.label.toLowerCase()}`}
          className="w-full"
          disabled={addFieldOptionMutation.isPending}
          onOpenChange={(open) => {
            if (!open && pendingSaves.has(field.name)) {
              setTimeout(() => saveCustomField(field.name), 100);
            }
          }}
        />
      )}

      {addFieldOptionMutation.isPending && (
        <div className="text-xs text-muted-foreground flex items-center space-x-1">
          <div className="animate-spin h-3 w-3 border-2 border-green-600 border-t-transparent rounded-full"></div>
          <span>Adding new option...</span>
        </div>
      )}

      {errors[field.name] && (
        <p className="text-sm text-destructive">
          {errors[field.name]?.message as string}
        </p>
      )}
    </div>
  );
};