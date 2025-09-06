import { useEffect, useRef } from 'react';
import { useWatch } from 'react-hook-form';
import { toast } from 'sonner';

interface UseAutosaveOptions {
  control: any;
  onSave: (data: any) => Promise<void>;
  delay?: number;
  enabled?: boolean;
}

export const useAutosave = ({ control, onSave, delay = 2000, enabled = true }: UseAutosaveOptions) => {
  const watchedData = useWatch({ control });
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSavedDataRef = useRef<string>();

  useEffect(() => {
    if (!enabled) return;

    const currentDataString = JSON.stringify(watchedData);
    
    // Don't save if data hasn't changed
    if (currentDataString === lastSavedDataRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(async () => {
      try {
        await onSave(watchedData);
        lastSavedDataRef.current = currentDataString;
        toast.success('Changes saved automatically', {
          duration: 2000,
          className: 'bg-green-50 border-green-200 text-green-800',
        });
      } catch (error) {
        console.error('Autosave failed:', error);
        toast.error('Failed to save changes automatically', {
          duration: 3000,
        });
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watchedData, onSave, delay, enabled]);

  // Save on component unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // Perform final save if there's unsaved data
        const currentDataString = JSON.stringify(watchedData);
        if (currentDataString !== lastSavedDataRef.current) {
          onSave(watchedData).catch(console.error);
        }
      }
    };
  }, [watchedData, onSave]);
};