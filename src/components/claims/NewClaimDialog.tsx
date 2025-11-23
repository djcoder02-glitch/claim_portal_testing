import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePolicyTypes, useCreateClaim } from "@/hooks/useClaims";
import { ChevronRight, FileText, Car, Anchor, Wrench, Flame, Users, Settings, Shuffle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSurveyors } from "@/hooks/useSurveyors";
import { useInsurers, useAddInsurer } from "@/hooks/useInsurers";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface NewClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClaimFormData {
  title: string;
  //description: string;
  claim_amount?: number;
  registration_id: string;
  insured_name: string;
  assigned_surveyor?: string;
  insurer?: string; 
  intimation_date?: string;
}

const policyIcons = {
  Marine: Anchor,
  Engineering: Wrench,
  Fire: Flame,
  Motor: Car,
  Misc: Shuffle,
  Client: Users,
  "Value Added": Settings,
} as const;

export const NewClaimDialog = ({ open, onOpenChange }: NewClaimDialogProps) => {
  const qc = useQueryClient();
  const [step, setStep] = useState<"select-policy" | "claim-details">("select-policy");
  const [selectedMainType, setSelectedMainType] = useState<string>("");
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>("");
  const navigate = useNavigate();
  const [dynamicFields, setDynamicFields] = useState<any[]>([]);
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ClaimFormData>({
    defaultValues: {
      title: "",
    //  description: "",
      registration_id: "",
      insured_name: "",
      assigned_surveyor: "",
      insurer: "",
      intimation_date:"",
    },
  });

  // --- Policy types & claim creation ---
  const { data: policyTypes = [], isLoading: policyTypesLoading } = usePolicyTypes();
  const createClaimMutation = useCreateClaim();

  // --- Surveyors: fixed list ---
  const { data: surveyors = [], isLoading: surveyorsLoading } = useSurveyors();

  // --- Insurers: dynamic list (insert supported) ---
  const { data: insurers = [], isLoading: insurersLoading } = useInsurers();
  const addInsurerMutation = useAddInsurer();

  const handlePolicySelect = (policyTypeId: string) => {
    setSelectedPolicyType(policyTypeId);
    setStep("claim-details");
  };

  // ADD THIS ENTIRE BLOCK HERE ⬇️
  useEffect(() => {
    if (selectedPolicyType && policyTypes) {
      const policyType = policyTypes.find(pt => pt.id === selectedPolicyType);
      if (policyType?.fields?.new_claim_fields) {
        setDynamicFields(
          policyType.fields.new_claim_fields
            .filter((f: any) => f.visible)
            .sort((a: any, b: any) => a.order - b.order)
        );
      } else {
        // Default fields if none configured
        setDynamicFields([
          { id: "title", name: "title", label: "Claim Title", type: "text", required: true, placeholder: "Brief description of your claim" },
          { id: "claim_amount", name: "claim_amount", label: "Estimated Claim Amount (Rs.)", type: "number", required: false, placeholder: "0.00" },
          { id: "intimation_date", name: "intimation_date", label: "Intimation Date", type: "date", required: false },
          { id: "registration_id", name: "registration_id", label: "Registration ID", type: "text", required: true, placeholder: "Enter registration ID" },
          { id: "insured_name", name: "insured_name", label: "Insured Name", type: "text", required: true, placeholder: "Enter insured name" },
          { id: "insurer", name: "insurer", label: "Insurer", type: "select", required: false, placeholder: "Select or add insurer..." },
          { id: "assigned_surveyor", name: "assigned_surveyor", label: "Assigned Surveyor", type: "select", required: false, placeholder: "Select surveyor..." },
        ]);
      }
    }
  }, [selectedPolicyType, policyTypes]);
  // ⬆️ END OF NEW CODE

  const onSubmit = async (data: ClaimFormData) => {
      if (!selectedPolicyType) return;

    try {
      const claim = await createClaimMutation.mutateAsync({
        policy_type_id: selectedPolicyType,
        title: data.title,
     //   description: data.description,
        claim_amount: data.claim_amount,
        intimation_date: data.intimation_date,
        form_data: {
          registration_id: data.registration_id,
          insured_name: data.insured_name,
          assigned_surveyor: data.assigned_surveyor,
          insurer: data.insurer,

        },
      });

      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["claim"] });
      qc.invalidateQueries({ queryKey: ["claim", claim.id] });

      onOpenChange(false);
      reset();

      
      setStep("select-policy");
      setSelectedPolicyType("");

      navigate(`/claims/${claim.id}`);
    } catch (error) {
      console.error("Failed to create claim:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep("select-policy");
    setSelectedMainType("");
    setSelectedPolicyType("");
    reset();
  };

  if (policyTypesLoading) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Claim</DialogTitle>
            <DialogDescription>Loading policy types...</DialogDescription>
          </DialogHeader>
          <div className="animate-pulse space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const renderDynamicField = (field: any) => {
    switch (field.type) {
      case "text":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && "*"}
            </Label>
            <Input
              id={field.name}
              placeholder={field.placeholder}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && "*"}
            </Label>
            <Input
              id={field.name}
              type="number"
              step="0.01"
              placeholder={field.placeholder}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                valueAsNumber: true,
                min: { value: 0, message: "Amount must be positive" },
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
            )}
          </div>
        );

      case "date":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && "*"}
            </Label>
            <Input
              id={field.name}
              type="date"
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
                validate: (value) => {
                  if (!value) return true;
                  const selectedDate = new Date(value);
                  const today = new Date();
                  today.setHours(23, 59, 59, 999);
                  if (selectedDate > today) {
                    return `${field.label} cannot be in the future`;
                  }
                  return true;
                },
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
            )}
          </div>
        );

      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && "*"}
            </Label>
            <Textarea
              id={field.name}
              placeholder={field.placeholder}
              rows={4}
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
              })}
            />
            {errors[field.name] && (
              <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
            )}
          </div>
        );

      case "select":
        if (field.name === "insurer") {
          return (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}</Label>
              <SearchableSelect
                options={insurers.map((i) => i.name)}
                value={watch(field.name) || ""}
                placeholder={field.placeholder}
                onValueChange={(val) => setValue(field.name, val)}
                allowClear
                allowCreate
                onCreateOption={async (val) => {
                  await addInsurerMutation.mutateAsync(val);
                }}
                disabled={insurersLoading || addInsurerMutation.isPending}
              />
              {insurersLoading && <p className="text-xs text-muted-foreground">Loading insurers...</p>}
            </div>
          );
        }

        if (field.name === "assigned_surveyor") {
          return (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}</Label>
              <SearchableSelect
                options={surveyors.map((s) => s.name)}
                value={watch(field.name) || ""}
                placeholder={field.placeholder}
                onValueChange={(val) => setValue(field.name, val)}
                disabled={surveyorsLoading}
                allowClear
              />
              {surveyorsLoading && <p className="text-xs text-muted-foreground">Loading surveyors...</p>}
            </div>
          );
        }

        // Generic select field
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label} {field.required && "*"}
            </Label>
            <select
              id={field.name}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
              {...register(field.name, {
                required: field.required ? `${field.label} is required` : false,
              })}
            >
              <option value="">{field.placeholder || "Select..."}</option>
              {field.options?.map((opt: string) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            {errors[field.name] && (
              <p className="text-sm text-destructive">{errors[field.name]?.message as string}</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "select-policy" ? "Select Policy Type" : "Claim Details"}
          </DialogTitle>
          <DialogDescription>
            {step === "select-policy"
              ? "Choose the type of insurance policy for your claim"
              : "Provide basic information about your claim"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Select Policy */}
        {step === "select-policy" && (
          <div className="space-y-6 py-4">
            {!selectedMainType ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policyTypes
                  .filter((type) => !type.parent_id)
                  .map((mainType) => {
                    const Icon = policyIcons[mainType.name as keyof typeof policyIcons] || FileText;
                    return (
                      <Card
                        key={mainType.id}
                        className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
                        onClick={() => setSelectedMainType(mainType.id)}
                      >
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Icon className="w-8 h-8 text-primary" />
                              <div>
                                <CardTitle className="text-lg">{mainType.name}</CardTitle>
                                <CardDescription>{mainType.description}</CardDescription>
                              </div>
                            </div>
                            <ChevronRight className="w-5 h-5 text-muted-foreground" />
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Select {policyTypes.find((p) => p.id === selectedMainType)?.name} Subtype
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setSelectedMainType("")}>
                    Back to Categories
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policyTypes
                    .filter((type) => type.parent_id === selectedMainType)
                    .map((subType) => {
                      const Icon =
                        policyIcons[
                          policyTypes.find((p) => p.id === selectedMainType)?.name as keyof typeof policyIcons
                        ] || FileText;
                      return (
                        <Card
                          key={subType.id}
                          className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
                          onClick={() => handlePolicySelect(subType.id)}
                        >
                          <CardHeader>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <Icon className="w-6 h-6 text-primary" />
                                <div>
                                  <CardTitle className="text-base">{subType.name}</CardTitle>
                                  <CardDescription>{subType.description}</CardDescription>
                                </div>
                              </div>
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            </div>
                          </CardHeader>
                        </Card>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Claim Details */}
        {step === "claim-details" && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Render dynamic fields */}
            {dynamicFields.map((field) => renderDynamicField(field))}

            {/* Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep("select-policy");
                  setSelectedPolicyType("");
                  setSelectedMainType("");
                }}
              >
                Back
              </Button>
              <Button type="submit" disabled={createClaimMutation.isPending}>
                {createClaimMutation.isPending ? "Creating..." : "Create Claim"}
              </Button>
            </div>
          </form>
        )}
        
      </DialogContent>
    </Dialog>
  );
};
