import React, { useState } from 'react';
import { Plus, Trash2, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Table Data Cell Interface
interface TableCell {
  value: string;
}

// Editable Spreadsheet Component
interface EditableTableProps {
  tableId: string;
  tableName: string;
  data: TableCell[][];
  onUpdate: (newData: TableCell[][]) => void;
  onDelete: () => void;
  onNameChange: (newName: string) => void;
}

export const EditableTable: React.FC<EditableTableProps> = ({
  tableId,
  tableName,
  data,
  onUpdate,
  onDelete,
  onNameChange,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(tableName);

  const updateCell = (rowIndex: number, colIndex: number, value: string) => {
    const newData = data.map((row, ri) =>
      ri === rowIndex
        ? row.map((cell, ci) => (ci === colIndex ? { value } : cell))
        : row
    );
    onUpdate(newData);
  };

  const addRow = () => {
    const newRow = Array(data[0].length).fill(null).map(() => ({ value: '' }));
    onUpdate([...data, newRow]);
  };

  const addColumn = () => {
    const newData = data.map(row => [...row, { value: '' }]);
    onUpdate(newData);
  };

  const deleteRow = (index: number) => {
    if (data.length > 1) {
      onUpdate(data.filter((_, i) => i !== index));
    }
  };

  const deleteColumn = (index: number) => {
    if (data[0].length > 1) {
      onUpdate(data.map(row => row.filter((_, i) => i !== index)));
    }
  };

  const generateColumnLabel = (index: number) => {
    let label = '';
    let num = index;
    while (num >= 0) {
      label = String.fromCharCode(65 + (num % 26)) + label;
      num = Math.floor(num / 26) - 1;
    }
    return label;
  };

  const saveName = () => {
    if (tempName.trim()) {
      onNameChange(tempName.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="border-2 border-indigo-200 rounded-lg p-4 bg-white shadow-sm mb-4">
      {/* Table Header with Name */}
      <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Grid className="w-5 h-5 text-indigo-600" />
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
                className="text-base font-medium w-64"
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
            <h4 
              className="text-base font-semibold cursor-pointer hover:text-indigo-600"
              onClick={() => setIsEditingName(true)}
            >
              {tableName}
            </h4>
          )}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {data.length} × {data[0]?.length}
          </span>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={onDelete}
            className="flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Delete Table
          </Button>
        </div>
      </div>

      {/* Spreadsheet */}
      <div className="overflow-auto border border-gray-300 rounded">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-2 w-12 bg-gray-200 sticky left-0 z-10 text-sm font-semibold">
                #
              </th>
              {data[0]?.map((_, colIndex) => (
                <th key={colIndex} className="border border-gray-300 p-2 min-w-[120px] bg-gray-100 relative group">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700 text-sm">
                      {generateColumnLabel(colIndex)}
                    </span>
                    <button
                      type="button"
                      onClick={() => deleteColumn(colIndex)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 transition-opacity"
                      title="Delete column"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </th>
              ))}
              <th className="border border-gray-300 p-2 w-12 bg-gray-100">
                <button
                  type="button"
                  onClick={addColumn}
                  className="text-green-600 hover:text-green-700 p-1"
                  title="Add column"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rowIndex} className="group">
                <td className="border border-gray-300 p-2 bg-gray-50 text-center font-semibold text-sm sticky left-0 z-10">
                  <div className="flex items-center justify-between">
                    <span>{rowIndex + 1}</span>
                    <button
                      type="button"
                      onClick={() => deleteRow(rowIndex)}
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 transition-opacity"
                      title="Delete row"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                {row.map((cell, colIndex) => (
                  <td key={colIndex} className="border border-gray-300 p-0">
                    <input
                      type="text"
                      value={cell.value || ''}
                      onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                      className="w-full h-full p-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-transparent"
                      placeholder=""
                    />
                  </td>
                ))}
                <td className="border border-gray-300 p-2 w-12 bg-gray-50"></td>
              </tr>
            ))}
            <tr>
              <td colSpan={(data[0]?.length || 0) + 2} className="border border-gray-300 p-2 bg-gray-50 text-center">
                <button
                  type="button"
                  onClick={addRow}
                  className="text-green-600 hover:text-green-700 p-1 flex items-center gap-1 mx-auto text-sm"
                  title="Add row"
                >
                  <Plus className="w-4 h-4" />
                  Add Row
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Table Creation Modal with Section Selector
interface Section {
  id: string;
  name: string;
}

interface TableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTable: (sectionId: string, rows: number, cols: number, name: string) => void;
  sections: Section[];
}

export const TableModal: React.FC<TableModalProps> = ({
  isOpen,
  onClose,
  onCreateTable,
  sections,
}) => {
  const [rows, setRows] = useState(5);
  const [cols, setCols] = useState(5);
  const [tableName, setTableName] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('');

  const handleCreate = () => {
    if (!selectedSection) {
      return; // Button will be disabled anyway
    }
    const name = tableName.trim() || `Table ${Date.now()}`;
    onCreateTable(selectedSection, rows, cols, name);
    // Reset form
    setRows(5);
    setCols(5);
    setTableName('');
    setSelectedSection('');
  };

  const handleClose = () => {
    setRows(5);
    setCols(5);
    setTableName('');
    setSelectedSection('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Grid className="w-6 h-6 text-indigo-600" />
            <DialogTitle>Create New Table</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <Label htmlFor="table-section" className="text-sm font-medium">
              Add to Section *
            </Label>
            <Select value={selectedSection} onValueChange={setSelectedSection}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select a section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="table-name" className="text-sm font-medium">
              Table Name *
            </Label>
            <Input
              id="table-name"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="Enter table name (e.g., 'Damage Assessment')"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="table-rows" className="text-sm font-medium">
              Number of Rows
            </Label>
            <Input
              id="table-rows"
              type="number"
              min="1"
              max="50"
              value={rows}
              onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="table-cols" className="text-sm font-medium">
              Number of Columns
            </Label>
            <Input
              id="table-cols"
              type="number"
              min="1"
              max="26"
              value={cols}
              onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))}
              className="mt-1.5"
            />
          </div>

          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
            <p className="text-sm text-indigo-800">
              <strong>Table size:</strong> {rows} rows × {cols} columns
              <br />
              <span className="text-xs text-indigo-600">
                Total cells: {rows * cols}
              </span>
            </p>
          </div>

          <div className="flex gap-2 justify-end mt-6 pt-4 border-t">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={!tableName.trim() || !selectedSection}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Table
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};