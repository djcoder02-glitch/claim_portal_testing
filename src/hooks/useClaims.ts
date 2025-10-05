import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/components/auth/AuthProvider";
import { Tables, TablesUpdate, TablesInsert } from "@/integrations/supabase/types";

// Use Supabase generated types
type ClaimUpdate = TablesUpdate<'claims'>;

export interface Claim {
  id: string;
  user_id: string;
  policy_type_id: string;
  claim_number: string;
  title: string;
  // description?: string;
  intimation_date: string|null;
  status: 'pending' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'paid';
  claim_amount?: number;
  form_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  policy_types?: {
    name: string;
    description: string;
    fields: unknown[];
  };
}

export interface PolicyType {
  id: string;
  name: string;
  description: string;
  fields: unknown[];
  parent_id?: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseClaimRow {
  id: string;
  user_id: string;
  policy_type_id: string;
  claim_number: string;
  title: string;
  // description: string | null;
  status: string;
  intimation_date:string | null;
  claim_amount: number | null;
  form_data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  policy_type_name?: string;
  policy_type_description?: string;
  policy_type_fields?: unknown[];
}

export const useClaims = () => {
  const { isAdmin } = useAuth();

  console.log('[UseClaims] isAdmin : ', isAdmin);
  
  return useQuery({
    queryKey: ["claims", isAdmin ? "admin" : "user"],
    queryFn: async () => {
      let data, error;
      
      console.log('[useClaims] Fetching claims for:', isAdmin ? 'admin' : 'user');

      if (isAdmin) {
        ({ data, error } = await supabase.rpc('get_all_claims_admin'));
      } else {
        ({ data, error } = await supabase.rpc('get_user_claims'));
      }
      
      if (error) {
        console.error('[useClaims] Error:', error);
        throw error;
      }
      console.log('[useClaims] Fetched claims count:', data?.length);

      return data.map((row: DatabaseClaimRow) => ({
        ...row,
        policy_types: row.policy_type_name ? {
          name: row.policy_type_name,
          description: row.policy_type_description || '',
          fields: row.policy_type_fields || []
        } : null
      })) as Claim[];
    },
  });
};

export const usePolicyTypes = () => {
  return useQuery({
    queryKey: ["policy_types"],
    queryFn: async () => {
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
      // description?: string;
      intimation_date?: string;
      form_data?: Record<string, unknown>;
      claim_amount?: number;
    }) => {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = userData?.user;
      if (!user) throw new Error("Please sign in to create a claim.");

      const { data, error } = await supabase
        .from("claims")
        .insert({
          policy_type_id: claimData.policy_type_id,
          title: claimData.title,
          user_id: user.id,
          intimation_date:claimData.intimation_date || null,
          form_data: claimData.form_data || null,
          claim_amount: claimData.claim_amount || null,
          status:'pending'
        } as never)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
        onSuccess: (data) => {
      // Invalidate the claims list
      queryClient.invalidateQueries({ queryKey: ["claims"] });

      // Invalidate any claim detail cache so useClaimById refetches updated data.
      // Invalidate by prefix "claim" which covers keys like ["claim", id] and ["claim", id, "user"/"admin"]
      queryClient.invalidateQueries({ queryKey: ["claim"] });

      // Also target the newly created claim specifically when possible
      if (data && (data as any).id) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const createdId = (data as any).id as string;
        queryClient.invalidateQueries({ queryKey: ["claim", createdId] });
      }

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
      updates: ClaimUpdate;
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
      queryClient.invalidateQueries({ queryKey: ["claim"] });
      toast.success("Claim updated successfully!");
    },
    onError: (error) => {
      toast.error("Failed to update claim: " + error.message);
    },
  });
};

export const useUpdateClaimSilent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: ClaimUpdate;
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
      queryClient.invalidateQueries({ queryKey: ["claim"] });
    },
  });
};

export const useClaimById = (id: string) => {
  const { isAdmin } = useAuth();
  
  return useQuery({
    queryKey: ["claim", id, isAdmin ? "admin" : "user"],
    queryFn: async () => {
      // console.log('[useClaimById] isAdmin:', isAdmin, 'claimId:', id);
      
      if (isAdmin) {
          // Get all claims via admin function, then filter for the specific one
          const { data, error } = await supabase.rpc('get_all_claims_admin', null);

          // force type because RPC isn’t in generated types
          const allClaims = (data ?? []) as DatabaseClaimRow[];

          if (error) throw error;
          if (!allClaims.length) throw new Error('No claims returned');

          const claim = allClaims.find(c => c.id === id);
          if (!claim) throw new Error('Claim not found');

        // Transform to match expected format
        const transformedData = {
          ...claim,
          policy_types: claim.policy_type_name ? {
            name: claim.policy_type_name,
            description: claim.policy_type_description || '',
            fields: claim.policy_type_fields || []
          } : null
        };

        return transformedData as Claim;
      } else {
        // Regular user query (subject to RLS)
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
      }
    },
    enabled: !!id,
  });
};