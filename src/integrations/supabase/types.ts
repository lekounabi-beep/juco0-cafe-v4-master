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
          created_at?: string
          updated_at?: string
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
