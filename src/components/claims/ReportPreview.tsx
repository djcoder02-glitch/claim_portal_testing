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

const API_BASE = "https://mlkkk63swrqairyiahlk357sui0argkn.lambda-url.ap-south-1.on.aws";

/* =========================
   Utilities
========================= */

const labelize = (k: string) =>
  k
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/_/g, " ");

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
  const style = { transform: CSS.Transform.toString(transform), transition };

  const renderSectionContent = (section: ReportSection) => {
    const formData = claim.form_data || {};
    const metas = (claim.form_data?.dynamic_sections_metadata as any[]) || [];

    // --- Static: Overview ---
    if (section.id === "overview") {
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
    }

    // --- Static: Policy Details ---
    if (section.id === "policy-details") {
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
      const rows = policyFields
        .map((k) => [k, (formData as any)[k]] as const)
        .filter(([_, v]) => v != null && String(v).trim() !== "");

      return rows.length ? (
        <div className="space-y-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between">
              <span className="text-muted-foreground capitalize">{labelize(k)}</span>
              <span className="font-medium">{String(v)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground italic">No policy details available</p>
      );
    }

    // --- Dynamic Sections ---
    const meta = metas.find((m) => m.id === section.id);
    if (!meta) {
      return <p className="text-muted-foreground italic">Section content not available</p>;
    }

    const entries =
      (meta.fields || [])
        .map((f: any) => ({ label: f.label || labelize(f.name), value: formData[f.name] }))
        .filter(({ value }) => value != null && String(value).trim() !== "");

    const imageKey = `${section.id}_images`;
    const imageUrls = Array.isArray(formData[imageKey]) ? formData[imageKey].filter(Boolean) : [];

    return (
      <div className="space-y-4">
        {entries.length ? (
          <div className="space-y-2">
            {entries.map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{String(value)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground italic">No data available for this section</p>
        )}

        {imageUrls.length > 0 && (
          <div className="grid grid-cols-2 gap-2 justify-center">
            {imageUrls.map((url: string, i: number) => (
              <img
                key={i}
                src={url}
                alt={`Section ${section.id} image ${i + 1}`}
                className="rounded-md object-contain w-[45%] max-h-[40vh] mx-auto"
              />
            ))}
          </div>
        )}

        {/* --- TABLES: Render dynamic tables from metadata --- */}
        {meta?.tables && meta.tables.length > 0 && (
          <div className="space-y-4 mt-4">
            <h4 className="text-sm font-semibold text-gray-700">Data Tables</h4>
            {meta.tables.map((table: any) => (
              <div key={table.id} className="border rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 font-medium">{table.name || "Unnamed Table"}</div>
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    {Array.isArray(table.data) && table.data.length > 0 ? (
                      table.data.map((row: any[], rowIndex: number) => (
                        <tr key={rowIndex} className="border-t">
                          {row.map((cell: any, colIndex: number) => (
                            <td key={colIndex} className="p-2 border-l">
                              {cell?.value ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2 text-muted-foreground italic">No data available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </div>
    );
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
          <CardContent>{renderSectionContent(section)}</CardContent>
        </Card>
      )}
    </div>
  );
};

/* =========================
   Dynamic Sections Builder
========================= */

const getDynamicSectionsFromClaim = (claim: Claim): ReportSection[] => {
  const formData = claim.form_data || {};
  const metadata = claim.form_data?.dynamic_sections_metadata as any[] | undefined;
  const sections: ReportSection[] = [];

  sections.push({
    id: "overview",
    name: "Claim Overview",
    content: {},
    isVisible: true,
    order: 1,
  });

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
  const hasPolicyData = Object.entries(formData).some(([k, v]) => policyFields.includes(k) && v);

  sections.push({
    id: "policy-details",
    name: "Policy Details",
    content: {},
    isVisible: hasPolicyData,
    order: 2,
  });

  if (metadata && metadata.length > 0) {
    const OFFSET = 2;
    metadata.forEach((meta, idx) => {
      const sectionId = meta.id;
      const imageKey = `${sectionId}_images`;
      const imageUrls = Array.isArray(formData[imageKey]) ? formData[imageKey].filter(Boolean) : [];

      const hasFieldData = (meta.fields || []).some((f: any) => {
        const v = formData[f.name];
        return v != null && String(v).trim() !== "";
      });

      const hasImages = imageUrls.length > 0;

      sections.push({
        id: sectionId,
        name: meta.name || sectionId,
        content: {},
        isVisible: hasFieldData || hasImages,
        order: (meta.order_index ?? idx + 1) + OFFSET,
      });
    });
  }

  return sections.sort((a, b) => a.order - b.order);
};

/* =========================
   buildReportJson (RESTORED)
========================= */

function buildReportJson(
  claim: Claim,
  sections: ReportSection[],
  groupedDocuments: Record<string, ClaimDocument[]>
) {
  const visibleSections = sections.filter((s) => s.isVisible).sort((a, b) => a.order - b.order);
  const components: any[] = [];

  components.push({
    type: "header",
    style: { wrapper: "px-0 py-2", title: "text-3xl font-extrabold tracking-wide text-black center" },
    props: { text: "SURVEY REPORT" },
  });

  for (const s of visibleSections) {
    components.push({ type: "subheader", props: { text: s.name } });

    const metas = (claim.form_data?.dynamic_sections_metadata as any[]) || [];
    const formData = claim.form_data || {};

    if (s.id === "overview") {
      components.push({
        type: "table",
        props: {
          headers: ["Field", "Value"],
          rows: [
            ["Claim Number", claim.claim_number],
            ["Policy Type", claim.policy_types?.name ?? "-"],
            ["Status", (claim.status || "").replace("_", " ")],
            ["Date Created", format(new Date(claim.created_at), "MMM dd, yyyy")],
          ],
        },
      });
      if (claim.description)
        components.push({ type: "para", props: { text: `Description: ${claim.description}` } });
      continue;
    }

    const meta = metas.find((m) => m.id === s.id);
    const pairs: [string, any][] = [];

    if (meta?.fields?.length) {
      meta.fields.forEach((f: any) => {
        const val = formData[f.name];
        if (val != null && String(val).trim() !== "") {
          pairs.push([f.label || labelize(f.name), val]);
        }
      });
    }

    if (pairs.length > 0) {
      components.push({
        type: "table",
        props: {
          headers: ["Field", "Value"],
          rows: pairs,
        },
      });
    }

    const imageKey = `${s.id}_images`;
    const urls = Array.isArray(formData[imageKey]) ? formData[imageKey].filter(Boolean) : [];
    if (urls.length > 0) {
      components.push({
        type: "image-grid",
        props: { title: "Images", rows: [urls.slice(0, 2), urls.slice(2, 4)] },
      });
    }

    if (meta?.tables?.length) {
      meta.tables.forEach((table: any) => {
        components.push({
          type: "table",
          props: {
            title: table.name || "Table",
            headers: [],
            rows: table.data?.map((r: any) => r.map((c: any) => c?.value ?? "")) || [],
          },
        });
      });
    }
  }

  if (Object.keys(groupedDocuments || {}).length > 0) {
    const rows: string[][] = [];
    Object.entries(groupedDocuments).forEach(([label, docs]) => {
      rows.push([`— ${label} —`, ""]);
      docs.forEach((d) => {
        rows.push([
          d.file_name,
          `${d.file_type} • ${formatFileSize(d.file_size)} • Uploaded ${format(
            new Date(d.created_at),
            "MMM dd, yyyy"
          )}`,
        ]);
      });
    });
    components.push({ type: "subheader", props: { text: "Supporting Documents" } });
    components.push({ type: "table", props: { headers: ["File", "Details"], rows } });
  }

  return {
    company: claim.policy_types?.name || "Insurance Company",
    reportName: `Claim Report - ${claim.claim_number}`,
    assets: {
      backgroundImage:
        "https://ik.imagekit.io/pritvik/Reports%20-%20generic%20bg.png",
    },
    components,
  };
}

/* =========================
   ReportPreview
========================= */

export const ReportPreview = ({ claim }: ReportPreviewProps) => {
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

  const groupedDocuments =
    documents?.reduce((acc, doc) => {
      const label = doc.field_label || "Uncategorized";
      if (!acc[label]) acc[label] = [];
      acc[label].push(doc);
      return acc;
    }, {} as Record<string, ClaimDocument[]>) || {};

  const [sections, setSections] = useState<ReportSection[]>(() => getDynamicSectionsFromClaim(claim));

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
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, isVisible: visible } : s)));
  };

  const handlePreview = async () => {
    const payload = buildReportJson(claim, sections, groupedDocuments);
    const res = await fetch(`${API_BASE}/render.pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("PDF API error:", err);
      throw new Error(err || "PDF failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
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
      console.error("PDF API error:", err);
      throw new Error(err || "PDF failed");
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "report.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Report Layout Builder</CardTitle>
          <p className="text-sm text-muted-foreground">Drag sections to reorder and toggle visibility</p>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
