import { useState, useEffect } from "react";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
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

const SortableSection = ({ section, onVisibilityChange, claim }: SortableSectionProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const renderSectionContent = () => {
    switch (section.name) {
      case 'Claim Overview':
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
                <Badge variant="outline">{claim.status.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date Created</p>
                <p className="font-medium">{format(new Date(claim.created_at), 'MMM dd, yyyy')}</p>
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

      case 'Policy Details':
        return (
          <div className="space-y-3">
            {Object.entries(claim.form_data || {}).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()).replace(/_/g, ' ')}:
                </span>
                <span className="font-medium">
                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value) || '-'}
                </span>
              </div>
            ))}
          </div>
        );

      case 'Financial Summary':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Claimed Amount</p>
                <p className="text-2xl font-bold">
                  {claim.claim_amount ? `$${claim.claim_amount.toLocaleString()}` : 'Not specified'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge 
                  variant={claim.status === 'approved' ? 'default' : 'secondary'}
                >
                  {claim.status.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        );

      case 'Timeline':
        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm">Claim created on {format(new Date(claim.created_at), 'MMM dd, yyyy')}</span>
              </div>
              {claim.updated_at !== claim.created_at && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full"></div>
                  <span className="text-sm">Last updated on {format(new Date(claim.updated_at), 'MMM dd, yyyy')}</span>
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
    <div
      ref={setNodeRef}
      style={style}
      className={`space-y-2 ${!section.isVisible ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-background"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <Label className="font-medium">{section.name}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            checked={section.isVisible}
            onCheckedChange={(checked) => onVisibilityChange(section.id, checked)}
          />
          {section.isVisible ? (
            <Eye className="w-4 h-4 text-muted-foreground" />
          ) : (
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>
      
      {section.isVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{section.name}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderSectionContent()}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

interface ReportPreviewProps {
  claim: Claim;
}

export const ReportPreview = ({ claim }: ReportPreviewProps) => {
  const [sections, setSections] = useState<ReportSection[]>([
    {
      id: "overview",
      name: "Claim Overview",
      content: {},
      isVisible: true,
      order: 1,
    },
    {
      id: "policy-details",
      name: "Policy Details",
      content: {},
      isVisible: true,
      order: 2,
    },
    {
      id: "financial",
      name: "Financial Summary",
      content: {},
      isVisible: true,
      order: 3,
    },
    {
      id: "timeline",
      name: "Timeline",
      content: {},
      isVisible: true,
      order: 4,
    },
  ]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSections((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        return newItems.map((item, index) => ({
          ...item,
          order: index + 1,
        }));
      });
    }
  };

  const handleVisibilityChange = (id: string, visible: boolean) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === id ? { ...section, isVisible: visible } : section
      )
    );
  };

  const handleGenerateReport = () => {
    // Here you could implement PDF generation or print functionality
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const visibleSections = sections.filter(s => s.isVisible);
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Claim Report - ${claim.claim_number}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; padding: 15px; border: 1px solid #ddd; }
              .section-title { font-size: 18px; font-weight: bold; margin-bottom: 10px; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
              .field { margin-bottom: 8px; }
              .label { font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Claim Report</h1>
              <p>Claim #${claim.claim_number} - Generated on ${format(new Date(), 'MMM dd, yyyy')}</p>
            </div>
            ${visibleSections.map(section => `
              <div class="section">
                <div class="section-title">${section.name}</div>
                <!-- Section content would be rendered here -->
              </div>
            `).join('')}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Report Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Report Layout Builder</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag sections to reorder them and toggle visibility
          </p>
        </CardHeader>
        <CardContent>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sections.map(s => s.id)} strategy={verticalListSortingStrategy}>
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
          
          <div className="mt-6 pt-4 border-t">
            <Button onClick={handleGenerateReport} className="w-full">
              Generate Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Live Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <p className="text-sm text-muted-foreground">
            Live preview of your report layout
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            <div className="border-b pb-4">
              <h2 className="text-xl font-bold">Claim Report</h2>
              <p className="text-sm text-muted-foreground">
                Claim #{claim.claim_number} - {claim.policy_types?.name}
              </p>
            </div>
            
            {sections
              .filter(section => section.isVisible)
              .sort((a, b) => a.order - b.order)
              .map((section) => (
                <div key={section.id} className="border-l-2 border-primary pl-4">
                  <h3 className="font-semibold mb-2">{section.name}</h3>
                  <div className="text-sm">
                    {/* Simplified preview content */}
                    <p className="text-muted-foreground">
                      {section.name} content will appear here in the final report.
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};