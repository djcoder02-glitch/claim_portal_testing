import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { ChevronRight, FileText, Car, Anchor, Wrench, Flame, Plus, Users, Settings, Shuffle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useSurveyors, useAddSurveyor } from "@/hooks/useSurveyors";
import { SearchableSelect } from "@/components/ui/searchable-select";

interface NewClaimDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ClaimFormData {
  title: string;
  description: string;
  claim_amount?: number;
  registration_id: string;
  insured_name: string;
  assigned_surveyor?: string;
}

const policyIcons = {
  "Marine": Anchor,
  "Engineering": Wrench,
  "Fire": Flame,
  "Motor": Car,
  "Misc": Shuffle,
  "Client": Users,
  "Value Added": Settings,
} as const;

export const NewClaimDialog = ({ open, onOpenChange }: NewClaimDialogProps) => {
  const qc = useQueryClient();
  const [step, setStep] = useState<'select-policy' | 'claim-details'>('select-policy');
  const [selectedMainType, setSelectedMainType] = useState<string>("");
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>("");
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors }, reset, watch, setValue } = useForm<ClaimFormData>({
    defaultValues: { title: "", description: "", registration_id: "", insured_name: "", assigned_surveyor: "" }
  });

  // --- NEW: fetch policy types and createClaim mutation ---
  const { data: policyTypes = [], isLoading: policyTypesLoading } = usePolicyTypes();
  const createClaimMutation = useCreateClaim();

  // --- Surveyor hooks & data ---
  const { data: surveyors = [], isLoading: surveyorsLoading } = useSurveyors();
  const addSurveyorMutation = useAddSurveyor();

  const handleCreateSurveyor = async (newName: string) => {
    // If your hook expects an object, adapt accordingly (e.g. { name: newName })
    await addSurveyorMutation.mutateAsync(newName);
    // Optionally, we could refetch surveyors, but useAddSurveyor/onSuccess should already invalidate
  };

  const handlePolicySelect = (policyTypeId: string) => {
    setSelectedPolicyType(policyTypeId);
    setStep('claim-details');
  };

  const onSubmit = async (data: ClaimFormData) => {
    if (!selectedPolicyType) return;

    try {
      const claim = await createClaimMutation.mutateAsync({
        policy_type_id: selectedPolicyType,
        title: data.title,
        description: data.description,
        claim_amount: data.claim_amount,
        form_data: {
          registration_id: data.registration_id,
          insured_name: data.insured_name,
          assigned_surveyor: data.assigned_surveyor
        },
      });

      qc.invalidateQueries({ queryKey: ["claims"] });
      qc.invalidateQueries({ queryKey: ["claim"] });
      qc.invalidateQueries({ queryKey: ["claim", claim.id] });

      onOpenChange(false);
      reset();
      setStep('select-policy');
      setSelectedPolicyType("");

      navigate(`/claims/${claim.id}`);
    } catch (error) {
      console.error("Failed to create claim:", error);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    setStep('select-policy');
    setSelectedMainType("");
    setSelectedPolicyType("");
    reset();
  };

  const isLoading = policyTypesLoading;

  if (isLoading) {
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

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'select-policy' ? 'Select Policy Type' : 'Claim Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select-policy'
              ? 'Choose the type of insurance policy for your claim'
              : 'Provide basic information about your claim'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'select-policy' && (
          <div className="space-y-6 py-4">
            {!selectedMainType ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {policyTypes?.filter(type => !type.parent_id).map((mainType) => {
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
                              <CardDescription className="mt-1">
                                {mainType.description}
                              </CardDescription>
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
                    Select {policyTypes?.find(p => p.id === selectedMainType)?.name} Subtype
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMainType("")}
                  >
                    Back to Categories
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policyTypes?.filter(type => type.parent_id === selectedMainType).map((subType) => {
                    const Icon = policyIcons[policyTypes?.find(p => p.id === selectedMainType)?.name as keyof typeof policyIcons] || FileText;

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
                                <CardDescription className="mt-1">
                                  {subType.description}
                                </CardDescription>
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

        {step === 'claim-details' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Claim Title *</Label>
              <Input
                id="title"
                placeholder="Brief description of your claim"
                {...register("title", { required: "Claim title is required" })}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Provide more details about your claim"
                rows={4}
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="claim_amount">Estimated Claim Amount ($)</Label>
              <Input
                id="claim_amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("claim_amount", {
                  valueAsNumber: true,
                  min: { value: 0, message: "Amount must be positive" }
                })}
              />
              {errors.claim_amount && (
                <p className="text-sm text-destructive">{errors.claim_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="registration_id">Registration ID *</Label>
              <Input
                id="registration_id"
                placeholder="Enter registration ID"
                {...register("registration_id", {
                  required: "Registration ID is required",
                  minLength: {
                    value: 3,
                    message: "Registration ID must be at least 3 characters"
                  }
                })}
              />
              {errors.registration_id && (
                <p className="text-sm text-destructive">{errors.registration_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="insured_name">Insured Name *</Label>
              <Input
                id="insured_name"
                placeholder="Enter insured name"
                {...register("insured_name", {
                  required: "Insured name is required",
                  minLength: {
                    value: 2,
                    message: "Insured name must be at least 2 characters"
                  }
                })}
              />
              {errors.insured_name && (
                <p className="text-sm text-destructive">{errors.insured_name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="assigned_surveyor">Assigned Surveyor</Label>

              {/* IMPORTANT: SearchableSelect expects an array of option strings here. */}
              <SearchableSelect
                options={surveyors.map((s) => ({ label: s.name, value: s.id }))}
                value={watch("assigned_surveyor") || ""}
                placeholder="Select or search for surveyor..."
                searchPlaceholder="Type to search or add new surveyor..."
                onValueChange={(value) => setValue("assigned_surveyor", value)}
                allowClear={true}
                allowCreate={true}
                onCreateOption={handleCreateSurveyor}
                createOptionText="Add surveyor"
                className="w-full"
                disabled={surveyorsLoading || addSurveyorMutation.isPending}
              />

              {surveyorsLoading && (
                <p className="text-xs text-muted-foreground">Loading surveyors...</p>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setStep('select-policy');
                  setSelectedPolicyType("");
                  setSelectedMainType("");
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={createClaimMutation.isPending}
              >
                {createClaimMutation.isPending ? "Creating..." : "Create Claim"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
