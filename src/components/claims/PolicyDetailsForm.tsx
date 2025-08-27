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
  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm({
    defaultValues: claim.form_data || {}
  });

  const fields = (claim.policy_types?.fields || []) as FormField[];

  useEffect(() => {
    // Reset form with current claim data, merging both standard and dynamic fields
    const allFormData = { ...claim.form_data };
    reset(allFormData);
  }, [claim.form_data, reset]);

  const onSubmit = async (data: Record<string, any>) => {
    try {
      await updateClaimMutation.mutateAsync({
        id: claim.id,
        updates: {
          form_data: data,
        },
      });
      toast.success("Policy details updated successfully!");
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
        const hasOtherOption = field.options?.includes('Other');
        const isOtherSelected = fieldValue === 'Other';
        const otherFieldName = `${field.name}_other`;
        const otherFieldValue = watch(otherFieldName);
        
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && <span className="text-destructive">*</span>}
            </Label>
            <Select
              value={fieldValue || ""}
              onValueChange={(value) => {
                setValue(field.name, value);
                // Clear the other field when switching away from "Other"
                if (value !== 'Other') {
                  setValue(otherFieldName, '');
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
                    required: isOtherSelected ? `Please specify ${field.label.toLowerCase()}` : false 
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


  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Policy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Standard Policy Information Fields */}
            <div className="space-y-6">
              <h3 className="text-lg font-semibold border-b pb-2">Policy Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {standardFields.map(renderField)}
              </div>
            </div>
            
            
            <div className="pt-4 border-t">
              <Button 
                type="submit" 
                disabled={updateClaimMutation.isPending}
                className="w-full"
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