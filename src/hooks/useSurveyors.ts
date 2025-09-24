import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook to fetch all active surveyors from the database
 * Returns an array of surveyor names for use in dropdowns
 */
export const useSurveyors = () => {
  return useQuery({
    queryKey: ["surveyors"], // Unique identifier for this query
    queryFn: async () => {
      // Fetch from Supabase
      const { data, error } = await supabase
        .from("surveyors")
        .select("*")
        .eq("is_active", true) // Only get active surveyors
        .order("name"); // Sort alphabetically

      if (error) {
        console.error("Error fetching surveyors:", error);
        throw error;
      }

      // Transform data: return just names for dropdown
      return data.map(surveyor => surveyor.name);
    },
    // Optional: Cache for 5 minutes
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to add a new surveyor to the database
 * Returns a mutation function that can be called to add surveyors
 */
export const useAddSurveyor = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    // The actual function that runs when mutation is called
    mutationFn: async (surveyorName: string) => {
      console.log("Adding surveyor:", surveyorName);
      
      // Call our database function
      const { error } = await supabase.rpc('add_surveyor_option', {
        surveyor_name: surveyorName.trim()
      });
      
      if (error) {
        console.error("Database error:", error);
        throw error;
      }
      
      return surveyorName;
    },
    
    // What happens when mutation succeeds
    onSuccess: (surveyorName) => {
      // Invalidate and refetch the surveyors list
      // This ensures the new surveyor appears immediately
      queryClient.invalidateQueries({ queryKey: ["surveyors"] });
      
      // Show success message to user
      toast.success(`"${surveyorName}" added successfully!`);
      
      console.log("Successfully added surveyor:", surveyorName);
    },
    
    // What happens when mutation fails
    onError: (error) => {
      console.error("Failed to add surveyor:", error);
      toast.error("Failed to add new surveyor. Please try again.");
    },
  });
};