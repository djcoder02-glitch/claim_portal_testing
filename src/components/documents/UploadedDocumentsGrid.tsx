import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash2, Calendar, User } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UploadedDocument {
  id: string;
  file_name: string;
  file_path: string;
  created_at: string;
  file_size: number;
  metadata?: {
    uploader_name?: string;
    upload_date?: string;
  };
  field_label?: string;
}

interface UploadedDocumentsGridProps {
  documents: UploadedDocument[];
  onDelete: (documentId: string) => void;
  onView: (documentUrl: string) => void;
}

export const UploadedDocumentsGrid = ({
  documents,
  onDelete,
  onView,
}: UploadedDocumentsGridProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<UploadedDocument | null>(null);

  const handleDeleteClick = (doc: UploadedDocument) => {
    setSelectedDoc(doc);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedDoc) {
      onDelete(selectedDoc.id);
      setDeleteDialogOpen(false);
      setSelectedDoc(null);
    }
  };

  const getUploaderName = (doc: UploadedDocument) => {
    return doc.metadata?.uploader_name || 
           doc.field_label?.replace('Uploaded by: ', '') || 
           'Unknown';
  };

  const getUploadDate = (doc: UploadedDocument) => {
    const dateStr = doc.metadata?.upload_date || doc.created_at;
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return 'Unknown';
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const colors: Record<string, string> = {
      pdf: 'bg-red-100 text-red-700',
      doc: 'bg-blue-100 text-blue-700',
      docx: 'bg-blue-100 text-blue-700',
      xls: 'bg-green-100 text-green-700',
      xlsx: 'bg-green-100 text-green-700',
      jpg: 'bg-purple-100 text-purple-700',
      jpeg: 'bg-purple-100 text-purple-700',
      png: 'bg-purple-100 text-purple-700',
    };
    return colors[ext || ''] || 'bg-gray-100 text-gray-700';
  };

  if (documents.length === 0) {
    return (
      <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed">
        <p className="text-gray-500 text-lg">No documents uploaded yet</p>
        <p className="text-gray-400 text-sm mt-2">Generate an upload link to receive documents</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {documents.map((doc) => (
          <Card
            key={doc.id}
            className="group hover:shadow-xl transition-all duration-200 border-2 hover:border-blue-400"
          >
            <CardContent className="p-5 space-y-4">
              {/* File Icon */}
              <div className={`w-full aspect-square rounded-xl flex items-center justify-center ${getFileIcon(doc.file_name)} transition-transform group-hover:scale-105`}>
                <span className="text-4xl font-bold">
                  {doc.file_name.split('.').pop()?.toUpperCase()}
                </span>
              </div>

              {/* File Info */}
              <div className="space-y-2">
                <p className="text-sm font-semibold truncate" title={doc.file_name}>
                  {doc.file_name}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {(doc.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <User className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate font-medium" title={getUploaderName(doc)}>
                    {getUploaderName(doc)}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="font-medium">{getUploadDate(doc)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                  onClick={() => onView(doc.file_path)}
                >
                  <Eye className="w-4 h-4 mr-1.5" />
                  View
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-300"
                  onClick={() => handleDeleteClick(doc)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "<span className="font-semibold">{selectedDoc?.file_name}</span>"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};