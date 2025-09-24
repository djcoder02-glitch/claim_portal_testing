import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Insurer = Tables<"insurers">;

export const useInsurers = () => {
  return useQuery<Insurer[]>({
    queryKey: ["insurers"],
    queryFn: async () => {
      console.log("[useInsurers] Starting query...");
      
      try {
        const { data, error } = await supabase
          .from("insurers")
          .select("id, name, is_active, created_at")
          .eq("is_active", true)
          .order("name");

        console.log("[useInsurers] Raw response:", { data, error });

        if (error) {
          console.error("[useInsurers] Database error:", error);
          throw error;
        }

        console.log("[useInsurers] Returning data:", data?.length || 0, "insurers");
        return data || [];
      } catch (err) {
        console.error("[useInsurers] Query failed:", err);
        throw err;
      }
    },
    retry: 3,
    staleTime: 5 * 60 * 1000,
    // cacheTime: 10 * 60 * 1000,
  });
};

export const useAddInsurer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insurerName: string) => {
      console.log("[useAddInsurer] Adding insurer:", insurerName);
      
      try {
        const { data, error } = await supabase
          .from("insurers")
          .insert([{ name: insurerName.trim(), is_active: true }])
          .select()
          .single();

        if (error) {
          console.error("[useAddInsurer] Insert error:", error);
          throw error;
        }

        console.log("[useAddInsurer] Successfully added:", data);
        return data;
      } catch (err) {
        console.error("[useAddInsurer] Mutation failed:", err);
        throw err;
      }
    },
    onSuccess: (newInsurer) => {
      console.log("[useAddInsurer] Mutation successful, invalidating cache");
      toast.success(`Insurer "${newInsurer.name}" added!`);
      queryClient.invalidateQueries({ queryKey: ["insurers"] });
    },
    onError: (err) => {
      console.error("[useAddInsurer] Mutation error:", err);
      toast.error("Failed to add insurer: " + (err as Error).message);
    },
  });
};
