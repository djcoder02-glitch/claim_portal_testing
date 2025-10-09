import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { FieldErrors, UseFormSetValue } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {Badge} from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUpdateClaimSilent, type Claim } from "@/hooks/useClaims";
import { useAutosave } from "@/hooks/useAutosave";
import { toast } from "sonner";
import { ChevronDown, ChevronUp, X, Info, Check, Edit, Table } from "lucide-react";
import { SearchableSelect} from "@/components/ui/searchable-select";
import { useFieldOptions, useAddFieldOption } from "@/hooks/useFieldOptions";
import { useFormTemplates, useSaveTemplate, type DynamicSection, type FormTemplate, type TemplateField} from "@/hooks/useFormTemplates";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Save, Plus, Download, Upload, Palette, Trash2 } from "lucide-react";
import { useSectionTemplates, type SectionTemplate } from "@/hooks/useSectionTemplates";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EditableTable, TableModal } from './TableComponents';
import type { TableData } from '@/hooks/useFormTemplates';


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
  sectionImages: Record<string, string[]>;
}

// Add color options for sections
const colorOptions = [
  { value: 'bg-gradient-primary', label: 'Blue', class: 'bg-gradient-primary' },
  { value: 'bg-warning', label: 'Orange', class: 'bg-warning' },
  { value: 'bg-success', label: 'Green', class: 'bg-success' },
  { value: 'bg-info', label: 'Teal', class: 'bg-info' },
  { value: 'bg-red-600', label: 'Red', class: 'bg-red-600' },
  { value: 'bg-purple-600', label: 'Purple', class: 'bg-purple-600' },
  { value: 'bg-indigo-600', label: 'Indigo', class: 'bg-indigo-600' },
  { value: 'bg-pink-600', label: 'Pink', class: 'bg-pink-600' },
];

const ImageGrid: React.FC<ImageGridProps> = ({ sectionKey, images, setImages, claimId, claimFormData, updateClaim, customFields, hiddenFields, fieldLabels, sectionImages }) => {
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (!e.target.files?.length) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    // 🔔 Start loading toast
    const toastId = toast.loading("Uploading image...");

    try {
      console.log("Uploading image to backend...");
      const res = await fetch("http://localhost:5000/upload-image", {
      // const res = await fetch("https://reports-backend-48dg.onrender.com/upload-image", {
        method: "POST",
        body: formData,
      });
      console.log("Upload response:", res);

      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();

      const updated = [...images];
      updated[index] = data.url;
      setImages(updated);
      console.log(sectionKey, " ke images updated:", updated);

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

      console.log(sectionImages);
      console.log("Images", images)
      console.log("claim", claimFormData);

      // ✅ Update toast on success
      toast.success("Image uploaded successfully!", { id: toastId, duration: 2000 });
    } catch (err) {
      console.error("Image upload failed", err);
      // ❌ Update toast on failure
      toast.error("Image upload failed. Please try again.", { id: toastId, duration: 2500 });
    }
  };

  const handleRemove = async (index: number) => {
    // 🔔 Start loading toast
    const toastId = toast.loading("Removing image...");

    try {
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

      // ✅ Success toast
      toast.success("Image removed successfully.", { id: toastId, duration: 2000 });
    } catch (error) {
      console.error("Failed to remove image:", error);
      // ❌ Error toast
      toast.error("Failed to remove image.", { id: toastId, duration: 2500 });
    }
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
  const [selectedTemplate, setSelectedTemplate] = useState<SectionTemplate | null>(null);
  const { data: sectionTemplates = [], isLoading: templatesLoading } = useSectionTemplates(claim.policy_type_id);
  
  const handleCreateFieldOption = async (fieldName: string, newValue: string) : Promise<void> => {
    await addFieldOptionMutation.mutateAsync({ fieldName, optionValue: newValue });
  };

  const [activeTab, setActiveTab] = useState<string>("template");
  const [showTableModal, setShowTableModal] = useState(false);
  const [currentTableSectionId, setCurrentTableSectionId] = useState<string | null>(null);

  // State for collapsible sections
  const [openSections, setOpenSections] = useState<Record<string,boolean>>({
    section1: false,
    section2: false,
    section3: false,
    section4: false,
  });

  const [sectionEditMode, setSectionEditMode] = useState<Record<string, boolean>>({
    section1: false,
    section2: false,
    section3: false,
    section4: false,
  });

  const [sectionImages, setSectionImages] = useState<Record<string, string[]>>({});

  // Add these new state variables
  const [dynamicSections, setDynamicSections] = useState<DynamicSection[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<FormTemplate | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showNewSectionDialog, setShowNewSectionDialog] = useState(false);
  const [showSaveTemplateDialog, setShowSaveTemplateDialog] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionColor, setNewSectionColor] = useState('bg-slate-600');
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  //Section editing states
  const [editingSection, setEditingSection]= useState <string |null>(null);
  
  // State for managing custom fields and hidden fields
  const [customFields, setCustomFields] = useState<FormField[]>([]);
  const [hiddenFields, setHiddenFields] = useState<Set<string>>(new Set());
  const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());
  const [fieldLabels, setFieldLabels] = useState<Record<string, string>>({});
  const [editingLabels, setEditingLabels] = useState<Set<string>>(new Set());

  const { data: templates = [] } = useFormTemplates(claim.policy_type_id);
  const saveTemplateMutation = useSaveTemplate();

  // Load custom fields from form_data on mount
  useEffect(() => {
    const savedCustomFields = (claim.form_data?.custom_fields_metadata || []) as FormField[];
    const savedHiddenFields = claim.form_data?.hidden_fields || [];
    const savedFieldLabels = (claim.form_data?.field_labels || {}) as Record<string, string>;
      const savedDynamicSections = claim.form_data?.dynamic_sections_metadata as DynamicSection[] | undefined;


    const withSection = savedCustomFields.map((field, index) => ({
      ...field,
      section: field.section || (['section1','section2','section3','section4'][index % 4] as FormField['section']),
    }));

    setCustomFields(withSection);
    setHiddenFields(new Set(Array.isArray(savedHiddenFields) ? savedHiddenFields : []));
    setFieldLabels(savedFieldLabels);

     if (savedDynamicSections && savedDynamicSections.length > 0) {
    setDynamicSections(savedDynamicSections);
  }
    
    withSection.forEach((field) => {
      if (claim.form_data?.[field.name] !== undefined) {
        setValue(field.name, claim.form_data[field.name]);
      }
    });

    Object.entries(claim.form_data || {}).forEach(([key, value]) => {
    if (key.endsWith("_images") && Array.isArray(value)) {
      // Normalize to exactly 6 slots
      const urls = value.slice(0, 6);
      while (urls.length < 6) urls.push("");
      sectionImages[key.replace(/_images$/, "")] = urls;
    }
  });

    console.log("claim fetched", claim.form_data)

  }, [claim.form_data, setValue, openSections, , setSectionImages]);

  // Autosave functionality
  const handleAutosave = useCallback(async (data: Record<string, unknown>) => {
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
          custom_fields_metadata: (claim.form_data?.custom_fields_metadata as unknown[]) || [],
          hidden_fields: (claim.form_data?.hidden_fields as string[]) || [],
          field_labels: (claim.form_data?.field_labels as Record<string, string>) || {},
        } as any,
        // intimation_date: ""
      },
    });
  }, [claim.id, updateClaimMutation, claim.form_data]);

  useAutosave({
    control,
    onSave: handleAutosave,
    delay: 2000,
    enabled: false,
  });

  const toggleSection = (section : string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    reset(claim.form_data || {});
  }, [claim.form_data, reset]);

  const onSubmit = async (data: Record<string, unknown>) => {
    try {
          console.log('🔍 Current dynamicSections:', dynamicSections);

      const pendingFieldNames = Array.from(pendingSaves);
      if (pendingFieldNames.length > 0) {
        for (const fieldName of pendingFieldNames) {
          await saveCustomField(fieldName);
        }
      }

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
        dynamic_sections_metadata:dynamicSections,
        ...imagesData,
      };

      console.log('💾 Data being saved:', dataWithMetadata);
    console.log('📦 dynamic_sections_metadata:', dataWithMetadata.dynamic_sections_metadata);


      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: dataWithMetadata as any,
          // intimation_date: ""
        },
      });
          console.log('✅ Save completed');

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
          form_data: dataWithMetadata as any,
          // intimation_date: ""
        },
      });
      
      setPendingSaves(prev => {
        const newSet = new Set(prev);
        newSet.delete(fieldName);
        return newSet;
      });
      
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
            custom_fields_metadata: customFields as unknown[],
            hidden_fields: Array.from(hiddenFields),
          } as any,
          // intimation_date: ""
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
          form_data: dataWithMetadata as any,
          // intimation_date: ""
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
    if (updates.label === undefined) {
      setPendingSaves(prev => new Set([...prev, fieldName]));
    }
  };

  const toggleSectionEdit = (sectionKey: string) => {
    if (editingSection === sectionKey) {
      setEditingSection(null);
      setSectionEditMode(prev => ({
        ...prev,
        [sectionKey]: false
      }));
    } else {
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

  // Additional details fields based on policy type - MOVED HERE
  const getAdditionalDetailsFields = () => {
    const policyTypeName = claim.policy_types?.name?.toLowerCase() || '';
    
    const commonFields = [
      { name: 'consigner_name', label: 'Name of Consigner of Goods (Exporter)', type: 'text' as const, required: false },
      { name: 'consignee_name', label: 'Name of Consignee of Goods (Importer)', type: 'text' as const, required: false },
      { name: 'applicant_survey', label: 'Applicant of Survey', type: 'text' as const, required: false },
      { name: 'underwriter_name', label: 'Name of Underwriter / Insurer', type: 'text' as const, required: false },
      { name: 'cha_name', label: 'Name of CHA / Clearing Agent / Forwarder', type: 'text' as const, required: false },
      { name: 'certificate_no', label: 'Certificate No (if Applicable)', type: 'text' as const, required: false },
      { name: 'endorsement_no', label: 'Endorsement No (if Any)', type: 'text' as const, required: false },
      { name: 'invoice_no', label: 'Invoice Details Invoice No', type: 'text' as const, required: false },
      { name: 'invoice_date', label: 'Invoice Details Invoice Date', type: 'date' as const, required: false },
      { name: 'invoice_value', label: 'Invoice Details Invoice Value', type: 'number' as const, required: false },
      { name: 'invoice_pkg_count', label: 'Invoice Details No of PKG', type: 'number' as const, required: false },
      { name: 'invoice_gross_wt', label: 'Invoice Details Gross WT', type: 'text' as const, required: false },
      { name: 'invoice_net_wt', label: 'Invoice Details Net WT', type: 'text' as const, required: false },
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
      { name: 'transporter_name', label: 'Name of the Transporter', type: 'text' as const, required: false },
      { name: 'vehicle_number', label: 'Vehicle Number', type: 'text' as const, required: false },
      { name: 'lr_date_issuance', label: 'LR & Date of Issuance', type: 'text' as const, required: false },
      { name: 'consignment_note', label: 'Consignment Note No / Docket No & Date', type: 'text' as const, required: false },
      { name: 'delivery_challan', label: 'Delivery Challan No', type: 'text' as const, required: false },
      { name: 'dispatch_condition', label: 'External Condition While Dispatching the Consignment from Port / CFS / Warehouse', type: 'textarea' as const, required: false },
      { name: 'survey_address', label: 'Address of Survey', type: 'textarea' as const, required: false },
      { name: 'number_packages', label: 'Number of Packages', type: 'select' as const, required: false, options: ['BULK/RM', '1-10', '11-50', '51-100', '100+'] },
      { name: 'packing_contents', label: 'Whats Inside Packing Consignment', type: 'textarea' as const, required: false },
      { name: 'content_industry_use', label: 'Use of Content Industry it is Utilised in', type: 'select' as const, required: false, options: ['Manufacturing', 'Construction', 'Electronics', 'Textiles', 'Automotive', 'Food Processing', 'Other'] },
      { name: 'arrival_details', label: 'How Did it Arrive to the Premises Spot of Survey Mention Container No and or Vehicle No if Applicable', type: 'select' as const, required: false, options: ['By Road Transport', 'By Sea Container', 'By Air Cargo', 'By Rail', 'Other'] },
      { name: 'external_condition_tag', label: 'External Condition Tag', type: 'textarea' as const, required: false },
    ];

    if (policyTypeName.includes('marine') || policyTypeName.includes('cargo')) {
      return [
        ...commonFields,
        { name: 'vessel_name', label: 'Vessel Name', type: 'text' as const, required: false },
        { name: 'port_loading', label: 'Port of Loading', type: 'text' as const, required: false },
        { name: 'port_discharge', label: 'Port of Discharge', type: 'text' as const, required: false },
        { name: 'bl_number', label: 'Bill of Lading Number', type: 'text' as const, required: false },
      ];
    }

    if (policyTypeName.includes('fire') || policyTypeName.includes('property')) {
      return [
        ...commonFields,
        { name: 'building_type', label: 'Building Type', type: 'select' as const, required: false, options: ['Residential', 'Commercial', 'Industrial', 'Warehouse'] },
        { name: 'fire_brigade_called', label: 'Was Fire Brigade Called?', type: 'select' as const, required: false, options: ['Yes', 'No'] },
        { name: 'sprinkler_system', label: 'Sprinkler System Present?', type: 'select' as const, required: false, options: ['Yes', 'No'] },
      ];
    }

    return commonFields;
  };

  const addNewSection = () => {
    if (!newSectionName.trim()) return;
    
    const newSection: DynamicSection = {
      id: `custom_${Date.now()}`,
      name: newSectionName,
      order_index: dynamicSections.length + 1,
      color_class: newSectionColor,
      fields: [],
      isCustom: true
    };
    
    setDynamicSections([...dynamicSections, newSection]);

    setNewSectionName('');
    setNewSectionColor('bg-slate-600');
    setShowNewSectionDialog(false);
    toast.success(`Section "${newSectionName}" added!`);
  };

  const createSectionFromTemplate = () => {
  if (!selectedTemplate) {
    toast.error("Please select a template");
    return;
  }
  
  const sectionName = newSectionName.trim() || selectedTemplate.name;
  
  const newSection: DynamicSection = {
    id: `custom_${Date.now()}`,
    name: sectionName,
    order_index: dynamicSections.length + 1,
    color_class: selectedTemplate.color_class,
    fields: selectedTemplate.preset_fields.map((field) => ({
      id: `${field.name}_${Date.now()}`,
      name: field.name,
      label: field.label,
      type: field.type as TemplateField['type'],
      required: field.required,
      options: field.options,
      order_index: field.order_index
    })),
    isCustom: true
  };
  
  setDynamicSections([...dynamicSections, newSection]);
  setShowNewSectionDialog(false);
  setSelectedTemplate(null);
  setNewSectionName('');
  toast.success(`Section "${sectionName}" created with ${newSection.fields.length} fields!`);
};

  const removeSection = (sectionId: string) => {
    setDynamicSections(prev => prev.filter(section => section.id !== sectionId));
    toast.success("Section removed");
  };

  const addFieldToSection = (sectionId: string) => {
    const newField: FormField = {
      name: `custom_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      isCustom: true,
      section: sectionId as FormField['section'],
    };
    
    setCustomFields(prev => [...prev, newField]);
    setPendingSaves(prev => new Set([...prev, newField.name]));
  }
  const addTableToSection = (sectionId: string, rows: number, cols: number, name: string) => {
  const newTable: TableData = {
    id: `table_${Date.now()}`,
    name: name,
    rows,
    cols,
    data: Array(rows).fill(null).map(() =>
      Array(cols).fill(null).map(() => ({ value: '' }))
    ),
    created_at: new Date().toISOString(),
  };

  setDynamicSections(prev =>
    prev.map(section =>
      section.id === sectionId
        ? { ...section, tables: [...(section.tables || []), newTable] }
        : section
    )
  );

  setShowTableModal(false);
  const sectionName = dynamicSections.find(s => s.id === sectionId)?.name || 'section';
  toast.success(`Table "${name}" added to ${sectionName}!`);
};
  const updateTableData = (sectionId: string, tableId: string, newData: Array<Array<{ value: string }>>) => {
    setDynamicSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              tables: (section.tables || []).map(table =>
                table.id === tableId
                  ? { ...table, data: newData, rows: newData.length, cols: newData[0]?.length || 0 }
                  : table
              ),
            }
          : section
      )
    );
  };

  const updateTableName = (sectionId: string, tableId: string, newName: string) => {
    setDynamicSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? {
              ...section,
              tables: (section.tables || []).map(table =>
                table.id === tableId ? { ...table, name: newName } : table
              ),
            }
          : section
      )
    );
  };

  const deleteTable = (sectionId: string, tableId: string) => {
    setDynamicSections(prev =>
      prev.map(section =>
        section.id === sectionId
          ? { ...section, tables: (section.tables || []).filter(t => t.id !== tableId) }
          : section
      )
    );
    toast.success('Table deleted');
  };

  const saveAsTemplate = async () => {
  if (!templateName.trim()) return;
  
  try {
    // Merge custom fields into their respective sections
    const sectionsWithCustomFields = dynamicSections.map(section => {
      // Get custom fields for this section
      const sectionCustomFields = customFields.filter(f => f.section === section.id);
      
      // Convert custom fields to TemplateField format
      const customTemplateFields: TemplateField[] = sectionCustomFields.map((field, index) => ({
        id: field.name,
        name: field.name,
        label: fieldLabels[field.name] || field.label,
        type: field.type as TemplateField['type'],
        required: field.required,
        options: field.options,
        order_index: section.fields.length + index + 1
      }));
      
      // Update existing field labels and filter out hidden fields
      const updatedFields = section.fields
        .filter(field => !hiddenFields.has(field.name)) // ✅ Exclude hidden fields
        .map(field => ({
          ...field,
          label: fieldLabels[field.name] || field.label
        }));
      
      return {
        ...section,
        fields: [...updatedFields, ...customTemplateFields.filter(f => !hiddenFields.has(f.name))] // ✅ Also filter custom fields
      };
    });
    
    await saveTemplateMutation.mutateAsync({
      name: templateName,
      description: templateDescription,
      policyTypeId: claim.policy_type_id,
      sections: sectionsWithCustomFields
    });
    
    setTemplateName('');
    setTemplateDescription('');
    setShowSaveTemplateDialog(false);
    toast.success("Template saved with current field configuration!");
  } catch (error) {
    console.error('Failed to save template:', error);
  }
};



const loadTemplate = (template: FormTemplate) => {
  const convertedSections: DynamicSection[] = template.sections.map(section => ({
    id: section.id,
    name: section.name,
    order_index: section.order_index,
    color_class: section.color_class,
    fields: section.fields,
    isCustom: !section.name.startsWith('Section ')
  }));
  
  // Extract custom fields and field labels from template
  const loadedCustomFields: FormField[] = [];
  const loadedFieldLabels: Record<string, string> = {};
  
  template.sections.forEach(section => {
    section.fields.forEach(field => {
      // Store all field labels
      loadedFieldLabels[field.name] = field.label;
      
      // Identify custom fields (those not in the default field set)
      const defaultFieldNames = getAdditionalDetailsFields().map(f => f.name);
      if (!defaultFieldNames.includes(field.name)) {
        loadedCustomFields.push({
          name: field.name,
          label: field.label,
          type: field.type as FormField['type'],
          required: field.required,
          options: field.options,
          isCustom: true,
          section: section.id as FormField['section']
        });
      }
    });
  });
  
  setDynamicSections(convertedSections);
  setCustomFields(loadedCustomFields);
  setFieldLabels(loadedFieldLabels);
  
  // ✅ Preserve existing form data - repopulate all fields with current values
  Object.entries(claim.form_data || {}).forEach(([key, value]) => {
    // Skip metadata and image fields
    if (!key.endsWith('_metadata') && 
        !key.endsWith('_images') && 
        !key.includes('hidden_fields') && 
        !key.includes('field_labels')) {
      setValue(key, value);
    }
  });
  
  setCurrentTemplate(template);
  setShowTemplateDialog(false);
  toast.success(`Template "${template.name}" loaded! Your existing data has been preserved.`);
};

  // Initialize dynamic sections from existing structure
  useEffect(() => {
  // Check if we have saved sections in the claim data
  const savedDynamicSections = claim.form_data?.dynamic_sections_metadata as DynamicSection[] | undefined;
  
  if (savedDynamicSections && savedDynamicSections.length > 0) {
    // Load saved sections
    setDynamicSections(savedDynamicSections);
    return;
  }

  // Only create default sections if:
  // 1. No saved sections exist
  // 2. We haven't already created sections in state
  if (dynamicSections.length > 0) return;

  const additionalFields = getAdditionalDetailsFields();
  const section1Fields = additionalFields.slice(0, 13);
  const section2Fields = additionalFields.slice(13, 23);
  const section3Fields = additionalFields.slice(23, 29);
  const section4Fields = additionalFields.slice(29);

  const defaultSections: DynamicSection[] = [
    {
      id: 'section1',
      name: 'Section 1 - Basic Information',
      order_index: 1,
      color_class: 'bg-gradient-primary',
      fields: section1Fields.map((field, index) => ({
        id: field.name,
        name: field.name,
        label: field.label,
        type: field.type as TemplateField['type'],
        required: field.required,
        options: field.options,
        order_index: index + 1
      })),
      isCustom: false
    },
    {
      id: 'section2',
      name: 'Section 2 - Survey & Loss Details',
      order_index: 2,
      color_class: 'bg-warning',
      fields: section2Fields.map((field, index) => ({
        id: field.name,
        name: field.name,
        label: field.label,
        type: field.type as TemplateField['type'],
        required: field.required,
        options: field.options,
        order_index: index + 1
      })),
      isCustom: false
    },
    {
      id: 'section3',
      name: 'Section 3 - Transportation Details',
      order_index: 3,
      color_class: 'bg-success',
      fields: section3Fields.map((field, index) => ({
        id: field.name,
        name: field.name,
        label: field.label,
        type: field.type as TemplateField['type'],
        required: field.required,
        options: field.options,
        order_index: index + 1
      })),
      isCustom: false
    },
    {
      id: 'section4',
      name: 'Section 4 - Report Section',
      order_index: 4,
      color_class: 'bg-info',
      fields: section4Fields.map((field, index) => ({
        id: field.name,
        name: field.name,
        label: field.label,
        type: field.type as TemplateField['type'],
        required: field.required,
        options: field.options,
        order_index: index + 1
      })),
      isCustom: false
    }
  ];
  
  setDynamicSections(defaultSections);
}, [claim.form_data]); 

  // Now define these after useEffect where getAdditionalDetailsFields is available
  const additionalFields = getAdditionalDetailsFields();
  const section1Fields = additionalFields.slice(0, 13);
  const section2Fields = additionalFields.slice(13, 23);
  const section3Fields = additionalFields.slice(23, 29);
  const section4Fields = additionalFields.slice(29);

  const section1Custom = customFields.filter((f) => f.section === 'section1');
  const section2Custom = customFields.filter((f) => f.section === 'section2');
  const section3Custom = customFields.filter((f) => f.section === 'section3');
  const section4Custom = customFields.filter((f) => f.section === 'section4');

  const renderField = (field: FormField, isEditing = false) => {
    const showActions = isEditing || pendingSaves.has(field.name); 
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

  const renderDynamicSection = (section: DynamicSection) => {
    const convertedSectionFields = section.fields.map(field => ({
      name: field.name,
      label: field.label,
      type: field.type as FormField['type'],
      required: field.required,
      options: field.options,
      isCustom: false
    })).filter(field => !hiddenFields.has(field.name));
    
    const sectionCustomFields = customFields.filter(f => f.section === section.id);
    const allFields = [...convertedSectionFields, ...sectionCustomFields];
    
    const isOpen = section.id in openSections ? openSections[section.id as keyof typeof openSections] : true;
    const isEditing = section.id in sectionEditMode ? sectionEditMode[section.id as keyof typeof sectionEditMode] : false;

    return (
      <Collapsible 
        open={isOpen} 
        onOpenChange={() => {
          setOpenSections(prev => ({
            ...prev,
            [section.id]: !isOpen
          }));
        }}
      >
        <Card className={`bg-white/95 backdrop-blur-sm border shadow-sm transition-all duration-200 ${
          isEditing ? 'border-blue-400 shadow-blue-100' : 'border-slate-200'
        }`}>
          <div className="flex items-stretch">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className={`flex-1 justify-between p-4 h-auto text-left ${section.color_class} text-white hover:opacity-90 transition-all duration-200 rounded-tl-lg rounded-tr-none`}
              >
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5" />
                  {section.name}
                </h4>
                {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </Button>
            </CollapsibleTrigger>
            
            <div className="flex">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setSectionEditMode(prev => ({
                    ...prev,
                    [section.id]: !isEditing
                  }));
                }}
                className={`h-auto px-3 py-2 transition-all duration-200 ${
                  isEditing 
                    ? 'bg-white text-blue-600 hover:bg-blue-50 border-l border-blue-200' 
                    : `${section.color_class} text-white hover:bg-white/20 border-l border-white/20`
                }`}
                title={isEditing ? 'Exit edit mode' : 'Edit section'}
              >
                <Edit className="w-4 h-4" />
              </Button>
              
              {section.isCustom && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSection(section.id);
                  }}
                  className={`h-auto px-3 py-2 rounded-tr-lg rounded-tl-none transition-all duration-200 ${section.color_class} text-white hover:bg-red-500 border-l border-white/20`}
                  title="Remove section"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          
          <CollapsibleContent className="animate-accordion-down">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50/50">
                {allFields.map((field) => renderField(field, isEditing))}
              </div>
              <div className="px-6 pb-6 bg-slate-50/50 space-y-4">
                {/* Render Tables */}
                {section.tables && section.tables.length > 0 && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">Data Tables</h4>
                    {section.tables.map((table) => (
                      <EditableTable
                        key={table.id}
                        tableId={table.id}
                        tableName={table.name}
                        data={table.data}
                        onUpdate={(newData) => updateTableData(section.id, table.id, newData)}
                        onDelete={() => deleteTable(section.id, table.id)}
                        onNameChange={(newName) => updateTableName(section.id, table.id, newName)}
                      />
                    ))}
                  </div>
                )}

                {/* Only Add Field Button */}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addFieldToSection(section.id)}
                  className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  <Plus className="h-3 w-3" />
                  Add Field
                </Button>
              </div>
            <div className="px-6 pb-6 bg-slate-50/50">
              <ImageGrid
                sectionKey={section.id}
                images={sectionImages[section.id] || (Array(6).fill("") as string[])}
                setImages={(urls) =>
                  setSectionImages((prev) => ({
                    ...prev,
                    [section.id]: urls,
                  }))
                }
                claimId={claim.id}
                claimFormData={claim.form_data || {}}
                updateClaim={updateClaimMutation}
                customFields={customFields}
                hiddenFields={hiddenFields}
                fieldLabels={fieldLabels}
                sectionImages={sectionImages}
              />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="bg-white/90 backdrop-blur-sm border-white/30 shadow-lg">
        <CardHeader className="bg-slate-700 text-white rounded-t-lg">
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5" />
              Additional Information
              {currentTemplate && (
                <Badge variant="secondary" className="ml-2">
                  {currentTemplate.name}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex gap-2">
              <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Upload className="w-4 h-4 mr-1" />
                    Load Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Load Form Template</DialogTitle>
                </DialogHeader>
                <DialogDescription className="sr-only">
                  Select a saved template to load its field structure
                </DialogDescription>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {templates.map(template => (
                      <Card key={template.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => loadTemplate(template)}>
                        <CardContent className="p-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <h3 className="font-medium">{template.name}</h3>
                              {template.is_default && (
                                <Badge variant="outline" className="text-xs">Default</Badge>
                              )}
                            </div>
                            {template.description && (
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground">
                              {template.sections.length} sections • {template.sections.reduce((acc, section) => acc + section.fields.length, 0)} fields
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={showSaveTemplateDialog} onOpenChange={setShowSaveTemplateDialog}>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm">
                    <Save className="w-4 h-4 mr-1" />
                    Save Template
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Save as Template</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <Label htmlFor="template-name">Template Name *</Label>
                      <Input
                        id="template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Enter template name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-description">Description</Label>
                      <Textarea
                        id="template-description"
                        value={templateDescription}
                        onChange={(e) => setTemplateDescription(e.target.value)}
                        placeholder="Optional description"
                        rows={3}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowSaveTemplateDialog(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveAsTemplate} disabled={!templateName.trim() || saveTemplateMutation.isPending}>
                        {saveTemplateMutation.isPending ? "Saving..." : "Save Template"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {dynamicSections
              .sort((a, b) => a.order_index - b.order_index)
              .map((section) => (
                <div key={section.id}>
                  {renderDynamicSection(section)}
                </div>
              ))}

            <div className="flex justify-center pt-4">
              <Dialog open={showNewSectionDialog} onOpenChange={setShowNewSectionDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Add New Section
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                  <DialogHeader>
                    <DialogTitle>Create New Section</DialogTitle>
                    <DialogDescription className="sr-only">
                      Choose a template or create from scratch
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2 bg-muted p-1 rounded-lg mb-4">
                      <TabsTrigger 
                        value="template" 
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 py-2.5 font-medium"
                      >
                        From Template
                      </TabsTrigger>
                      <TabsTrigger 
                        value="scratch" 
                        className="data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200 py-2.5 font-medium"
                      >
                        From Scratch
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* TAB 1: From Template */}
                    <TabsContent value="template" className="flex-1 min-h-0 flex flex-col">
                      {templatesLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center">
                            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                            <p className="text-muted-foreground">Loading templates...</p>
                          </div>
                        </div>
                      ) : sectionTemplates.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <p className="text-muted-foreground">
                              No templates available for this policy type.
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={() => setActiveTab("scratch")}
                              className="hover:bg-primary hover:text-primary-foreground transition-colors"
                            >
                              Create from Scratch Instead
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 min-h-0 flex flex-col space-y-4">
                          {/* Fixed height scrollable grid */}
                          <div className="flex-1 min-h-0">
                            <div 
                              className="h-full overflow-y-auto pr-2 space-y-3"
                              style={{ 
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgb(203 213 225) transparent' 
                              }}
                            >
                              <div className="grid grid-cols-2 gap-4 pb-4">
                                {sectionTemplates.map(template => (
                                  <Card 
                                    key={template.id}
                                    onClick={() => setSelectedTemplate(template)}
                                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg border-2 ${
                                      selectedTemplate?.id === template.id 
                                        ? 'border-primary shadow-lg bg-primary/5' 
                                        : 'border-border hover:border-primary/50'
                                    }`}
                                  >
                                    <CardContent className="p-4 space-y-3">
                                      <div className={`w-full h-3 rounded-full ${template.color_class}`} />
                                      <div className="space-y-2">
                                        <div className="flex items-start justify-between">
                                          <h4 className="font-semibold text-sm leading-tight">{template.name}</h4>
                                          {selectedTemplate?.id === template.id && (
                                            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 ml-2">
                                              <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                        {template.description && (
                                          <p className="text-xs text-muted-foreground leading-relaxed">
                                            {template.description}
                                          </p>
                                        )}
                                        <Badge variant="secondary" className="text-xs">
                                          {template.preset_fields.length} fields
                                        </Badge>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Fixed bottom section for selected template */}
                          {selectedTemplate && (
                            <div className="border-t bg-muted/30 -mx-6 px-6 py-4 space-y-4">
                              <div>
                                <Label htmlFor="template-section-name" className="text-sm font-medium">
                                  Section Name
                                </Label>
                                <Input
                                  id="template-section-name"
                                  value={newSectionName}
                                  onChange={(e) => setNewSectionName(e.target.value)}
                                  placeholder={selectedTemplate.name}
                                  className="mt-1.5"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Leave empty to use: "{selectedTemplate.name}"
                                </p>
                              </div>
                              
                              <div className="flex justify-end gap-3">
                                <Button 
                                  variant="outline" 
                                  onClick={() => {
                                    setSelectedTemplate(null);
                                    setNewSectionName('');
                                  }}
                                  className="hover:bg-muted"
                                >
                                  Clear Selection
                                </Button>
                                <Button 
                                  onClick={createSectionFromTemplate}
                                  className="bg-primary hover:bg-primary/90"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Create with {selectedTemplate.preset_fields.length} Fields
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>
                    
                    {/* TAB 2: From Scratch */}
                    <TabsContent value="scratch" className="flex-1 space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="section-name" className="text-sm font-medium">Section Name *</Label>
                          <Input
                            id="section-name"
                            value={newSectionName}
                            onChange={(e) => setNewSectionName(e.target.value)}
                            placeholder="Enter section name"
                            className="mt-1.5"
                          />
                        </div>
                        <div>
                          <Label htmlFor="section-color" className="text-sm font-medium">Section Color</Label>
                          <Select value={newSectionColor} onValueChange={setNewSectionColor}>
                            <SelectTrigger className="mt-1.5">
                              <SelectValue placeholder="Choose a color" />
                            </SelectTrigger>
                            <SelectContent>
                              {colorOptions.map(color => (
                                <SelectItem key={color.value} value={color.value}>
                                  <div className="flex items-center gap-2">
                                    <div className={`w-4 h-4 rounded ${color.class}`} />
                                    {color.label}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button 
                          variant="outline" 
                          onClick={() => {
                            setShowNewSectionDialog(false);
                            setNewSectionName('');
                          }}
                          className="hover:bg-muted"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={addNewSection} 
                          disabled={!newSectionName.trim()}
                          className="bg-primary hover:bg-primary/90"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Create Section
                        </Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
              {/* Add Table Button - Opens modal to select section */}
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => {
                  if (dynamicSections.length === 0) {
                    toast.error("Please create a section first before adding a table");
                    return;
                  }
                  setShowTableModal(true);
                }}
              >
                <Table className="w-4 h-4" />
                Add Table
              </Button>
            </div>

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
      <TableModal
      isOpen={showTableModal}
      onClose={() => setShowTableModal(false)}
      onCreateTable={(sectionId, rows, cols, name) => {
        addTableToSection(sectionId, rows, cols, name);
      }}
      sections={dynamicSections.map(s => ({ id: s.id, name: s.name }))}
    />
    </div>
  );
};

interface SearchableSelectFieldProps {
  field: FormField;
  fieldValue: unknown;
  displayedLabel: string;
  isEditingLabel: boolean;
  showActions: boolean;
  isEditing: boolean;
  claim: Claim;
  fieldLabels: Record<string, string>;
  setFieldLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editingLabels: Set<string>;
  setEditingLabels: React.Dispatch<React.SetStateAction<Set<string>>>;
  pendingSaves: Set<string>;
  setPendingSaves: React.Dispatch<React.SetStateAction<Set<string>>>;
  setValue: UseFormSetValue<Record<string, unknown>>;
  errors: FieldErrors<Record<string, unknown>>;
  saveCustomField: (fieldName: string) => Promise<void> | void;
  saveFieldLabel: (fieldName: string) => Promise<void> | void;
  removeField: (fieldName: string) => void;
  removeCustomField: (fieldName: string) => void;
  updateCustomField: (fieldName: string, updates: Partial<FormField>) => void;
  handleCreateFieldOption: (fieldName: string, newValue: string) => Promise<void>;
  addFieldOptionMutation: {
    isPending: boolean;
    mutateAsync: (payload: { fieldName: string; optionValue: string }) => Promise<void>;
  };
}

const SearchableSelectField: React.FC<SearchableSelectFieldProps> = ({ 
  field, 
  fieldValue, 
  displayedLabel, 
  isEditingLabel, 
  showActions,
  isEditing,
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
  const { data: dynamicOptions = [], isLoading } = useFieldOptions(field.name);
  
  const allOptions = [
    ...(field.options || []),
    ...dynamicOptions.filter(option => !(field.options || []).includes(option))
  ];

  return (
    <div className="relative space-y-2">
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