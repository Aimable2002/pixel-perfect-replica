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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          masseur_id: string
          payment_id: string
          starts_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at: string
          id?: string
          masseur_id: string
          payment_id: string
          starts_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          masseur_id?: string
          payment_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_masseur_id_fkey"
            columns: ["masseur_id"]
            isOneToOne: false
            referencedRelation: "masseurs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target?: string | null
        }
        Relationships: []
      }
      masseur_contacts: {
        Row: {
          email: string | null
          masseur_id: string
          other_info: string | null
          phone: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          email?: string | null
          masseur_id: string
          other_info?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          email?: string | null
          masseur_id?: string
          other_info?: string | null
          phone?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "masseur_contacts_masseur_id_fkey"
            columns: ["masseur_id"]
            isOneToOne: true
            referencedRelation: "masseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      masseur_photos: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          is_public: boolean
          masseur_id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          is_public?: boolean
          masseur_id: string
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          is_public?: boolean
          masseur_id?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "masseur_photos_masseur_id_fkey"
            columns: ["masseur_id"]
            isOneToOne: false
            referencedRelation: "masseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      masseur_services: {
        Row: {
          created_at: string
          description: string
          id: string
          masseur_id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          masseur_id: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          masseur_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "masseur_services_masseur_id_fkey"
            columns: ["masseur_id"]
            isOneToOne: false
            referencedRelation: "masseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      masseurs: {
        Row: {
          base_price: number
          bio: string
          created_at: string
          demo_cover: string | null
          display_name: string
          experience_years: number
          id: string
          is_demo: boolean
          is_published: boolean
          location: string
          massage_types: string[]
          short_bio: string
          status: Database["public"]["Enums"]["listing_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          base_price?: number
          bio?: string
          created_at?: string
          demo_cover?: string | null
          display_name: string
          experience_years?: number
          id?: string
          is_demo?: boolean
          is_published?: boolean
          location?: string
          massage_types?: string[]
          short_bio?: string
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          base_price?: number
          bio?: string
          created_at?: string
          demo_cover?: string | null
          display_name?: string
          experience_years?: number
          id?: string
          is_demo?: boolean
          is_published?: boolean
          location?: string
          massage_types?: string[]
          short_bio?: string
          status?: Database["public"]["Enums"]["listing_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          backend_reference: string | null
          base_price: number
          created_at: string
          customer_id: string
          id: string
          instructions: string | null
          masseur_id: string
          platform_fee: number
          status: Database["public"]["Enums"]["payment_status"]
          total: number
          updated_at: string
        }
        Insert: {
          backend_reference?: string | null
          base_price: number
          created_at?: string
          customer_id: string
          id?: string
          instructions?: string | null
          masseur_id: string
          platform_fee: number
          status?: Database["public"]["Enums"]["payment_status"]
          total: number
          updated_at?: string
        }
        Update: {
          backend_reference?: string | null
          base_price?: number
          created_at?: string
          customer_id?: string
          id?: string
          instructions?: string | null
          masseur_id?: string
          platform_fee?: number
          status?: Database["public"]["Enums"]["payment_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_masseur_id_fkey"
            columns: ["masseur_id"]
            isOneToOne: false
            referencedRelation: "masseurs"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          access_hours: number
          fee_type: string
          fee_value: number
          id: number
          max_base_price: number
          min_base_price: number
          updated_at: string
        }
        Insert: {
          access_hours?: number
          fee_type?: string
          fee_value?: number
          id?: number
          max_base_price?: number
          min_base_price?: number
          updated_at?: string
        }
        Update: {
          access_hours?: number
          fee_type?: string
          fee_value?: number
          id?: number
          max_base_price?: number
          min_base_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_suspended: boolean
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_suspended?: boolean
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_suspended?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compute_fee: { Args: { _base: number }; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "masseur" | "customer"
      listing_status: "pending" | "approved" | "rejected" | "suspended"
      payment_status: "pending" | "success" | "failed" | "cancelled"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "masseur", "customer"],
      listing_status: ["pending", "approved", "rejected", "suspended"],
      payment_status: ["pending", "success", "failed", "cancelled"],
    },
  },
} as const
