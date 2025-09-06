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
  const savingRef = useRef(false);
  const onSaveRef = useRef(onSave);

  // Keep latest onSave without retriggering effect
  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    if (!enabled) return;

    const currentDataString = JSON.stringify(watchedData);

    // Initial mount: record snapshot and skip save
    if (!lastSavedDataRef.current) {
      lastSavedDataRef.current = currentDataString;
      return;
    }

    // Skip if unchanged or a save is already in-flight
    if (currentDataString === lastSavedDataRef.current || savingRef.current) {
      return;
    }

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for autosave
    timeoutRef.current = setTimeout(async () => {
      try {
        savingRef.current = true;
        await onSaveRef.current?.(watchedData);
        lastSavedDataRef.current = currentDataString;
        toast.success('Changes saved automatically', {
          duration: 1500,
        });
      } catch (error) {
        console.error('Autosave failed:', error);
        toast.error('Failed to save changes automatically', {
          duration: 2500,
        });
      } finally {
        savingRef.current = false;
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [watchedData, delay, enabled]);

  // Save on component unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const currentDataString = JSON.stringify(watchedData);
      if (enabled && currentDataString !== lastSavedDataRef.current && !savingRef.current) {
        onSaveRef.current?.(watchedData).catch(console.error);
      }
    };
  }, [watchedData, enabled]);
};