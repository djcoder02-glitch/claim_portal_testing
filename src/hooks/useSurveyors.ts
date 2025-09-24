import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables, TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";

// ✅ Strongly typed row from Supabase
export type Surveyor = Tables<"surveyors">;
export type NewSurveyor = TablesInsert<"surveyors">;

/**
 * Fetch all active surveyors
 */
export const useSurveyors = () => {
  return useQuery<Surveyor[]>({
    queryKey: ["surveyors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("surveyors")
        .select("id, name, is_active, created_at")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error fetching surveyors:", error);
        throw error;
      }

      console.log("[useSurveyors] fetched:", data);
      return data as Surveyor[];
    },
    staleTime: 5 * 60 * 1000, // cache 5 min
  });
};

/**
 * Add a new surveyor
 */
export const useAddSurveyor = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (surveyorName: string) => {
      const { data, error } = await supabase
        .from("surveyors")
        .insert([{ name: surveyorName.trim(), is_active: true }])
        .select()
        .single();

      if (error) {
        console.error("Error inserting surveyor:", error);
        throw error;
      }

      return data as Surveyor;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["surveyors"] });
      toast.success(`Surveyor "${data.name}" added successfully!`);
    },
    onError: (error) => {
      console.error("Failed to add surveyor:", error);
      toast.error("Failed to add new surveyor. Please try again.");
    },
  });
};
