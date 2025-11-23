import React, { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface TableCell {
  value: string;
}

interface EditableTableProps {
  tableId: string;
  tableName: string;
  data: TableCell[][];
  sectionName: string;
  onUpdate: (newData: TableCell[][]) => void;
  onDelete: () => void;
  onNameChange: (newName: string) => void;
}

interface Section {
  id: string;
  name: string;
}

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (sectionId: string, rows: number, cols: number, name: string) => void;
  preSelectedSectionId?: string;  // Make section selection optional
  sections: { id: string; name: string }[];
}


// ============================================================================
// CONSTANTS
// ============================================================================

const TABLE_LIMITS = {
  MIN_ROWS: 1,
  MAX_ROWS: 20,
  MIN_COLS: 1,
  MAX_COLS: 10,
  DEFAULT_ROWS: 5,
  DEFAULT_COLS: 3,
} as const;

const COLUMN_CONFIG = {
  MIN_WIDTH: '120px',
  INDEX_WIDTH: '60px',
  ACTION_WIDTH: '48px',
} as const;

// ============================================================================
// EDITABLE TABLE COMPONENT
// ============================================================================

export const EditableTable: React.FC<EditableTableProps> = ({
  tableId,
  tableName,
  data,
  sectionName,
  onUpdate,
  onDelete,
  onNameChange,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(tableName);

  const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, ri) =>
      ri === rowIndex
        ? row.map((cell, ci) => (ci === colIndex ? { value } : cell))
        : row
    );
    onUpdate(newData);
  }, [data, onUpdate]);

  const addRow = useCallback(() => {
    if (data.length >= TABLE_LIMITS.MAX_ROWS) return;
    const newRow = Array(data[0].length).fill(null).map(() => ({ value: '' }));
    onUpdate([...data, newRow]);
  }, [data, onUpdate]);

  const addColumn = useCallback(() => {
    if (data[0].length >= TABLE_LIMITS.MAX_COLS) return;
    const newData = data.map(row => [...row, { value: '' }]);
    onUpdate(newData);
  }, [data, onUpdate]);

  const deleteRow = useCallback((index: number) => {
    if (data.length <= TABLE_LIMITS.MIN_ROWS) return;
    onUpdate(data.filter((_, i) => i !== index));
  }, [data, onUpdate]);

  const deleteColumn = useCallback((index: number) => {
    if (data[0].length <= TABLE_LIMITS.MIN_COLS) return;
    onUpdate(data.map(row => row.filter((_, i) => i !== index)));
  }, [data, onUpdate]);

  const generateColumnLabel = (index: number): string => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  const saveName = useCallback(() => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
      setIsEditingName(false);
    }
  }, [tempName, onNameChange]);

  const isAtRowLimit = data.length >= TABLE_LIMITS.MAX_ROWS;
  const isAtColLimit = data[0]?.length >= TABLE_LIMITS.MAX_COLS;

  return (
    <div className="border-2 border-slate-200 rounded-lg bg-white shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Grid className="w-5 h-5 text-slate-600" />
          
          {isEditingName ? (
            <div className="flex items-center gap-2">
              <Input
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName();
                  if (e.key === 'Escape') {
                    setTempName(tableName);
                    setIsEditingName(false);
                  }
                }}
                className="text-base font-semibold w-64"
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={saveName}
                className="h-8 w-8 p-0"
              >
                ✓
              </Button>
            </div>
          ) : (
            <button
              className="text-base font-semibold text-slate-800 hover:text-slate-600 transition-colors"
              onClick={() => setIsEditingName(true)}
            >
              {tableName}
            </button>
          )}

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded font-medium">
              {data.length} × {data[0]?.length}
            </span>
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded">
              {sectionName}
            </span>
          </div>
        </div>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          className="flex items-center gap-1.5"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100">
              <th 
                className="border border-slate-300 p-2 bg-slate-200 sticky left-0 z-20 text-sm font-semibold"
                style={{ width: COLUMN_CONFIG.INDEX_WIDTH }}
              >
                #
              </th>
              {data[0]?.map((_, colIndex) => (
                <th 
                  key={colIndex}
                  className="border border-slate-300 p-2 bg-slate-100 relative group"
                  style={{ minWidth: COLUMN_CONFIG.MIN_WIDTH }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-sm">
                      {generateColumnLabel(colIndex)}
                    </span>
                    {data[0].length > TABLE_LIMITS.MIN_COLS && (
                      <button
                        type="button"
                        onClick={() => deleteColumn(colIndex)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-all rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </th>
              ))}
              <th 
                className="border border-slate-300 p-2 bg-slate-100"
                style={{ width: COLUMN_CONFIG.ACTION_WIDTH }}
              >
                <button
                  type="button"
                  onClick={addColumn}
                  disabled={isAtColLimit}
                  className={cn(
                    "p-1 rounded transition-colors",
                    isAtColLimit 
                      ? "text-slate-300 cursor-not-allowed" 
                      : "text-green-600 hover:text-green-700 hover:bg-green-50"
                  )}
                  title={isAtColLimit ? `Max ${TABLE_LIMITS.MAX_COLS} columns` : "Add column"}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="group hover:bg-slate-50">
                <td className="border border-slate-300 p-2 bg-slate-50 text-center font-semibold text-sm sticky left-0 z-10">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">{rowIndex + 1}</span>
                    {data.length > TABLE_LIMITS.MIN_ROWS && (
                      <button
                        type="button"
                        onClick={() => deleteRow(rowIndex)}
                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 transition-all rounded hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-slate-300 p-0">
                    <input
                      type="text"
                      value={cell.value || ''}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full h-full px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 focus:bg-slate-50 bg-transparent"
                    />
                  </td>
                ))}
                <td className="border border-slate-300 bg-slate-50"></td>
              </tr>
            ))}
            <tr>
              <td 
                colSpan={(data[0]?.length || 0) + 2}
                className="border border-slate-300 p-2 bg-slate-50 text-center"
              >
                <button
                  type="button"
                  onClick={addRow}
                  disabled={isAtRowLimit}
                  className={cn(
                    "p-1.5 flex items-center gap-1.5 mx-auto text-sm rounded transition-colors",
                    isAtRowLimit
                      ? "text-slate-300 cursor-not-allowed"
                      : "text-green-600 hover:text-green-700 hover:bg-green-50"
                  )}
                >
                  <Plus className="w-4 h-4" />
                  {isAtRowLimit ? `Max ${TABLE_LIMITS.MAX_ROWS} rows` : 'Add Row'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
    </div>
  );
};

// ============================================================================
// TABLE MODAL COMPONENT
// ============================================================================
export const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  onCreateTable,
  preSelectedSectionId,
  sections,
}) => {
  const [selectedSection, setSelectedSection] = useState(preSelectedSectionId || '');
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [tableName, setTableName] = useState('');

  useEffect(() => {
    if (preSelectedSectionId) {
      setSelectedSection(preSelectedSectionId);
    }
  }, [preSelectedSectionId]);

  const handleCreate = () => {
    if (!selectedSection || !tableName.trim()) {
      toast.error('Please fill in all fields');
      return;
    }
    onCreateTable(selectedSection, rows, cols, tableName);
    setTableName('');
    setRows(5);
    setCols(5);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Only show section selector if no pre-selected section */}
          {!preSelectedSectionId && (
            <div>
              <Label>Section</Label>
              <Select value={selectedSection} onValueChange={setSelectedSection}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
                </SelectTrigger>
                <SelectContent>
                  {sections.map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          <div>
            <Label>Table Name</Label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter table name"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Rows</Label>
              <Input
                type="number"
                min="1"
                max="50"
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
              />
            </div>
            <div>
              <Label>Columns</Label>
              <Input
                type="number"
                min="1"
                max="26"
                value={cols}
                onChange={(e) => setCols(Number(e.target.value))}
              />
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleCreate}>Create Table</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export { TABLE_LIMITS };