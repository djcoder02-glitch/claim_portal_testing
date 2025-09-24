import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Search, Check, X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

// More flexible option type - can be string or object
export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
} | string;

interface SearchableSelectProps {
  options: SelectOption[];
  value?: string;
  placeholder?: string;
  onValueChange: (value: string) => void;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;           // Show clear button
  searchPlaceholder?: string;     // Custom search placeholder
  emptyMessage?: string;          // Message when no options found
  maxHeight?: string;            // Custom max height for dropdown
  required?: boolean;            // Mark as required field
  allowCreate?: boolean;         // Allow creating new options
  onCreateOption?: (newOption: string) => Promise<void>; // Callback to save new option
  createOptionText?: string;     // Text for create option button
  onOpenChange?: (open: boolean) => void; // Callback when dropdown opens/closes
}

export const SearchableSelect = ({
  options,
  value,
  placeholder = "Select option...",
  onValueChange,
  className,
  disabled = false,
  allowClear = true,
  searchPlaceholder = "Search...",
  emptyMessage = "No options found",
  maxHeight = "240px",
  required = false,
  allowCreate = false,
  onCreateOption,
  createOptionText = "Add new option",
  onOpenChange,
}: SearchableSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Helper function to get value and label from option
  const getOptionDetails = (option: SelectOption) => {
    if (typeof option === 'string') {
      return { value: option, label: option, disabled: false };
    }
    return { value: option.value, label: option.label, disabled: option.disabled || false };
  };

  // Filter options based on search term
  const filteredOptions = options.filter(option => {
    const { label, disabled } = getOptionDetails(option);
    if (disabled) return false; // Hide disabled options
    return label.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Check if search term exactly matches any existing option
  const exactMatch = options.some(option => {
    const { label } = getOptionDetails(option);
    return label.toLowerCase() === searchTerm.toLowerCase();
  });

  // Show create option when: allowCreate is true, searchTerm exists, no exact match, and not creating
  const showCreateOption = allowCreate && searchTerm.trim() && !exactMatch && !isCreating;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get the display label for current value
  const getSelectedLabel = () => {
    if (!value) return null;
    const selectedOption = options.find(option => {
      const { value: optionValue } = getOptionDetails(option);
      return optionValue === value;
    });
    return selectedOption ? getOptionDetails(selectedOption).label : value;
  };

  // Handle creating new option
  const handleCreateOption = async () => {
    if (!searchTerm.trim() || !onCreateOption || isCreating) return;
    
    setIsCreating(true);
    try {
      await onCreateOption(searchTerm.trim());
      // Select the newly created option
      onValueChange(searchTerm.trim());
      setIsOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
    } catch (error) {
      console.error('Failed to create option:', error);
      // You can add toast notification here if needed
    } finally {
      setIsCreating(false);
    }
  };

  // Handle selection
  const handleSelect = (option: SelectOption) => {
    const { value: optionValue } = getOptionDetails(option);
    onValueChange(optionValue);
    setIsOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
  };

  // Handle clear
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange("");
    setIsOpen(false);
    setSearchTerm("");
  };

  // Handle keyboard navigation (updated to include create option)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setIsOpen(true);
        setHighlightedIndex(0);
      }
      return;
    }

    const totalOptions = filteredOptions.length + (showCreateOption ? 1 : 0);

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < totalOptions - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : totalOptions - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (highlightedIndex === filteredOptions.length && showCreateOption) {
          // User pressed Enter on create option
          handleCreateOption();
        } else if (highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex]);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
        break;
    }
  };

  const toggleDropdown = () => {
    if (disabled) return;
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
    if (newOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  return (
    <div className={cn("relative", className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "ring-2 ring-ring ring-offset-2",
          required && !value && "border-destructive"
        )}
      >
        <span className={cn("truncate text-left", !value && "text-muted-foreground")}>
          {getSelectedLabel() || placeholder}
        </span>
        <div className="flex items-center space-x-1">
          {allowClear && value && !disabled && (
            <X 
              className="h-4 w-4 opacity-50 hover:opacity-100 transition-opacity" 
              onClick={handleClear}
            />
          )}
          <ChevronDown 
            className={cn("h-4 w-4 opacity-50 transition-transform", isOpen && "rotate-180")} 
          />
        </div>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
          {/* Search Input */}
          <div className="flex items-center border-b px-3 py-2">
            <Search className="h-4 w-4 opacity-50 mr-2" />
            <input
              ref={inputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Options List */}
          <div className="overflow-y-auto p-1" style={{ maxHeight }}>
            {filteredOptions.length === 0 && !showCreateOption ? (
              <div className="py-2 px-3 text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              <>
                {/* Existing Options */}
                {filteredOptions.map((option, index) => {
                  const { value: optionValue, label } = getOptionDetails(option);
                  const isSelected = value === optionValue;
                  const isHighlighted = index === highlightedIndex;
                  
                  return (
                    <button
                      key={optionValue}
                      type="button"
                      onClick={() => handleSelect(option)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm outline-none transition-colors text-left",
                        "hover:bg-accent hover:text-accent-foreground",
                        isHighlighted && "bg-accent text-accent-foreground",
                        isSelected && "bg-primary text-primary-foreground hover:bg-primary"
                      )}
                    >
                      <span className="truncate">{label}</span>
                      {isSelected && <Check className="h-4 w-4 flex-shrink-0 ml-2" />}
                    </button>
                  );
                })}

                {/* Create New Option Button */}
                {showCreateOption && (
                  <button
                    type="button"
                    onClick={handleCreateOption}
                    disabled={isCreating}
                    className={cn(
                      "flex w-full items-center justify-between rounded-sm px-3 py-2 text-sm outline-none transition-colors text-left",
                      "hover:bg-green-50 hover:text-green-700 border-t border-border mt-1",
                      highlightedIndex === filteredOptions.length && "bg-green-50 text-green-700",
                      isCreating && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">
                        {isCreating 
                          ? `Creating "${searchTerm}"...` 
                          : `${createOptionText}: "${searchTerm}"`
                        }
                      </span>
                    </div>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};