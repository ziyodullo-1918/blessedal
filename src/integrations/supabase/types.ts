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
      factory_orders: {
        Row: {
          color: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          due_date: string | null
          id: string
          notes: string | null
          order_number: string
          priority: number
          product_name: string
          size: string | null
          status: Database["public"]["Enums"]["factory_order_status"]
          total_quantity: number
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number: string
          priority?: number
          product_name: string
          size?: string | null
          status?: Database["public"]["Enums"]["factory_order_status"]
          total_quantity: number
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          due_date?: string | null
          id?: string
          notes?: string | null
          order_number?: string
          priority?: number
          product_name?: string
          size?: string | null
          status?: Database["public"]["Enums"]["factory_order_status"]
          total_quantity?: number
          updated_at?: string
        }
        Relationships: []
      }
      factory_payroll_periods: {
        Row: {
          closed_at: string | null
          created_at: string
          end_date: string
          id: string
          label: string
          start_date: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          end_date: string
          id?: string
          label: string
          start_date: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          end_date?: string
          id?: string
          label?: string
          start_date?: string
        }
        Relationships: []
      }
      factory_payroll_snapshots: {
        Row: {
          created_at: string
          department: Database["public"]["Enums"]["factory_department"]
          id: string
          period_id: string
          total_amount: number
          total_units: number
          worker_id: string
          worker_name: string
        }
        Insert: {
          created_at?: string
          department: Database["public"]["Enums"]["factory_department"]
          id?: string
          period_id: string
          total_amount?: number
          total_units?: number
          worker_id: string
          worker_name: string
        }
        Update: {
          created_at?: string
          department?: Database["public"]["Enums"]["factory_department"]
          id?: string
          period_id?: string
          total_amount?: number
          total_units?: number
          worker_id?: string
          worker_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_payroll_snapshots_period_id_fkey"
            columns: ["period_id"]
            isOneToOne: false
            referencedRelation: "factory_payroll_periods"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_stage_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          note: string | null
          order_id: string
          quantity: number
          rejected: number
          stage_id: string
          worker_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          note?: string | null
          order_id: string
          quantity?: number
          rejected?: number
          stage_id: string
          worker_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          note?: string | null
          order_id?: string
          quantity?: number
          rejected?: number
          stage_id?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factory_stage_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "factory_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_stage_events_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "factory_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_stage_events_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "factory_workers"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_stages: {
        Row: {
          assigned_worker_id: string | null
          completed_at: string | null
          completed_quantity: number
          created_at: string
          department: Database["public"]["Enums"]["factory_department"]
          id: string
          notes: string | null
          order_id: string
          planned_quantity: number
          rejected_quantity: number
          sequence_no: number
          started_at: string | null
          status: Database["public"]["Enums"]["factory_stage_status"]
          updated_at: string
        }
        Insert: {
          assigned_worker_id?: string | null
          completed_at?: string | null
          completed_quantity?: number
          created_at?: string
          department: Database["public"]["Enums"]["factory_department"]
          id?: string
          notes?: string | null
          order_id: string
          planned_quantity?: number
          rejected_quantity?: number
          sequence_no: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["factory_stage_status"]
          updated_at?: string
        }
        Update: {
          assigned_worker_id?: string | null
          completed_at?: string | null
          completed_quantity?: number
          created_at?: string
          department?: Database["public"]["Enums"]["factory_department"]
          id?: string
          notes?: string | null
          order_id?: string
          planned_quantity?: number
          rejected_quantity?: number
          sequence_no?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["factory_stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "factory_stages_assigned_worker_id_fkey"
            columns: ["assigned_worker_id"]
            isOneToOne: false
            referencedRelation: "factory_workers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factory_stages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "factory_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      factory_workers: {
        Row: {
          active: boolean
          created_at: string
          department: Database["public"]["Enums"]["factory_department"]
          full_name: string
          id: string
          phone: string | null
          pin_hash: string
          worker_code: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department: Database["public"]["Enums"]["factory_department"]
          full_name: string
          id?: string
          phone?: string | null
          pin_hash: string
          worker_code: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["factory_department"]
          full_name?: string
          id?: string
          phone?: string | null
          pin_hash?: string
          worker_code?: string
        }
        Relationships: []
      }
      finished_inventory: {
        Row: {
          color: string | null
          created_at: string
          damaged_quantity: number
          id: string
          note: string | null
          order_id: string | null
          packaged_at: string
          packaged_by: string | null
          product_name: string
          quantity: number
          size: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          damaged_quantity?: number
          id?: string
          note?: string | null
          order_id?: string | null
          packaged_at?: string
          packaged_by?: string | null
          product_name: string
          quantity?: number
          size?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          damaged_quantity?: number
          id?: string
          note?: string | null
          order_id?: string | null
          packaged_at?: string
          packaged_by?: string | null
          product_name?: string
          quantity?: number
          size?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finished_inventory_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "factory_orders"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_materials: {
        Row: {
          created_at: string
          id: string
          material_type: string
          min_stock: number
          name: string
          notes: string | null
          stock_quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_type?: string
          min_stock?: number
          name: string
          notes?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_type?: string
          min_stock?: number
          name?: string
          notes?: string | null
          stock_quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          delta: number
          id: string
          material_id: string
          note: string | null
          order_id: string | null
          reason: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: string
          material_id: string
          note?: string | null
          order_id?: string | null
          reason: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: string
          material_id?: string
          note?: string | null
          order_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "factory_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      laser_daily_attendance: {
        Row: {
          created_at: string
          daily_rate: number
          id: string
          note: string | null
          work_date: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          daily_rate?: number
          id?: string
          note?: string | null
          work_date?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          daily_rate?: number
          id?: string
          note?: string | null
          work_date?: string
          worker_id?: string
        }
        Relationships: []
      }
      laser_daily_rates: {
        Row: {
          active: boolean
          created_at: string
          effective_from: string
          id: string
          rate_per_day: number
          worker_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          effective_from?: string
          id?: string
          rate_per_day?: number
          worker_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          effective_from?: string
          id?: string
          rate_per_day?: number
          worker_id?: string | null
        }
        Relationships: []
      }
      packaging_piece_rates: {
        Row: {
          active: boolean
          created_at: string
          id: string
          product_name: string | null
          rate_per_unit: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          product_name?: string | null
          rate_per_unit?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          product_name?: string | null
          rate_per_unit?: number
          updated_at?: string
        }
        Relationships: []
      }
      packaging_worker_sessions: {
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
      product_formulas: {
        Row: {
          created_at: string
          id: string
          material_id: string
          product_name: string
          quantity_per_unit: number
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          product_name: string
          quantity_per_unit: number
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          product_name?: string
          quantity_per_unit?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_formulas_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "inventory_materials"
            referencedColumns: ["id"]
          },
        ]
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
      salary_rates: {
        Row: {
          active: boolean
          created_at: string
          department: Database["public"]["Enums"]["factory_department"]
          id: string
          product_name: string | null
          rate_per_unit: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          department: Database["public"]["Enums"]["factory_department"]
          id?: string
          product_name?: string | null
          rate_per_unit?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          department?: Database["public"]["Enums"]["factory_department"]
          id?: string
          product_name?: string | null
          rate_per_unit?: number
          updated_at?: string
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
      factory_close_payroll_period: {
        Args: { _period_id: string }
        Returns: undefined
      }
      factory_consume_order_materials: {
        Args: { _order_id: string }
        Returns: undefined
      }
      factory_finalize_packaging: {
        Args: {
          _damaged?: number
          _note?: string
          _quantity: number
          _stage_id: string
          _worker_id?: string
        }
        Returns: string
      }
      factory_next_order_number: { Args: never; Returns: string }
      factory_order_material_requirements: {
        Args: { _order_id: string }
        Returns: {
          available_qty: number
          material_id: string
          material_name: string
          required_qty: number
          shortage: number
          unit: string
        }[]
      }
      factory_report_stage_progress: {
        Args: {
          _completed_delta: number
          _note?: string
          _rejected_delta?: number
          _stage_id: string
          _worker_id?: string
        }
        Returns: undefined
      }
      factory_set_stage_status: {
        Args: {
          _note?: string
          _stage_id: string
          _status: Database["public"]["Enums"]["factory_stage_status"]
        }
        Returns: undefined
      }
      factory_worker_salary: {
        Args: { _from: string; _to: string }
        Returns: {
          department: Database["public"]["Enums"]["factory_department"]
          total_amount: number
          total_units: number
          worker_id: string
          worker_name: string
        }[]
      }
      inventory_adjust_stock: {
        Args: {
          _delta: number
          _material_id: string
          _note?: string
          _reason: string
        }
        Returns: undefined
      }
      laser_cut_summary: {
        Args: { _from: string; _to: string }
        Returns: {
          color: string
          order_id: string
          order_number: string
          product_name: string
          total_quantity: number
          total_rejected: number
        }[]
      }
      laser_record_attendance: {
        Args: {
          _note?: string
          _rate: number
          _work_date: string
          _worker_id: string
        }
        Returns: string
      }
      laser_salary_report: {
        Args: { _from: string; _to: string }
        Returns: {
          total_amount: number
          total_days: number
          worker_id: string
          worker_name: string
        }[]
      }
      packaging_salary_report: {
        Args: { _from: string; _to: string }
        Returns: {
          total_amount: number
          total_units: number
          worker_id: string
          worker_name: string
        }[]
      }
      packaging_worker_login: {
        Args: { _code: string; _pin_hash: string }
        Returns: {
          expires_at: string
          full_name: string
          id: string
          session_token: string
          worker_code: string
        }[]
      }
      packaging_worker_logout: { Args: { _token: string }; Returns: undefined }
      packaging_worker_pack: {
        Args: {
          _damaged?: number
          _note?: string
          _quantity: number
          _stage_id: string
          _token: string
        }
        Returns: string
      }
      packaging_worker_session_check: {
        Args: { _token: string }
        Returns: string
      }
      packaging_worker_tasks: {
        Args: { _token: string }
        Returns: {
          color: string
          completed: number
          order_id: string
          order_number: string
          planned: number
          product_name: string
          rejected: number
          stage_id: string
          status: Database["public"]["Enums"]["factory_stage_status"]
        }[]
      }
      packaging_worker_today: {
        Args: { _token: string }
        Returns: {
          total_amount: number
          total_units: number
        }[]
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
      pullers_get_my_periods: {
        Args: { _token: string }
        Returns: {
          end_date: string
          id: string
          name: string
          start_date: string
          status: string
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
      factory_department:
        | "laser"
        | "sewing"
        | "stretching"
        | "packaging"
        | "warehouse"
        | "delivery"
        | "admin"
      factory_order_status:
        | "pending"
        | "in_progress"
        | "partial"
        | "completed"
        | "waiting_material"
        | "rejected"
      factory_stage_status:
        | "pending"
        | "in_progress"
        | "partial"
        | "completed"
        | "waiting_material"
        | "rejected"
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
      factory_department: [
        "laser",
        "sewing",
        "stretching",
        "packaging",
        "warehouse",
        "delivery",
        "admin",
      ],
      factory_order_status: [
        "pending",
        "in_progress",
        "partial",
        "completed",
        "waiting_material",
        "rejected",
      ],
      factory_stage_status: [
        "pending",
        "in_progress",
        "partial",
        "completed",
        "waiting_material",
        "rejected",
      ],
    },
  },
} as const
