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
      profiles: {
        Row: {
          id: string
          user_id: string
          full_name: string | null
          phone: string | null
          email: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string | null
          phone?: string | null
          email?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      addresses: {
        Row: {
          id: string
          user_id: string
          label: string
          address: string
          lat: number | null
          lng: number | null
          notes: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          label?: string
          address: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          label?: string
          address?: string
          lat?: number | null
          lng?: number | null
          notes?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      favorite_orders: {
        Row: {
          id: string
          user_id: string
          items: Json
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          items: Json
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          items?: Json
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          items: Json
          subtotal: number
          delivery_fee: number
          total: number
          customer_name: string
          customer_phone: string
          customer_email: string | null
          address: string
          address_notes: string | null
          lat: number | null
          lng: number | null
          payment_method: string
          payment_status: string
          notes: string | null
          status: string
          viva_transaction_id: string | null
          user_id: string | null
          delivery_status: string
          driver_id: string | null
          estimated_delivery_eta: string | null
          pickup_time: string | null
          delivery_time: string | null
          delivery_distance_km: number | null
          delivery_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          items: Json
          subtotal: number
          delivery_fee: number
          total: number
          customer_name: string
          customer_phone: string
          customer_email?: string | null
          address: string
          address_notes?: string | null
          lat?: number | null
          lng?: number | null
          payment_method: string
          payment_status: string
          notes?: string | null
          status?: string
          viva_transaction_id?: string | null
          user_id?: string | null
          delivery_status?: string
          driver_id?: string | null
          estimated_delivery_eta?: string | null
          pickup_time?: string | null
          delivery_time?: string | null
          delivery_distance_km?: number | null
          delivery_notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          items?: Json
          subtotal?: number
          delivery_fee?: number
          total?: number
          customer_name?: string
          customer_phone?: string
          customer_email?: string | null
          address?: string
          address_notes?: string | null
          lat?: number | null
          lng?: number | null
          payment_method?: string
          payment_status?: string
          notes?: string | null
          status?: string
          viva_transaction_id?: string | null
          user_id?: string | null
          delivery_status?: string
          driver_id?: string | null
          estimated_delivery_eta?: string | null
          pickup_time?: string | null
          delivery_time?: string | null
          delivery_distance_km?: number | null
          delivery_notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      drivers: {
        Row: {
          id: string
          user_id: string
          full_name: string
          phone: string
          email: string | null
          vehicle_type: string
          vehicle_plate: string | null
          availability_status: string
          current_location_lat: number | null
          current_location_lng: number | null
          last_location_update: string | null
          total_deliveries: number
          rating: number | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          full_name: string
          phone: string
          email?: string | null
          vehicle_type?: string
          vehicle_plate?: string | null
          availability_status?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          last_location_update?: string | null
          total_deliveries?: number
          rating?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          full_name?: string
          phone?: string
          email?: string | null
          vehicle_type?: string
          vehicle_plate?: string | null
          availability_status?: string
          current_location_lat?: number | null
          current_location_lng?: number | null
          last_location_update?: string | null
          total_deliveries?: number
          rating?: number | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      delivery_assignments: {
        Row: {
          id: string
          order_id: string
          driver_id: string
          assigned_at: string
          accepted_at: string | null
          picked_up_at: string | null
          started_delivery_at: string | null
          arrived_at: string | null
          delivered_at: string | null
          cancelled_at: string | null
          cancellation_reason: string | null
        }
        Insert: {
          id?: string
          order_id: string
          driver_id: string
          assigned_at?: string
          accepted_at?: string | null
          picked_up_at?: string | null
          started_delivery_at?: string | null
          arrived_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          driver_id?: string
          assigned_at?: string
          accepted_at?: string | null
          picked_up_at?: string | null
          started_delivery_at?: string | null
          arrived_at?: string | null
          delivered_at?: string | null
          cancelled_at?: string | null
          cancellation_reason?: string | null
        }
      }
      delivery_locations: {
        Row: {
          id: string
          delivery_assignment_id: string
          driver_id: string
          lat: number
          lng: number
          accuracy: number | null
          speed: number | null
          heading: number | null
          recorded_at: string
        }
        Insert: {
          id?: string
          delivery_assignment_id: string
          driver_id: string
          lat: number
          lng: number
          accuracy?: number | null
          speed?: number | null
          heading?: number | null
          recorded_at?: string
        }
        Update: {
          id?: string
          delivery_assignment_id?: string
          driver_id?: string
          lat?: number
          lng?: number
          accuracy?: number | null
          speed?: number | null
          heading?: number | null
          recorded_at?: string
        }
      }
      feedback: {
        Row: {
          id: string
          order_id: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
      }
    }
  }
}

export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
