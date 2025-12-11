import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, Eye, X, FileText } from "lucide-react";
import { DocumentSelectorDialog } from "./DocumentSelectorDialog";

interface AssignedDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
}

interface DocumentRequirementSectionProps {
  label: string;
  description?: string;
  recommended?: boolean;
  assignedDocument?: AssignedDocument | null;
  claimId: string;
  onAssign: (document: AssignedDocument) => void;
  onRemove: () => void;
  onView: (url: string) => void;
}

export const DocumentRequirementSection = ({
  label,
  description,
  recommended,
  assignedDocument,
  claimId,
  onAssign,
  onRemove,
  onView,
}: DocumentRequirementSectionProps) => {
  const [selectorOpen, setSelectorOpen] = useState(false);

  return (
    <>
      <Card className="border-2">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{label}</CardTitle>
              {recommended && (
                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                  Recommended
                </Badge>
              )}
              {assignedDocument && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  PDF Required for Analysis
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectorOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Select the Documennt
            </Button>
          </div>
          {description && (
            <p className="text-xs text-gray-600 mt-1">{description}</p>
          )}
        </CardHeader>

        {assignedDocument && (
          <CardContent className="pt-0">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-red-100 text-red-700 rounded-lg">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" title={assignedDocument.file_name}>
                    {assignedDocument.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(assignedDocument.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onView(assignedDocument.file_path)}
                  className="hover:bg-blue-50 hover:text-blue-700"
                >
                  <Eye className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onRemove}
                  className="hover:bg-red-50 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        )}

        {!assignedDocument && (
          <CardContent className="pt-0">
            <div className="text-center py-4 border-2 border-dashed rounded-lg">
              <p className="text-sm text-gray-500">No file chosen</p>
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: PDF, DOC, DOCX, JPG, PNG, GIF (Max 10MB per file)
              </p>
            </div>
          </CardContent>
        )}
      </Card>
      <DocumentSelectorDialog
        open={selectorOpen}
        onOpenChange={setSelectorOpen}
        claimId={claimId}
        sectionLabel={label}
        onSelect={onAssign}
      />
    </>
  );
};
