import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
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
import { ChevronDown, ChevronUp, Plus, X, Info, Check } from "lucide-react";

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
}

export const AdditionalInformationForm = ({ claim }: AdditionalInformationFormProps) => {
  const updateClaimMutation = useUpdateClaimSilent();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset, control } = useForm({
    defaultValues: claim.form_data || {}
  });

  // State for collapsible sections
  const [openSections, setOpenSections] = useState({
    section1: true,
    section2: false,
    section3: false,
    section4: false,
  });

  // State for managing custom fields and hidden fields
  const [customFields, setCustomFields] = useState<FormField[]>([]);
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

  // Load custom fields from form_data on mount
  useEffect(() => {
    const savedCustomFields = claim.form_data?.custom_fields_metadata || [];
    const savedHiddenFields = claim.form_data?.hidden_fields || [];
    setCustomFields(savedCustomFields);
    setHiddenFields(new Set(savedHiddenFields));
    
    // Also set the form values for custom fields
    savedCustomFields.forEach((field: FormField) => {
      if (claim.form_data?.[field.name] !== undefined) {
        setValue(field.name, claim.form_data[field.name]);
      }
    });
  }, [claim.form_data, setValue]);

  // Autosave functionality - memoized to prevent infinite loops
  const handleAutosave = useCallback(async (data: Record<string, any>) => {
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
          custom_fields_metadata: claim.form_data?.custom_fields_metadata || [],
          hidden_fields: claim.form_data?.hidden_fields || [],
        },
      },
    });
  }, [claim.id, updateClaimMutation, claim.form_data]);

  useAutosave({
    control,
    onSave: handleAutosave,
    delay: 2000,
    enabled: false,
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

  const onSubmit = async (data: Record<string, any>) => {
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

      const dataWithMetadata = {
        ...standardData,
        ...existingCustomEntries,
        custom_fields_metadata: customFields,
        hidden_fields: Array.from(hiddenFields),
      };
      
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: dataWithMetadata,
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
      };
      
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: dataWithMetadata,
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
          form_data: dataWithMetadata,
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

  const renderField = (field: FormField, showActions = true) => {
    const fieldValue = watch(field.name);

    if (hiddenFields.has(field.name)) {
      return null;
    }

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : (
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
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
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : (
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
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
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : (
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
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
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : (
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
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
        return (
          <div key={field.name} className="relative space-y-2">
            <div className="flex items-center justify-between">
              {field.isCustom ? (
                <Input
                  value={field.label}
                  onChange={(e) => updateCustomField(field.name, { label: e.target.value })}
                  className="text-sm font-medium w-auto max-w-xs"
                  placeholder="Field label"
                />
              ) : (
                <Label htmlFor={field.name}>
                  {field.label} {field.required && <span className="text-destructive">*</span>}
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
              value={fieldValue || ""}
              onValueChange={(value) => {
                setValue(field.name, value);
                if (value !== (claim.form_data?.[field.name] || '')) {
                  setPendingSaves(prev => new Set([...prev, field.name]));
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
          <div key={field.name} className="relative flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={fieldValue || false}
              onCheckedChange={(checked) => {
                setValue(field.name, checked);
                if (checked !== (claim.form_data?.[field.name] || false)) {
                  setPendingSaves(prev => new Set([...prev, field.name]));
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

    return (
      <Collapsible open={isOpen} onOpenChange={() => toggleSection(sectionKey)}>
        <Card className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-sm">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={`w-full justify-between p-4 h-auto text-left ${colorClass} text-white hover:opacity-90 transition-all duration-200 rounded-t-lg`}
            >
              <h4 className="text-lg font-semibold flex items-center gap-2">
                <Info className="w-5 h-5" />
                {title}
              </h4>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="animate-accordion-down">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50">
              {allFields.map(field => renderField(field))}
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
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  const section1Fields = additionalFields.slice(0, 13);
  const section2Fields = additionalFields.slice(13, 23);
  const section3Fields = additionalFields.slice(23, 29);
  const section4Fields = additionalFields.slice(29);

  const section1Custom = customFields.filter((_, index) => index % 4 === 0);
  const section2Custom = customFields.filter((_, index) => index % 4 === 1);
  const section3Custom = customFields.filter((_, index) => index % 4 === 2);
  const section4Custom = customFields.filter((_, index) => index % 4 === 3);

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

            {/* Report Text Section */}
            {renderSection('section4', 'Report Text Section', section4Fields, section4Custom, 'bg-info')}
            
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