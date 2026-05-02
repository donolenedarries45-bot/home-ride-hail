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
      approved_postal_codes: {
        Row: {
          area_name: string
          created_at: string
          postal_code: string
        }
        Insert: {
          area_name: string
          created_at?: string
          postal_code: string
        }
        Update: {
          area_name?: string
          created_at?: string
          postal_code?: string
        }
        Relationships: []
      }
      commission_settlements: {
        Row: {
          amount_cents: number
          created_at: string
          driver_id: string
          id: string
          method: Database["public"]["Enums"]["settlement_method"]
          notes: string | null
          recorded_by: string
          reference: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          driver_id: string
          id?: string
          method: Database["public"]["Enums"]["settlement_method"]
          notes?: string | null
          recorded_by: string
          reference?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          driver_id?: string
          id?: string
          method?: Database["public"]["Enums"]["settlement_method"]
          notes?: string | null
          recorded_by?: string
          reference?: string | null
        }
        Relationships: []
      }
      driver_applications: {
        Row: {
          address: string
          bio: string | null
          created_at: string
          full_name: string
          id: string
          id_number: string | null
          license_expiry: string | null
          license_number: string | null
          payfast_merchant_id: string | null
          phone: string | null
          postal_code: string
          profile_photo_path: string | null
          proof_of_address_path: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewer_notes: string | null
          status: Database["public"]["Enums"]["application_status"]
          user_id: string
          vehicle_color: string | null
          vehicle_make_model: string
          vehicle_photo_path: string | null
          vehicle_plate: string
          vehicle_seats: number | null
          vehicle_year: number | null
          years_driving: number | null
        }
        Insert: {
          address: string
          bio?: string | null
          created_at?: string
          full_name: string
          id?: string
          id_number?: string | null
          license_expiry?: string | null
          license_number?: string | null
          payfast_merchant_id?: string | null
          phone?: string | null
          postal_code: string
          profile_photo_path?: string | null
          proof_of_address_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id: string
          vehicle_color?: string | null
          vehicle_make_model: string
          vehicle_photo_path?: string | null
          vehicle_plate: string
          vehicle_seats?: number | null
          vehicle_year?: number | null
          years_driving?: number | null
        }
        Update: {
          address?: string
          bio?: string | null
          created_at?: string
          full_name?: string
          id?: string
          id_number?: string | null
          license_expiry?: string | null
          license_number?: string | null
          payfast_merchant_id?: string | null
          phone?: string | null
          postal_code?: string
          profile_photo_path?: string | null
          proof_of_address_path?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewer_notes?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          user_id?: string
          vehicle_color?: string | null
          vehicle_make_model?: string
          vehicle_photo_path?: string | null
          vehicle_plate?: string
          vehicle_seats?: number | null
          vehicle_year?: number | null
          years_driving?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_applications_postal_code_fkey"
            columns: ["postal_code"]
            isOneToOne: false
            referencedRelation: "approved_postal_codes"
            referencedColumns: ["postal_code"]
          },
        ]
      }
      driver_locations: {
        Row: {
          driver_id: string
          heading: number | null
          latitude: number
          longitude: number
          ride_id: string | null
          updated_at: string
        }
        Insert: {
          driver_id: string
          heading?: number | null
          latitude: number
          longitude: number
          ride_id?: string | null
          updated_at?: string
        }
        Update: {
          driver_id?: string
          heading?: number | null
          latitude?: number
          longitude?: number
          ride_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      driver_wallets: {
        Row: {
          balance_cents: number
          created_at: string
          driver_id: string
          is_suspended: boolean
          lifetime_commission_cents: number
          lifetime_earned_cents: number
          updated_at: string
        }
        Insert: {
          balance_cents?: number
          created_at?: string
          driver_id: string
          is_suspended?: boolean
          lifetime_commission_cents?: number
          lifetime_earned_cents?: number
          updated_at?: string
        }
        Update: {
          balance_cents?: number
          created_at?: string
          driver_id?: string
          is_suspended?: boolean
          lifetime_commission_cents?: number
          lifetime_earned_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ride_payments: {
        Row: {
          amount_cents: number
          created_at: string
          driver_id: string | null
          driver_payfast_merchant_id: string | null
          driver_share_cents: number
          id: string
          m_payment_id: string
          paid_at: string | null
          pf_payment_id: string | null
          platform_share_cents: number
          raw_itn: Json | null
          ride_id: string
          rider_id: string
          status: Database["public"]["Enums"]["payment_status"]
        }
        Insert: {
          amount_cents: number
          created_at?: string
          driver_id?: string | null
          driver_payfast_merchant_id?: string | null
          driver_share_cents: number
          id?: string
          m_payment_id: string
          paid_at?: string | null
          pf_payment_id?: string | null
          platform_share_cents: number
          raw_itn?: Json | null
          ride_id: string
          rider_id: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Update: {
          amount_cents?: number
          created_at?: string
          driver_id?: string | null
          driver_payfast_merchant_id?: string | null
          driver_share_cents?: number
          id?: string
          m_payment_id?: string
          paid_at?: string | null
          pf_payment_id?: string | null
          platform_share_cents?: number
          raw_itn?: Json | null
          ride_id?: string
          rider_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "ride_payments_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          accepted_at: string | null
          actual_fare: number | null
          completed_at: string | null
          created_at: string
          driver_id: string | null
          dropoff_address: string
          fare_estimate: number | null
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          pickup_address: string
          postal_code: string
          rider_id: string
          status: Database["public"]["Enums"]["ride_status"]
        }
        Insert: {
          accepted_at?: string | null
          actual_fare?: number | null
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          dropoff_address: string
          fare_estimate?: number | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address: string
          postal_code: string
          rider_id: string
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Update: {
          accepted_at?: string | null
          actual_fare?: number | null
          completed_at?: string | null
          created_at?: string
          driver_id?: string | null
          dropoff_address?: string
          fare_estimate?: number | null
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          pickup_address?: string
          postal_code?: string
          rider_id?: string
          status?: Database["public"]["Enums"]["ride_status"]
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          created_at: string
          id: string
          latitude: number | null
          longitude: number | null
          message: string | null
          resolution_notes: string | null
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          ride_id: string
          triggered_by: string
          triggered_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          ride_id: string
          triggered_by: string
          triggered_role: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number | null
          longitude?: number | null
          message?: string | null
          resolution_notes?: string | null
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          ride_id?: string
          triggered_by?: string
          triggered_role?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_cents: number
          balance_after_cents: number
          created_at: string
          description: string | null
          driver_id: string
          id: string
          ride_id: string | null
          settlement_id: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
        }
        Insert: {
          amount_cents: number
          balance_after_cents: number
          created_at?: string
          description?: string | null
          driver_id: string
          id?: string
          ride_id?: string | null
          settlement_id?: string | null
          type: Database["public"]["Enums"]["wallet_tx_type"]
        }
        Update: {
          amount_cents?: number
          balance_after_cents?: number
          created_at?: string
          description?: string | null
          driver_id?: string
          id?: string
          ride_id?: string | null
          settlement_id?: string | null
          type?: Database["public"]["Enums"]["wallet_tx_type"]
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      driver_in_good_standing: {
        Args: { _driver_id: string }
        Returns: boolean
      }
      ensure_driver_wallet: { Args: { _driver_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "driver" | "rider"
      application_status: "pending" | "approved" | "rejected"
      payment_status: "pending" | "paid" | "failed" | "cancelled"
      ride_status:
        | "requested"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
      settlement_method: "eft" | "cash" | "other"
      wallet_tx_type: "commission" | "topup" | "adjustment"
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
      app_role: ["admin", "driver", "rider"],
      application_status: ["pending", "approved", "rejected"],
      payment_status: ["pending", "paid", "failed", "cancelled"],
      ride_status: [
        "requested",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      settlement_method: ["eft", "cash", "other"],
      wallet_tx_type: ["commission", "topup", "adjustment"],
    },
  },
} as const
