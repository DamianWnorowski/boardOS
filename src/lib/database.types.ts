export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          full_name: string
          email: string
          phone_number: string | null
          role: string
          certifications: Json
          skills: Json
          permissions: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          full_name: string
          email: string
          phone_number?: string | null
          role?: string
          certifications?: Json
          skills?: Json
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          email?: string
          phone_number?: string | null
          role?: string
          certifications?: Json
          skills?: Json
          permissions?: Json
          created_at?: string
          updated_at?: string
        }
      }
      employees: {
        Row: {
          id: string
          user_id: string | null
          type: string
          name: string
          employee_id: string | null
          phone_number: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          email: string | null
          address: string | null
          hire_date: string | null
          role: string
          certifications: Json
          skills: Json
          permissions: Json
          performance_reviews: Json
          training_records: Json
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          type: string
          name: string
          employee_id?: string | null
          phone_number?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          email?: string | null
          address?: string | null
          hire_date?: string | null
          role?: string
          certifications?: Json
          skills?: Json
          permissions?: Json
          performance_reviews?: Json
          training_records?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          type?: string
          name?: string
          employee_id?: string | null
          phone_number?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          email?: string | null
          address?: string | null
          hire_date?: string | null
          role?: string
          certifications?: Json
          skills?: Json
          permissions?: Json
          performance_reviews?: Json
          training_records?: Json
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      equipment: {
        Row: {
          id: string
          type: string
          name: string
          identifier: string | null
          model: string | null
          make: string | null
          year: number | null
          vin: string | null
          serial_number: string | null
          location: string | null
          on_site: boolean
          acquisition_date: string | null
          purchase_price: number | null
          current_value: number | null
          fuel_type: string | null
          engine_hours: number
          last_maintenance_date: string | null
          next_maintenance_date: string | null
          maintenance_notes: string | null
          insurance_policy: string | null
          registration_expiry: string | null
          inspection_date: string | null
          is_operational: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          name: string
          identifier?: string | null
          model?: string | null
          make?: string | null
          year?: number | null
          vin?: string | null
          serial_number?: string | null
          location?: string | null
          on_site?: boolean
          acquisition_date?: string | null
          purchase_price?: number | null
          current_value?: number | null
          fuel_type?: string | null
          engine_hours?: number
          last_maintenance_date?: string | null
          next_maintenance_date?: string | null
          maintenance_notes?: string | null
          insurance_policy?: string | null
          registration_expiry?: string | null
          inspection_date?: string | null
          is_operational?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          name?: string
          identifier?: string | null
          model?: string | null
          make?: string | null
          year?: number | null
          vin?: string | null
          serial_number?: string | null
          location?: string | null
          on_site?: boolean
          acquisition_date?: string | null
          purchase_price?: number | null
          current_value?: number | null
          fuel_type?: string | null
          engine_hours?: number
          last_maintenance_date?: string | null
          next_maintenance_date?: string | null
          maintenance_notes?: string | null
          insurance_policy?: string | null
          registration_expiry?: string | null
          inspection_date?: string | null
          is_operational?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      resources: {
        Row: {
          id: string
          type: string
          class_type: 'employee' | 'equipment'
          name: string
          identifier: string | null
          model: string | null
          vin: string | null
          location: string | null
          on_site: boolean
          user_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          type: string
          class_type?: 'employee' | 'equipment'
          name: string
          identifier?: string | null
          model?: string | null
          vin?: string | null
          location?: string | null
          on_site?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          type?: string
          class_type?: 'employee' | 'equipment'
          name?: string
          identifier?: string | null
          model?: string | null
          vin?: string | null
          location?: string | null
          on_site?: boolean
          user_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      jobs: {
        Row: {
          id: string
          name: string
          job_number: string | null
          type: string
          shift: string
          notes: string | null
          start_time: string | null
          finalized: boolean
          plants: Json
          location: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          job_number?: string | null
          type?: string
          shift?: string
          notes?: string | null
          start_time?: string | null
          finalized?: boolean
          plants?: Json
          location?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          job_number?: string | null
          type?: string
          shift?: string
          notes?: string | null
          start_time?: string | null
          finalized?: boolean
          plants?: Json
          location?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      assignments: {
        Row: {
          id: string
          resource_id: string
          job_id: string
          row_type: string
          position: number | null
          attached_to_assignment_id: string | null
          time_slot: Json | null
          note: string | null
          truck_config: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          resource_id: string
          job_id: string
          row_type: string
          position?: number | null
          attached_to_assignment_id?: string | null
          time_slot?: Json | null
          note?: string | null
          truck_config?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          resource_id?: string
          job_id?: string
          row_type?: string
          position?: number | null
          attached_to_assignment_id?: string | null
          time_slot?: Json | null
          note?: string | null
          truck_config?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      magnet_interaction_rules: {
        Row: {
          id: string
          source_type: string
          target_type: string
          can_attach: boolean
          is_required: boolean
          max_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          source_type: string
          target_type: string
          can_attach?: boolean
          is_required?: boolean
          max_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          source_type?: string
          target_type?: string
          can_attach?: boolean
          is_required?: boolean
          max_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      drop_rules: {
        Row: {
          id: string
          row_type: string
          allowed_types: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          row_type: string
          allowed_types?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          row_type?: string
          allowed_types?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      job_row_configs: {
        Row: {
          id: string
          job_id: string
          row_type: string
          is_split: boolean
          boxes: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          job_id: string
          row_type: string
          is_split?: boolean
          boxes?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          row_type?: string
          is_split?: boolean
          boxes?: Json
          created_at?: string
          updated_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          action: string
          entity_type: string
          entity_id: string | null
          old_value: Json | null
          new_value: Json | null
          change_details: Json | null
          ip_address: string | null
          user_agent: string | null
          timestamp: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          action: string
          entity_type: string
          entity_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          change_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          action?: string
          entity_type?: string
          entity_id?: string | null
          old_value?: Json | null
          new_value?: Json | null
          change_details?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          timestamp?: string
        }
      }
      truck_driver_assignments: {
        Row: {
          id: string
          truck_id: string
          driver_id: string
          created_at: string
        }
        Insert: {
          id?: string
          truck_id: string
          driver_id: string
          created_at?: string
        }
        Update: {
          id?: string
          truck_id?: string
          driver_id?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      move_assignment_group_atomic: {
        Args: {
          assignment_ids: string[]
          target_job_id: string
          target_row_type: string
          target_position?: number
          default_start_time?: string
        }
        Returns: {
          id: string
          resource_id: string
          job_id: string
          row_type: string
          position: number
          attached_to_assignment_id: string | null
        }[]
      }
      validate_assignment_rules: {
        Args: {
          p_resource_id: string
          p_job_id: string
          p_row_type: string
          p_attached_to_assignment_id?: string
          p_time_slot?: Json
        }
        Returns: {
          is_valid: boolean
          error_message: string
          validation_details: Json
        }[]
      }
      get_user_permissions: {
        Args: {
          user_uuid: string
        }
        Returns: {
          role: string
          certifications: Json
          skills: Json
          permissions: Json
          effective_permissions: string[]
        }[]
      }
      get_audit_trail: {
        Args: {
          entity_type_param: string
          entity_id_param?: string
          limit_param?: number
        }
        Returns: {
          id: string
          user_name: string
          action: string
          timestamp: string
          old_value: Json
          new_value: Json
          change_details: Json
        }[]
      }
    }
    Enums: {
      resource_type: 'operator' | 'driver' | 'striper' | 'foreman' | 'laborer' | 'privateDriver' | 'skidsteer' | 'paver' | 'excavator' | 'sweeper' | 'millingMachine' | 'grader' | 'dozer' | 'payloader' | 'roller' | 'equipment' | 'truck'
      row_type: 'Forman' | 'Equipment' | 'Sweeper' | 'Tack' | 'MPT' | 'crew' | 'trucks'
    }
  }
}