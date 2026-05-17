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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assignments: {
        Row: {
          color: string | null
          color_name: string | null
          completed_at: string | null
          created_at: string
          id: string
          period_id: string | null
          product_id: string
          quantity: number
          started_at: string
          status: Database["public"]["Enums"]["assignment_status"]
          unit_price: number
          user_id: string
          worker_id: string
        }
        Insert: {
          color?: string | null
          color_name?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          period_id?: string | null
          product_id: string
          quantity: number
          started_at?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          unit_price: number
          user_id: string
          worker_id: string
        }
        Update: {
          color?: string | null
          color_name?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          period_id?: string | null
          product_id?: string
          quantity?: number
          started_at?: string
          status?: Database["public"]["Enums"]["assignment_status"]
          unit_price?: number
          user_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "payroll_periods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          created_at: string
          date: string
          id: string
          user_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          user_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          user_id?: string
          worker_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      founders: {
        Row: {
          admin_user_id: string
          created_at: string
          full_name: string
          id: string
          login_id: string
          pin_hash: string
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          full_name: string
          id?: string
          login_id: string
          pin_hash: string
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          full_name?: string
          id?: string
          login_id?: string
          pin_hash?: string
        }
        Relationships: []
      }
      payroll_periods: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string
          id: string
          label: string
          start_date: string
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          label: string
          start_date: string
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          category_id: string | null
          colors: string[]
          created_at: string
          id: string
          is_active: boolean
          name: string
          price_per_unit: number
          user_id: string
        }
        Insert: {
          category_id?: string | null
          colors?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          price_per_unit?: number
          user_id: string
        }
        Update: {
          category_id?: string | null
          colors?: string[]
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          price_per_unit?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pullers_app_settings: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      pullers_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      pullers_periods: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string | null
          id: string
          name: string | null
          start_date: string
          status: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string | null
          start_date: string
          status?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string | null
          id?: string
          name?: string | null
          start_date?: string
          status?: string
        }
        Relationships: []
      }
      pullers_products: {
        Row: {
          active: boolean
          category_id: string | null
          created_at: string
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          name: string
          price: number
        }
        Update: {
          active?: boolean
          category_id?: string | null
          created_at?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "pullers_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "pullers_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      pullers_work_entries: {
        Row: {
          created_at: string
          id: string
          product_id: string
          quantity: number
          total: number | null
          unit_price: number
          work_date: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          quantity: number
          total?: number | null
          unit_price: number
          work_date?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
          total?: number | null
          unit_price?: number
          work_date?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pullers_work_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "pullers_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pullers_work_entries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pullers_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pullers_work_entries_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "pullers_workers_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      pullers_worker_sessions: {
        Row: {
          created_at: string
          expires_at: string
          token: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          token?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          token?: string
          worker_id?: string
        }
        Relationships: []
      }
      pullers_workers: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          pin_hash: string
          worker_code: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          pin_hash: string
          worker_code: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          pin_hash?: string
          worker_code?: string
        }
        Relationships: []
      }
      workers: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id?: string
          phone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      pullers_workers_safe: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string | null
          name: string | null
          worker_code: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          worker_code?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string | null
          name?: string | null
          worker_code?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      close_period_and_rollover:
        | { Args: { _new_label: string; _period_id: string }; Returns: string }
        | {
            Args: {
              _close_date?: string
              _new_label: string
              _new_start?: string
              _period_id: string
            }
            Returns: string
          }
      pullers_admin_update_entry: {
        Args: {
          _entry_id: string
          _product_id: string
          _quantity: number
          _work_date: string
        }
        Returns: undefined
      }
      pullers_admin_upsert_worker: {
        Args: {
          _active: boolean
          _code: string
          _id: string
          _name: string
          _pin: string
        }
        Returns: string
      }
      pullers_close_current_period: {
        Args: { _end_date?: string; _next_start?: string }
        Returns: string
      }
      pullers_delete_my_entry: {
        Args: { _entry_id: string; _token: string }
        Returns: undefined
      }
      pullers_get_current_period: {
        Args: never
        Returns: {
          id: string
          name: string
          start_date: string
        }[]
      }
      pullers_get_my_entries: {
        Args: { _token: string }
        Returns: {
          category_name: string
          created_at: string
          id: string
          product_name: string
          quantity: number
          total: number
          unit_price: number
          work_date: string
        }[]
      }
      pullers_period_auto_name: { Args: { _d: string }; Returns: string }
      pullers_set_admin_pin: {
        Args: { _new_pin: string; _old_pin: string }
        Returns: undefined
      }
      pullers_submit_work_entry: {
        Args: {
          _product_id: string
          _quantity: number
          _token: string
          _work_date: string
        }
        Returns: string
      }
      pullers_update_my_entry: {
        Args: {
          _entry_id: string
          _product_id: string
          _quantity: number
          _token: string
          _work_date: string
        }
        Returns: undefined
      }
      pullers_verify_admin_pin: { Args: { _pin: string }; Returns: boolean }
      pullers_worker_login: {
        Args: { _code: string; _pin: string }
        Returns: {
          expires_at: string
          id: string
          name: string
          session_token: string
          worker_code: string
        }[]
      }
      pullers_worker_logout: { Args: { _token: string }; Returns: undefined }
      pullers_worker_session_check: {
        Args: { _token: string }
        Returns: string
      }
    }
    Enums: {
      assignment_status: "in_progress" | "completed"
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
    Enums: {
      assignment_status: ["in_progress", "completed"],
    },
  },
} as const
