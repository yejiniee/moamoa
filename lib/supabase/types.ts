export type FundingStatus = 'active' | 'closed' | 'settled'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed'

// Convenience aliases (for component props)
export type Funding = Database['public']['Tables']['fundings']['Row']
export type Gift = Database['public']['Tables']['gifts']['Row']
export type Payment = Database['public']['Tables']['payments']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

export type Database = {
  public: {
    Tables: {
      fundings: {
        Row: {
          id: string
          creator_user_id: string | null
          title: string
          description: string | null
          image_url: string | null
          end_date: string
          share_token: string
          status: FundingStatus
          settled_at: string | null
          settled_amount: number | null
          settle_bank_name: string | null
          settle_account_number: string | null
          settle_account_holder: string | null
          created_at: string
        }
        Insert: {
          id?: string
          creator_user_id: string
          title: string
          description?: string | null
          image_url?: string | null
          end_date: string
          share_token: string
          status?: FundingStatus
          settled_at?: string | null
          settled_amount?: number | null
          settle_bank_name?: string | null
          settle_account_number?: string | null
          settle_account_holder?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          creator_user_id?: string | null
          title?: string
          description?: string | null
          image_url?: string | null
          end_date?: string
          share_token?: string
          status?: FundingStatus
          settled_at?: string | null
          settled_amount?: number | null
          settle_bank_name?: string | null
          settle_account_number?: string | null
          settle_account_holder?: string | null
          created_at?: string
        }
        Relationships: []
      }
      gifts: {
        Row: {
          id: string
          funding_id: string
          name: string
          target_amount: number
          description: string | null
          image_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          funding_id: string
          name: string
          target_amount: number
          description?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          funding_id?: string
          name?: string
          target_amount?: number
          description?: string | null
          image_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          id: string
          funding_id: string
          participant_name: string
          message: string | null
          amount: number
          order_id: string
          payment_key: string | null
          status: PaymentStatus
          created_at: string
        }
        Insert: {
          id?: string
          funding_id: string
          participant_name: string
          message?: string | null
          amount: number
          order_id: string
          payment_key?: string | null
          status?: PaymentStatus
          created_at?: string
        }
        Update: {
          id?: string
          funding_id?: string
          participant_name?: string
          message?: string | null
          amount?: number
          order_id?: string
          payment_key?: string | null
          status?: PaymentStatus
          created_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          user_id: string
          bank_name: string | null
          account_number: string | null
          account_holder: string | null
          updated_at: string
        }
        Insert: {
          user_id: string
          bank_name?: string | null
          account_number?: string | null
          account_holder?: string | null
          updated_at?: string
        }
        Update: {
          user_id?: string
          bank_name?: string | null
          account_number?: string | null
          account_holder?: string | null
          updated_at?: string
        }
        Relationships: []
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
