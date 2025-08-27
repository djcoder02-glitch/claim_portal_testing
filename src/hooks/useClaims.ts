import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Claim {
  id: string;
  user_id: string;
  policy_type_id: string;
  claim_number: string;
  title: string;
  description?: string;
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  claim_amount?: number;
  form_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  policy_types?: {
    name: string;
    description: string;
    fields: any[];
  };
}

export interface PolicyType {
  id: string;
  name: string;
  description: string;
  fields: any[];
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

export const useClaims = () => {
  return useQuery({
    queryKey: ["claims"],
    queryFn: async () => {
      // Use admin function to bypass RLS
      const { data, error } = await supabase.rpc('get_all_claims_admin');
      
      if (error) throw error;
      
      // Transform the data to match expected format
      return data.map((row: any) => ({
        ...row,
        policy_types: row.policy_type_name ? {
          name: row.policy_type_name,
          description: row.policy_type_description,
          fields: row.policy_type_fields
        } : null
      })) as Claim[];
    },
  });
};

export const usePolicyTypes = () => {
  return useQuery({
    queryKey: ["policy_types"],
    queryFn: async () => {
      // Use admin function to bypass RLS
      const { data, error } = await supabase.rpc('get_all_policy_types_admin');
      
      if (error) throw error;
      return data as PolicyType[];
    },
  });
};

export const useCreateClaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (claimData: {
      policy_type_id: string;
      title: string;
      description?: string;
      form_data?: Record<string, any>;
      claim_amount?: number;
    }) => {
      // Use the currently authenticated user's ID to satisfy RLS
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData?.user;
      if (!user) throw new Error("Please sign in to create a claim.");

      const { data, error } = await supabase
        .from("claims")
        .insert({
          ...claimData,
          user_id: user.id,
          claim_number: "", // Auto-generation handled by DB function/trigger if configured
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Claim created successfully!");
    },
    onError: (error) => {
      toast.error("Failed to create claim: " + error.message);
    },
  });
};

export const useUpdateClaim = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Claim>;
    }) => {
      const { data, error } = await supabase
        .from("claims")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["claims"] });
      toast.success("Claim updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update claim: " + error.message);
    },
  });
};

export const useClaimById = (id: string) => {
  return useQuery({
    queryKey: ["claim", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select(`
          *,
          policy_types:policy_type_id (
            name,
            description,
            fields
          )
        `)
        .eq("id", id)
        .single();

      if (error) throw error;
      return data as Claim;
    },
    enabled: !!id,
  });
};