export type FundingStatus = 'active' | 'closed'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed'

export interface Funding {
  id: string
  creator_email: string
  title: string
  description: string | null
  end_date: string
  share_token: string
  status: FundingStatus
  created_at: string
}

export interface Gift {
  id: string
  funding_id: string
  name: string
  target_amount: number
  description: string | null
  image_url: string | null
  created_at: string
}

export interface Payment {
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

export interface Database {
  public: {
    Tables: {
      fundings: {
        Row: Funding
        Insert: Omit<Funding, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Funding, 'id'>>
      }
      gifts: {
        Row: Gift
        Insert: Omit<Gift, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Gift, 'id'>>
      }
      payments: {
        Row: Payment
        Insert: Omit<Payment, 'id' | 'created_at'> & { id?: string; created_at?: string }
        Update: Partial<Omit<Payment, 'id'>>
      }
    }
  }
}
