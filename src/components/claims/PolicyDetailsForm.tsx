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

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Form Section */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Policy Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {fields.map(renderField)}
            
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

      {/* Live Preview Section */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Form Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <h3 className="font-medium mb-3">Current Form Data:</h3>
              <div className="space-y-2 text-sm">
                {fields.map((field) => {
                  const value = watch(field.name);
                  return (
                    <div key={field.name} className="flex justify-between">
                      <span className="text-muted-foreground">{field.label}:</span>
                      <span className="font-medium">
                        {value ? (typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)) : '-'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              <p>* Required fields must be completed</p>
              <p>* Changes are saved automatically when you submit the form</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};