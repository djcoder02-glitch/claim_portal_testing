export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      Auth: {
        Row: {
          createdAt: string
          current_hash: string
          id: string
          metadata: Json | null
          salt: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          current_hash: string
          id: string
          metadata?: Json | null
          salt: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          current_hash?: string
          id?: string
          metadata?: Json | null
          salt?: string
          updatedAt?: string
        }
        Relationships: []
      }
      Claim: {
        Row: {
          createdAt: string
          customer_id: number
          details: string | null
          docs: Json | null
          employee_id: number
          id: number
          insurer: string
          metadata: Json | null
          policy_id: number
          policy_record_id: number
          registration_number: string
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          customer_id: number
          details?: string | null
          docs?: Json | null
          employee_id: number
          id?: number
          insurer: string
          metadata?: Json | null
          policy_id: number
          policy_record_id: number
          registration_number: string
          updatedAt: string
        }
        Update: {
          createdAt?: string
          customer_id?: number
          details?: string | null
          docs?: Json | null
          employee_id?: number
          id?: number
          insurer?: string
          metadata?: Json | null
          policy_id?: number
          policy_record_id?: number
          registration_number?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Claim_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "Customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Claim_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "Employee"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Claim_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "PolicyType"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Claim_policy_record_id_fkey"
            columns: ["policy_record_id"]
            isOneToOne: false
            referencedRelation: "PolicyRecord"
            referencedColumns: ["id"]
          },
        ]
      }
      Customer: {
        Row: {
          city: string | null
          createdAt: string
          email: string
          id: number
          name: string
          number: string | null
          updatedAt: string
        }
        Insert: {
          city?: string | null
          createdAt?: string
          email: string
          id?: number
          name: string
          number?: string | null
          updatedAt: string
        }
        Update: {
          city?: string | null
          createdAt?: string
          email?: string
          id?: number
          name?: string
          number?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      Employee: {
        Row: {
          createdAt: string
          data: Json | null
          id: number
          name: string
          position: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          data?: Json | null
          id?: number
          name: string
          position?: string | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          data?: Json | null
          id?: number
          name?: string
          position?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      PolicyRecord: {
        Row: {
          createdAt: string
          htmlData: string | null
          id: number
          policy_id: number
          updatedAt: string
          variable_data: Json
        }
        Insert: {
          createdAt?: string
          htmlData?: string | null
          id?: number
          policy_id: number
          updatedAt: string
          variable_data: Json
        }
        Update: {
          createdAt?: string
          htmlData?: string | null
          id?: number
          policy_id?: number
          updatedAt?: string
          variable_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "PolicyRecord_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "PolicyType"
            referencedColumns: ["id"]
          },
        ]
      }
      PolicyType: {
        Row: {
          createdAt: string
          data: Json | null
          default_key_values: Json | null
          id: number
          metadata: Json | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          data?: Json | null
          default_key_values?: Json | null
          id?: number
          metadata?: Json | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          data?: Json | null
          default_key_values?: Json | null
          id?: number
          metadata?: Json | null
          updatedAt?: string
        }
        Relationships: []
      }
      UserProfile: {
        Row: {
          auth_id: string
          createdAt: string
          data: Json | null
          id: number
          metadata: Json | null
          updatedAt: string
        }
        Insert: {
          auth_id: string
          createdAt?: string
          data?: Json | null
          id?: number
          metadata?: Json | null
          updatedAt: string
        }
        Update: {
          auth_id?: string
          createdAt?: string
          data?: Json | null
          id?: number
          metadata?: Json | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserProfile_auth_id_fkey"
            columns: ["auth_id"]
            isOneToOne: false
            referencedRelation: "Auth"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
