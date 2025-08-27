import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpdateClaim, type Claim } from "@/hooks/useClaims";
import { toast } from "sonner";

interface AdditionalInformationFormProps {
  claim: Claim;
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
}

export const AdditionalInformationForm = ({ claim }: AdditionalInformationFormProps) => {
  const updateClaimMutation = useUpdateClaim();
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: claim.form_data || {}
  });

  useEffect(() => {
    // Reset form with current claim data
    reset(claim.form_data || {});
  }, [claim.form_data, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    try {
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: data,
        },
      });
      toast.success("Additional information updated successfully!");
    } catch (error) {
      console.error("Failed to update claim:", error);
    }
  };

  const renderField = (field: FormField) => {
    const fieldValue = watch(field.name);

    switch (field.type) {
      case 'text':
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false 
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
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              placeholder={`Enter ${field.label.toLowerCase()}`}
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false,
                valueAsNumber: true
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
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id={field.name}
              type="date"
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false 
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
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id={field.name}
              placeholder={`Enter ${field.label.toLowerCase()}`}
              rows={4}
              {...register(field.name, { 
                required: field.required ? `${field.label} is required` : false 
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
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={fieldValue || ""}
              onValueChange={(value) => setValue(field.name, value)}
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
          <div key={field.name} className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={fieldValue || false}
              onCheckedChange={(checked) => setValue(field.name, checked)}
            />
            <Label htmlFor={field.name} className="text-sm font-normal">
              {field.label}
            </Label>
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

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Additional Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1 - Basic Information */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Section 1 - Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {additionalFields.slice(0, 13).map(renderField)}
              </div>
            </div>

            {/* Section 2 - Survey & Loss Details */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Section 2 - Survey & Loss Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {additionalFields.slice(13, 23).map(renderField)}
              </div>
            </div>

            {/* Section 3 - Transportation Details */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Section 3 - Transportation Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {additionalFields.slice(23, 29).map(renderField)}
              </div>
            </div>

            {/* Report Text Section */}
            <div className="space-y-4">
              <h4 className="text-md font-medium text-muted-foreground">Report Text Section</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {additionalFields.slice(29).map(renderField)}
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                disabled={updateClaimMutation.isPending}
                className="w-full"
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