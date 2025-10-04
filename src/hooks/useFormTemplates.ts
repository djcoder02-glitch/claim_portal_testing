import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface TemplateField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'textarea' | 'select' | 'checkbox';
  required: boolean;
  options?: string[];
  order_index: number;
}

export interface TemplateSection {
  id: string;
  name: string;
  order_index: number;
  color_class: string;
  fields: TemplateField[];
}

export interface FormTemplate {
  id: string;
  name: string;
  description?: string;
  policy_type_id?: string;
  is_default: boolean;
  created_at: string;
  sections: TemplateSection[];
}

export interface DynamicSection {
  id: string;
  name: string;
  order_index: number;
  color_class: string;
  fields: TemplateField[];
  isCustom: boolean;
}

export const useFormTemplates = (policyTypeId?: string) => {
  return useQuery({
    queryKey: ["form-templates", policyTypeId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase.rpc('get_form_templates', {
          policy_type_filter: policyTypeId || null
        });

        if (error) {
          console.error('Template fetch error:', error);
          return [];
        }
        
        // Parse the JSON if it's a string, otherwise use as-is
        const templates = typeof data === 'string' ? JSON.parse(data) : data;
        return (Array.isArray(templates) ? templates : []) as FormTemplate[];
      } catch (err) {
        console.error('Failed to fetch templates:', err);
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
};

export const useSaveTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      name,
      description,
      policyTypeId,
      sections
    }: {
      name: string;
      description?: string;
      policyTypeId?: string;
      sections: DynamicSection[];
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const { data: template, error: templateError } = await supabase
        .from('form_templates')
        .insert({
          name,
          description,
          policy_type_id: policyTypeId,
          created_by: userData.user?.id
        })
        .select()
        .single();

      if (templateError) throw templateError;

      for (const section of sections) {
        const { data: templateSection, error: sectionError } = await supabase
          .from('template_sections')
          .insert({
            template_id: template.id,
            name: section.name,
            order_index: section.order_index,
            color_class: section.color_class
          })
          .select()
          .single();

        if (sectionError) throw sectionError;

        if (section.fields.length > 0) {
          const fieldsToInsert = section.fields.map(field => ({
            section_id: templateSection.id,
            name: field.name,
            label: field.label,
            type: field.type,
            required: field.required,
            options: field.options ? field.options : null,
            order_index: field.order_index
          }));

          const { error: fieldsError } = await supabase
            .from('template_fields')
            .insert(fieldsToInsert);

          if (fieldsError) throw fieldsError;
        }
      }

      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template saved successfully!");
    },
    onError: (error) => {
      console.error('Save template error:', error);
      toast.error("Failed to save template: " + error.message);
    },
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from('form_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form-templates"] });
      toast.success("Template deleted successfully!");
    },
    onError: (error) => {
      console.error('Delete template error:', error);
      toast.error("Failed to delete template: " + error.message);
    },
  });
};