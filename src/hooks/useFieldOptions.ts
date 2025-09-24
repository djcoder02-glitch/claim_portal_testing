import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to fetch options for a specific field from the database
 * @param fieldName - The name of the field (e.g., 'content_industry_use', 'arrival_details')
 * @returns Array of option values for that field
 */
export const useFieldOptions = (fieldName: string) => {
  return useQuery({
    queryKey: ["field-options", fieldName], // Unique key per field
    queryFn: async () => {
      console.log("Fetching options for field:", fieldName);
      
      const { data, error } = await supabase
        .from("field_options")
        .select("option_value")
        .eq("field_name", fieldName)
        .eq("is_active", true)
        .order("option_value"); // Sort alphabetically
      
      if (error) {
        console.error(`Error fetching options for ${fieldName}:`, error);
        throw error;
      }
      
      // Return just the option values as an array of strings
      const options = data.map(item => item.option_value);
      console.log(`Found ${options.length} options for ${fieldName}:`, options);
      
      return options;
    },
    // Cache for 5 minutes since field options don't change frequently
    staleTime: 5 * 60 * 1000,
    // Enable the query only if fieldName is provided
    enabled: !!fieldName,
  });
};

/**
 * Hook to add a new option for any field
 * This is generic and works for any field type
 */
export const useAddFieldOption = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    // Function expects both fieldName and optionValue
    mutationFn: async ({ fieldName, optionValue }: { fieldName: string; optionValue: string }) => {
      console.log(`Adding option "${optionValue}" to field "${fieldName}"`);
      
      // Call our database function
      const { error } = await supabase.rpc('add_field_option', {
        field_name: fieldName,
        option_value: optionValue.trim()
      });
      
      if (error) {
        console.error("Database error:", error);
        throw error;
      }
      
      return { fieldName, optionValue };
    },
    
    // Success handler
    onSuccess: ({ fieldName, optionValue }) => {
      // Invalidate the specific field's options cache
      // This makes the new option appear immediately
      queryClient.invalidateQueries({ queryKey: ["field-options", fieldName] });
      
      // Show success message
      toast.success(`"${optionValue}" added successfully!`);
      
      console.log(`Successfully added "${optionValue}" to ${fieldName}`);
    },
    
    // Error handler
    onError: (error) => {
      console.error("Failed to add field option:", error);
      toast.error("Failed to add new option. Please try again.");
    },
  });
};

/**
 * Helper hook to get combined options (predefined + dynamic)
 * @param fieldName - The field name
 * @param predefinedOptions - Static options defined in your form
 * @returns Combined array of all options
 */
export const useCombinedOptions = (fieldName: string, predefinedOptions: string[] = []) => {
  const { data: dynamicOptions = [], isLoading } = useFieldOptions(fieldName);
  
  // Combine predefined and dynamic options, removing duplicates
  const allOptions = [
    ...predefinedOptions,
    ...dynamicOptions.filter(option => !predefinedOptions.includes(option))
  ];
  
  return {
    options: allOptions,
    isLoading,
    dynamicCount: dynamicOptions.length,
    totalCount: allOptions.length
  };
};