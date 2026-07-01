// Generated from the live WineSnob schema via the Supabase MCP
// (`generate_typescript_types`). Regenerate after schema changes.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      bottles: {
        Row: {
          area: string | null
          buy_again: boolean
          cellar_id: string
          colour: string | null
          country: string | null
          created_at: string
          drink_from: number | null
          drink_to: number | null
          format: string
          grapes: string[]
          id: string
          location: string | null
          name: string
          note: string
          paid: number | null
          producer: string | null
          quantity: number
          rating: number
          region: string | null
          score: number
          status: string | null
          unit: number
          user_id: string
          vintage: string | null
        }
        Insert: {
          area?: string | null
          buy_again?: boolean
          cellar_id: string
          colour?: string | null
          country?: string | null
          created_at?: string
          drink_from?: number | null
          drink_to?: number | null
          format?: string
          grapes?: string[]
          id: string
          location?: string | null
          name: string
          note?: string
          paid?: number | null
          producer?: string | null
          quantity?: number
          rating?: number
          region?: string | null
          score?: number
          status?: string | null
          unit?: number
          user_id: string
          vintage?: string | null
        }
        Update: Partial<Database['public']['Tables']['bottles']['Insert']>
        Relationships: []
      }
      cellars: {
        Row: { created_at: string; id: string; name: string; position: number; user_id: string }
        Insert: { created_at?: string; id: string; name?: string; position?: number; user_id: string }
        Update: Partial<Database['public']['Tables']['cellars']['Insert']>
        Relationships: []
      }
      custom_collections: {
        Row: { created_at: string; description: string | null; id: string; ids: string[]; title: string; user_id: string }
        Insert: { created_at?: string; description?: string | null; id: string; ids?: string[]; title: string; user_id: string }
        Update: Partial<Database['public']['Tables']['custom_collections']['Insert']>
        Relationships: []
      }
      drinks: {
        Row: {
          area: string | null
          bottle_id: string | null
          buy_again: boolean
          cellar_id: string | null
          colour: string | null
          companions: string | null
          created_at: string
          date: string | null
          drink_from: number | null
          drink_to: number | null
          format: string | null
          id: string
          name: string | null
          note: string | null
          occasion: string | null
          producer: string | null
          rating: number | null
          region: string | null
          user_id: string
          vintage: string | null
        }
        Insert: {
          area?: string | null
          bottle_id?: string | null
          buy_again?: boolean
          cellar_id?: string | null
          colour?: string | null
          companions?: string | null
          created_at?: string
          date?: string | null
          drink_from?: number | null
          drink_to?: number | null
          format?: string | null
          id: string
          name?: string | null
          note?: string | null
          occasion?: string | null
          producer?: string | null
          rating?: number | null
          region?: string | null
          user_id: string
          vintage?: string | null
        }
        Update: Partial<Database['public']['Tables']['drinks']['Insert']>
        Relationships: []
      }
      profiles: {
        Row: {
          active_cellar: string
          auto_value: boolean
          created_at: string
          currency: string
          default_view: string
          email: string | null
          household: boolean
          log_stat_keys: string[]
          measure: string
          name: string
          onboarded: boolean
          plan: string
          price_cadence: string
          reminders: boolean
          share: boolean
          stat_keys: string[]
          updated_at: string
          user_id: string
          view: string
          weekly: boolean
        }
        Insert: {
          active_cellar?: string
          auto_value?: boolean
          created_at?: string
          currency?: string
          default_view?: string
          email?: string | null
          household?: boolean
          log_stat_keys?: string[]
          measure?: string
          name?: string
          onboarded?: boolean
          plan?: string
          price_cadence?: string
          reminders?: boolean
          share?: boolean
          stat_keys?: string[]
          updated_at?: string
          user_id: string
          view?: string
          weekly?: boolean
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      wishlist: {
        Row: {
          created_at: string
          id: string
          name: string
          note: string | null
          priority: string
          producer: string | null
          region: string | null
          target_price: number | null
          user_id: string
          vintage: string | null
        }
        Insert: {
          created_at?: string
          id: string
          name: string
          note?: string | null
          priority?: string
          producer?: string | null
          region?: string | null
          target_price?: number | null
          user_id: string
          vintage?: string | null
        }
        Update: Partial<Database['public']['Tables']['wishlist']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
