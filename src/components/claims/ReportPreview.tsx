import { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import { type Claim } from "@/hooks/useClaims";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/* =========================
   Types
========================= */

interface ReportSection {
  id: string;
  name: string;
  content: any;
  isVisible: boolean;
  order: number;
}

interface SortableSectionProps {
  section: ReportSection;
  onVisibilityChange: (id: string, visible: boolean) => void;
  claim: Claim;
}

interface ReportPreviewProps {
  claim: Claim;
}

interface ClaimDocument {
  id: string;
  claim_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  created_at: string;
  field_label?: string;
}

/* =========================
   Config
========================= */

const API_BASE = "https://reports-backend-d80q.onrender.com";
// const API_BASE = "http://localhost:5000";

/* =========================
   Utilities
========================= */

const labelize = (k: string) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ");

const getCustomLabel = (k: string, claim: Claim) => {
  const meta = (claim.form_data?.custom_fields_metadata as Array<{ name: string; label: string }>) || [];
  const found = meta.find((m) => m?.name === k);
  return found?.label || labelize(k);
};

const isReservedCustomKey = (k: string) => k === "custom_fields_metadata" || k === "hidden_fields";

const isHiddenCustomKey = (k: string, claim: Claim) => {
  const hidden = (claim.form_data?.hidden_fields as string[]) || [];
  return hidden.includes(k);
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const money = (v: any) => {
  const n = Number(v);
  if (!isFinite(n)) return v ?? "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
};

/* =========================
   SortableSection
========================= */

const SortableSection = ({ section, onVisibilityChange, claim }: SortableSectionProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderSectionContent = () => {
    switch (section.name) {
      case "Claim Overview":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Claim Number</p>
                <p className="font-medium">{claim.claim_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Policy Type</p>
                <p className="font-medium">{claim.policy_types?.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant="outline">{claim.status.replace("_", " ")}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Created</p>
                <p className="font-medium">{format(new Date(claim.created_at), "MMM dd, yyyy")}</p>
              </div>
            </div>
            {claim.description && (
              <div>
                <p className="text-sm text-muted-foreground">Description</p>
                <p>{claim.description}</p>
              </div>
            )}
          </div>
        );

      case "Policy Details": {
        const standardFields = [
          "registration_id",
          "insured_name",
          "insurer",
          "assigned_surveyor",
          "policy_number",
          "sum_insured",
          "date_of_loss",
          "loss_description",
        ];
        
        // Get both standard and custom fields for this section
        const allEntries = Object.entries(claim.form_data || {})
          .filter(([key, value]) => {
            // Include standard fields or custom fields (excluding reserved/hidden)
            const isStandardField = standardFields.includes(key);
            const isCustomField = key.startsWith('custom_') && !isReservedCustomKey(key) && !isHiddenCustomKey(key, claim);
            const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
            
            return (isStandardField || isCustomField) && hasValue;
          });

        return (
          <div className="space-y-3">
            {allEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">
                  {getCustomLabel(key, claim)}:
                </span>
                <span className="font-medium">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                </span>
              </div>
            ))}
            {allEntries.length === 0 && (
              <p className="text-muted-foreground italic">No policy details available</p>
            )}
          </div>
        );
      }

      case "Basic Information": {
        const basicInfoFields = [
          "consigner_name",
          "consignee_name",
          "applicant_survey",
          "underwriter_name",
          "cha_name",
          "certificate_no",
          "endorsement_no",
          "invoice_no",
          "invoice_date",
          "invoice_value",
          "invoice_pkg_count",
          "invoice_gross_wt",
          "invoice_net_wt",
        ];
        
        // Get both standard and custom fields for basic info section
        const allEntries = Object.entries(claim.form_data || {})
          .filter(([key, value]) => {
            const isStandardField = basicInfoFields.includes(key);
            const isCustomField = key.startsWith('custom_') && !isReservedCustomKey(key) && !isHiddenCustomKey(key, claim) && !key.includes('survey') && !key.includes('transport') && !key.includes('report');
            const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
            
            return (isStandardField || isCustomField) && hasValue;
          });

        return (
          <div className="space-y-3">
            {allEntries.map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">
                  {getCustomLabel(key, claim)}:
                </span>
                <span className="font-medium">
                  {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
                </span>
              </div>
            ))}
            {allEntries.length === 0 && (
              <p className="text-muted-foreground italic">No basic information available</p>
            )}
          </div>
        );
      }

      case "Survey & Loss Details": {
        const surveyFields = [
          "goods_description",
          "intimation_date",
          "survey_date_place",
          "external_condition_review",
          "packing_nature",
          "packing_condition",
          "damage_description",
          "loss_cause",
          "joint_survey",
          "consignee_notice",
        ];
        
        // Get both standard and custom fields for survey section
        const allEntries = Object.entries(claim.form_data || {})
          .filter(([key, value]) => {
            const isStandardField = surveyFields.includes(key);
            const isCustomField = key.startsWith('custom_') && !isReservedCustomKey(key) && !isHiddenCustomKey(key, claim) && (key.includes('survey') || key.includes('loss') || key.includes('damage'));
            const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
            
            return (isStandardField || isCustomField) && hasValue;
          });

        return (
          <div className="space-y-3">
            {allEntries.map(([key, value]) => {
              const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
              const isLongText = displayValue.length > 50;

              return (
                <div key={key} className={isLongText ? "space-y-1" : "flex justify-between"}>
                  <span className="text-muted-foreground capitalize font-medium">
                    {getCustomLabel(key, claim)}:
                  </span>
                  <span className={isLongText ? "text-sm mt-1 block" : "font-medium"}>{displayValue}</span>
                </div>
              );
            })}
            {allEntries.length === 0 && (
              <p className="text-muted-foreground italic">No survey details available</p>
            )}
          </div>
        );
      }

      case "Transportation Details": {
        const transportFields = [
          "transporter_name",
          "vehicle_number",
          "lr_date_issuance",
          "consignment_note",
          "delivery_challan",
          "dispatch_condition",
        ];
        
        // Get both standard and custom fields for transportation section
        const allEntries = Object.entries(claim.form_data || {})
          .filter(([key, value]) => {
            const isStandardField = transportFields.includes(key);
            const isCustomField = key.startsWith('custom_') && !isReservedCustomKey(key) && !isHiddenCustomKey(key, claim) && (key.includes('transport') || key.includes('vehicle') || key.includes('dispatch'));
            const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
            
            return (isStandardField || isCustomField) && hasValue;
          });

        return (
          <div className="space-y-3">
            {allEntries.map(([key, value]) => {
              const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
              const isLongText = displayValue.length > 50;

              return (
                <div key={key} className={isLongText ? "space-y-1" : "flex justify-between"}>
                  <span className="text-muted-foreground capitalize font-medium">
                    {labelize(key)}:
                  </span>
                  <span className={isLongText ? "text-sm mt-1 block" : "font-medium"}>{displayValue}</span>
                </div>
              );
            })}
            {allEntries.length === 0 && (
              <p className="text-muted-foreground italic">No transportation details available</p>
            )}
          </div>
        );
      }

      case "Report Text Section": {
        const reportFields = [
          "survey_address",
          "number_packages",
          "packing_contents",
          "content_industry_use",
          "arrival_details",
          "external_condition_tag",
        ];
        
        // Get both standard and custom fields for report section
        const allEntries = Object.entries(claim.form_data || {})
          .filter(([key, value]) => {
            const isStandardField = reportFields.includes(key);
            const isCustomField = key.startsWith('custom_') && !isReservedCustomKey(key) && !isHiddenCustomKey(key, claim) && (key.includes('report') || key.includes('text') || key.includes('address') || key.includes('content'));
            const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
            
            return (isStandardField || isCustomField) && hasValue;
          });

        return (
          <div className="space-y-3">
            {allEntries.map(([key, value]) => {
              const displayValue = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
              const isLongText = displayValue.length > 50;

              return (
                <div key={key} className={isLongText ? "space-y-1" : "flex justify-between"}>
                  <span className="text-muted-foreground capitalize font-medium">
                    {getCustomLabel(key, claim)}:
                  </span>
                  <span className={isLongText ? "text-sm mt-1 block" : "font-medium"}>{displayValue}</span>
                </div>
              );
            })}
            {allEntries.length === 0 && (
              <p className="text-muted-foreground italic">No report text available</p>
            )}
          </div>
        );
      }


      case "Financial Summary":
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Claimed Amount</p>
                <p className="text-2xl font-bold">
                  {claim.claim_amount ? `${money(claim.claim_amount)}` : "Not specified"}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={claim.status === "approved" ? "default" : "secondary"}>
                  {claim.status.replace("_", " ").toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        );

      case "Timeline":
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full" />
                <span className="text-sm">Claim created on {format(new Date(claim.created_at), "MMM dd, yyyy")}</span>
              </div>
              {claim.updated_at !== claim.created_at && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full" />
                  <span className="text-sm">Last updated on {format(new Date(claim.updated_at), "MMM dd, yyyy")}</span>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return <p className="text-muted-foreground">Section content not available</p>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={`space-y-2 ${!section.isVisible ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <div {...attributes} {...listeners} className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-background">
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <Label className="font-medium">{section.name}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch checked={section.isVisible} onCheckedChange={(checked) => onVisibilityChange(section.id, checked)} />
          {section.isVisible ? <Eye className="w-4 h-4 text-muted-foreground" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {section.isVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{section.name}</CardTitle>
          </CardHeader>
          <CardContent>{renderSectionContent()}</CardContent>
        </Card>
      )}
    </div>
  );
};

/* =========================
   Data Checking Helpers
========================= */

const sectionHasData = (sectionName: string, claim: Claim): boolean => {
  const formData = claim.form_data || {};
  
  switch (sectionName) {
    case "Claim Overview":
      // Always show overview since it contains basic claim info
      return true;
      
    case "Policy Details": {
      const standardFields = [
        "registration_id", "insured_name", "insurer", "assigned_surveyor",
        "policy_number", "sum_insured", "date_of_loss", "loss_description",
      ];
      
      return Object.entries(formData).some(([key, value]) => {
        const isStandardField = standardFields.includes(key);
        const isCustomField = key.startsWith('custom_');
        const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
        return (isStandardField || isCustomField) && hasValue;
      });
    }
    
    case "Basic Information": {
      const basicInfoFields = [
        "consigner_name", "consignee_name", "applicant_survey", "underwriter_name",
        "cha_name", "certificate_no", "endorsement_no", "invoice_no", "invoice_date",
        "invoice_value", "invoice_pkg_count", "invoice_gross_wt", "invoice_net_wt",
      ];
      
      return Object.entries(formData).some(([key, value]) => {
        const isStandardField = basicInfoFields.includes(key);
        const isCustomField = key.startsWith('custom_') && !key.includes('survey') && !key.includes('transport') && !key.includes('report');
        const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
        return (isStandardField || isCustomField) && hasValue;
      });
    }
    
    case "Survey & Loss Details": {
      const surveyFields = [
        "goods_description", "intimation_date", "survey_date_place", "external_condition_review",
        "packing_nature", "packing_condition", "damage_description", "loss_cause",
        "joint_survey", "consignee_notice",
      ];
      
      return Object.entries(formData).some(([key, value]) => {
        const isStandardField = surveyFields.includes(key);
        const isCustomField = key.startsWith('custom_') && (key.includes('survey') || key.includes('loss') || key.includes('damage'));
        const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
        return (isStandardField || isCustomField) && hasValue;
      });
    }
    
    case "Transportation Details": {
      const transportFields = [
        "transporter_name", "vehicle_number", "lr_date_issuance", "consignment_note",
        "delivery_challan", "dispatch_condition",
      ];
      
      return Object.entries(formData).some(([key, value]) => {
        const isStandardField = transportFields.includes(key);
        const isCustomField = key.startsWith('custom_') && (key.includes('transport') || key.includes('vehicle') || key.includes('dispatch'));
        const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
        return (isStandardField || isCustomField) && hasValue;
      });
    }
    
    case "Report Text Section": {
      const reportFields = [
        "survey_address", "number_packages", "packing_contents", "content_industry_use",
        "arrival_details", "external_condition_tag",
      ];
      
      return Object.entries(formData).some(([key, value]) => {
        const isStandardField = reportFields.includes(key);
        const isCustomField = key.startsWith('custom_') && (key.includes('report') || key.includes('text') || key.includes('address') || key.includes('content'));
        const hasValue = value !== null && value !== undefined && value !== "" && String(value).trim() !== "";
        return (isStandardField || isCustomField) && hasValue;
      });
    }
    
    case "Financial Summary":
      // Show if there's a claim amount or always show for financial summary
      return claim.claim_amount !== null && claim.claim_amount !== undefined;
      
    case "Timeline":
      // Always show timeline since it contains creation/update info
      return true;
      
    default:
      return false;
  }
};

const getInitialSections = (claim: Claim): ReportSection[] => [
  { id: "overview", name: "Claim Overview", content: {}, isVisible: sectionHasData("Claim Overview", claim), order: 1 },
  { id: "policy-details", name: "Policy Details", content: {}, isVisible: sectionHasData("Policy Details", claim), order: 2 },
  { id: "basic-information", name: "Basic Information", content: {}, isVisible: sectionHasData("Basic Information", claim), order: 3 },
  { id: "survey-loss-details", name: "Survey & Loss Details", content: {}, isVisible: sectionHasData("Survey & Loss Details", claim), order: 4 },
  { id: "transportation-details", name: "Transportation Details", content: {}, isVisible: sectionHasData("Transportation Details", claim), order: 5 },
  { id: "report-text-section", name: "Report Text Section", content: {}, isVisible: sectionHasData("Report Text Section", claim), order: 6 },
  { id: "financial", name: "Financial Summary", content: {}, isVisible: sectionHasData("Financial Summary", claim), order: 7 },
  { id: "timeline", name: "Timeline", content: {}, isVisible: sectionHasData("Timeline", claim), order: 8 },
];

/* =========================
   Default Sections
========================= */

const defaultSections: ReportSection[] = [
  { id: "overview", name: "Claim Overview", content: {}, isVisible: true, order: 1 },
  { id: "policy-details", name: "Policy Details", content: {}, isVisible: true, order: 2 },
  { id: "basic-information", name: "Basic Information", content: {}, isVisible: true, order: 3 },
  { id: "survey-loss-details", name: "Survey & Loss Details", content: {}, isVisible: true, order: 4 },
  { id: "transportation-details", name: "Transportation Details", content: {}, isVisible: true, order: 5 },
  { id: "report-text-section", name: "Report Text Section", content: {}, isVisible: true, order: 6 },
  { id: "financial", name: "Financial Summary", content: {}, isVisible: true, order: 7 },
  { id: "timeline", name: "Timeline", content: {}, isVisible: true, order: 8 },
];

/* =========================
   JSON Builders for Backend
========================= */

type Components = Array<{ type: string; props: any; style?: Record<string, string> }>;

const kvTableComponent = (title: string, pairs: Array<[string, any]>) => ({
  type: "table",
  props: {
    title,
    headers: ["Field", "Value"],
    rows: pairs
      .filter(([_, v]) => v !== undefined && v !== null && `${v}`.trim?.() !== "")
      .map(([k, v]) => [labelize(k), typeof v === "boolean" ? (v ? "Yes" : "No") : String(v)]),
  },
});

const paraComponent = (text: string, wrapperClass?: string) => ({
  type: "para",
  props: { text },
  ...(wrapperClass ? { style: { wrapper: wrapperClass } } : {}),
});

const subheaderComponent = (text: string) => ({ type: "subheader", props: { text } });

const financialTableComponent = (claim: Claim) => ({
  type: "table",
  props: {
    title: "",
    headers: ["Description", "Amount"],
    rows: [
      ["Claimed Amount", claim.claim_amount ? money(claim.claim_amount) : "Not specified"],
      ["Status", (claim.status || "").replace("_", " ").toUpperCase()],
    ],
  },
});

const documentsTableComponent = (grouped: Record<string, ClaimDocument[]>) => {
  const rows: Array<Array<string>> = [];
  Object.entries(grouped).forEach(([category, docs]) => {
    rows.push([`— ${category} —`, ""]);
    docs.forEach((d) => {
      rows.push([
        d.file_name,
        `${d.file_type} • ${formatFileSize(d.file_size)} • Uploaded ${format(new Date(d.created_at), "MMM dd, yyyy")}`,
      ]);
    });
  });
  return {
    type: "table",
    props: {
      title: "Supporting Documents",
      headers: ["File", "Details"],
      rows,
      notes: rows.length ? undefined : "No documents uploaded.",
    },
  };
};

function buildReportJson(
  claim: Claim,
  sections: ReportSection[],
  groupedDocuments: Record<string, ClaimDocument[]>
) {
  const visibleSections = sections.filter((s) => s.isVisible).sort((a, b) => a.order - b.order);

  const policyFields = [
    "registration_id",
    "insured_name",
    "insurer",
    "assigned_surveyor",
    "policy_number",
    "sum_insured",
    "date_of_loss",
    "loss_description",
  ];

  const basicInfoFields = [
    "consigner_name",
    "consignee_name",
    "applicant_survey",
    "underwriter_name",
    "cha_name",
    "certificate_no",
    "endorsement_no",
    "invoice_no",
    "invoice_date",
    "invoice_value",
    "invoice_pkg_count",
    "invoice_gross_wt",
    "invoice_net_wt",
  ];

  const surveyFields = [
    "goods_description",
    "intimation_date",
    "survey_date_place",
    "external_condition_review",
    "packing_nature",
    "packing_condition",
    "damage_description",
    "loss_cause",
    "joint_survey",
    "consignee_notice",
  ];

  const transportFields = [
    "transporter_name",
    "vehicle_number",
    "lr_date_issuance",
    "consignment_note",
    "delivery_challan",
    "dispatch_condition",
  ];

  const reportFields = [
    "survey_address",
    "number_packages",
    "packing_contents",
    "content_industry_use",
    "arrival_details",
    "external_condition_tag",
  ];

  const components: Components = [];

  // Intro
  components.push({ type: "header", props: { text: "Claim Report" } });
  components.push(
    paraComponent(
      `Claim #${claim.claim_number} • ${claim.policy_types?.name ?? "Policy"} • Created ${format(
        new Date(claim.created_at),
        "MMM dd, yyyy"
      )}`,
      "text-sm text-slate-600"
    )
  );

  for (const s of visibleSections) {
    switch (s.name) {
      case "Claim Overview": {
        components.push(subheaderComponent("Claim Overview"));
        components.push(
          kvTableComponent("", [
            ["claim_number", claim.claim_number],
            ["policy_type", claim.policy_types?.name ?? "-"],
            ["status", (claim.status || "").replace("_", " ")],
            ["date_created", format(new Date(claim.created_at), "MMM dd, yyyy")],
          ])
        );
        if (claim.description) components.push(paraComponent(`Description: ${claim.description}`));
        break;
      }
      case "Policy Details": {
        components.push(subheaderComponent("Policy Details"));
        const pairs = claim.form_data || {};
        components.push(kvTableComponent("", policyFields.map((k) => [k, (pairs as any)[k]])));
        break;
      }
      case "Basic Information": {
        components.push(subheaderComponent("Basic Information"));
        const pairs = claim.form_data || {};
        components.push(kvTableComponent("", basicInfoFields.map((k) => [k, (pairs as any)[k]])));
        break;
      }
      case "Survey & Loss Details": {
        components.push(subheaderComponent("Survey & Loss Details"));
        const pairs = claim.form_data || {};

        const longKeys = surveyFields.filter((k) => String((pairs as any)[k] ?? "").length > 80);
        const shortKeys = surveyFields.filter((k) => !longKeys.includes(k));

        if (shortKeys.length) {
          components.push(kvTableComponent("", shortKeys.map((k) => [k, (pairs as any)[k]])));
        }
        longKeys.forEach((k) => {
          const v = (pairs as any)[k];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            components.push(paraComponent(`${labelize(k)}: ${String(v)}`));
          }
        });
        break;
      }
      case "Transportation Details": {
        components.push(subheaderComponent("Transportation Details"));
        const pairs = claim.form_data || {};
        components.push(kvTableComponent("", transportFields.map((k) => [k, (pairs as any)[k]])));
        break;
      }
      case "Report Text Section": {
        components.push(subheaderComponent("Report Text Section"));
        const pairs = claim.form_data || {};

        const longKeys = reportFields.filter((k) => String((pairs as any)[k] ?? "").length > 80);
        const shortKeys = reportFields.filter((k) => !longKeys.includes(k));

        if (shortKeys.length) {
          components.push(kvTableComponent("", shortKeys.map((k) => [k, (pairs as any)[k]])));
        }
        longKeys.forEach((k) => {
          const v = (pairs as any)[k];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            components.push(paraComponent(`${labelize(k)}: ${String(v)}`));
          }
        });
        break;
      }
      case "Financial Summary": {
        components.push(subheaderComponent("Financial Summary"));
        components.push(financialTableComponent(claim));
        break;
      }
      case "Timeline": {
        components.push(subheaderComponent("Timeline"));
        const rows = [
          ["Created", format(new Date(claim.created_at), "MMM dd, yyyy")],
          ...(claim.updated_at && claim.updated_at !== claim.created_at
            ? [["Last updated", format(new Date(claim.updated_at), "MMM dd, yyyy")]]
            : []),
        ];
        components.push({ type: "table", props: { title: "", headers: ["Event", "When"], rows } });
        break;
      }
      default: {
        components.push(subheaderComponent(s.name));
        components.push(paraComponent("Section content not available."));
        break;
      }
    }
  }

  // Documents (optional)
  const hasDocs = Object.keys(groupedDocuments || {}).length > 0;
  if (hasDocs) {
    components.push(subheaderComponent("Supporting Documents"));
    components.push(documentsTableComponent(groupedDocuments));
  }

  return {
    company: claim.policy_types?.name || "Insurance Company",
    reportName: `Claim Report - ${claim.claim_number}`,
    colors: {
      primary: "#0F172A",
      accent: "#2563EB",
      text: "#111827",
      muted: "#6B7280",
      border: "#E5E7EB",
    },
    "assets": {
  "logo": "https://dummyimage.com/120x60/2563eb/ffffff.png&text=LOGO",
  "headerImage": "https://dummyimage.com/600x80/0f172a/ffffff.png&text=Header",
  "footerImage": "https://dummyimage.com/600x40/2563eb/ffffff.png&text=Footer"
},
    configs: {
      page: { size: "A4", orientation: "portrait", margin: "18mm" },
      font: { family: "Inter, ui-sans-serif", base: "text-[11pt]", leading: "leading-relaxed" },
      header: { visible: true, align: "center", repeat: "all" },
      footer: { visible: true, align: "center", text: "Page {{page}} of {{pages}}" },
      date: { align: "right", format: "DD MMM YYYY" },
      table: { border: "border border-slate-700", striped: true, compact: true },
    },
    components,
  };
}

/* =========================
   ReportPreview (Main)
========================= */

export const ReportPreview = ({ claim }: ReportPreviewProps) => {
  // Documents
  const { data: documents } = useQuery({
    queryKey: ["claim-documents", claim.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claim_documents")
        .select("*")
        .eq("claim_id", claim.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ClaimDocument[];
    },
  });

  // Group documents by field_label
  const groupedDocuments =
    documents?.reduce((acc, doc) => {
      const label = doc.field_label || "Uncategorized";
      if (!acc[label]) acc[label] = [];
      acc[label].push(doc);
      return acc;
    }, {} as Record<string, ClaimDocument[]>) || {};

  // Sections state - initialize with data-based visibility
  const [sections, setSections] = useState<ReportSection[]>(() => getInitialSections(claim));

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({ ...item, order: index + 1 }));
      });
    }
  };

  const handleVisibilityChange = (id: string, visible: boolean) => {
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, isVisible: visible } : section)));
  };

  // Preview + Download + Reset
  const [previewHtml, setPreviewHtml] = useState<string>("");

  const handlePreview = async () => {
    const payload = buildReportJson(claim, sections, groupedDocuments);
    console.log("Preview payload:", JSON.stringify(payload));
    const res = await fetch(`${API_BASE}/render`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "Render failed");
    }
    const html = await res.text();
    setPreviewHtml(html);
  };

  const handleDownload = async () => {
    const payload = buildReportJson(claim, sections, groupedDocuments);
    const res = await fetch(`${API_BASE}/render.pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || "PDF failed");
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ClaimReport-${claim.claim_number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetOrder = () => {
    setSections(defaultSections);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Report Layout Builder</CardTitle>
          <p className="text-sm text-muted-foreground">Drag sections to reorder them and toggle visibility</p>
        </CardHeader>
        <CardContent>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {sections.map((section) => (
                  <SortableSection
                    key={section.id}
                    section={section}
                    onVisibilityChange={handleVisibilityChange}
                    claim={claim}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <div className="mt-6 pt-4 border-t grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="secondary" onClick={handlePreview}>
              Preview
            </Button>
            <Button onClick={handleDownload}>Download PDF</Button>
            <Button variant="outline" onClick={handleResetOrder}>
              Reset Order
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <p className="text-sm text-muted-foreground">Preview rendered by the backend /render endpoint</p>
        </CardHeader>
        <CardContent>
          {previewHtml ? (
            <iframe srcDoc={previewHtml} className="w-full h-[600px] border rounded" title="Report Preview" />
          ) : (
            <div className="text-sm text-muted-foreground">
              Click <b>Preview</b> to load the server-rendered HTML here.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
