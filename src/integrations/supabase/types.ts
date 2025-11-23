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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          attendance_end: string
          attendance_start: string
          collection_sheet_url: string | null
          created_at: string
          face_recognition_required: boolean
          geofence_radius_meters: number
          gps_accuracy_meters: number
          grace_minutes: number
          id: string
          market_video_end: string
          market_video_start: string
          org_email: string | null
          org_name: string
          outside_rates_end: string
          outside_rates_start: string
          primary_color: string
          retention_days: number
          secondary_color: string
          updated_at: string
        }
        Insert: {
          attendance_end?: string
          attendance_start?: string
          collection_sheet_url?: string | null
          created_at?: string
          face_recognition_required?: boolean
          geofence_radius_meters?: number
          gps_accuracy_meters?: number
          grace_minutes?: number
          id?: string
          market_video_end?: string
          market_video_start?: string
          org_email?: string | null
          org_name?: string
          outside_rates_end?: string
          outside_rates_start?: string
          primary_color?: string
          retention_days?: number
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          attendance_end?: string
          attendance_start?: string
          collection_sheet_url?: string | null
          created_at?: string
          face_recognition_required?: boolean
          geofence_radius_meters?: number
          gps_accuracy_meters?: number
          grace_minutes?: number
          id?: string
          market_video_end?: string
          market_video_start?: string
          org_email?: string | null
          org_name?: string
          outside_rates_end?: string
          outside_rates_start?: string
          primary_color?: string
          retention_days?: number
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_inventory: {
        Row: {
          asset_name: string
          available_quantity: number
          created_at: string
          description: string | null
          id: string
          issued_quantity: number
          total_quantity: number
          unit_price: number | null
          updated_at: string
        }
        Insert: {
          asset_name: string
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          issued_quantity?: number
          total_quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Update: {
          asset_name?: string
          available_quantity?: number
          created_at?: string
          description?: string | null
          id?: string
          issued_quantity?: number
          total_quantity?: number
          unit_price?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      asset_payments: {
        Row: {
          amount_received: number
          asset_id: string
          created_at: string
          id: string
          payment_date: string
          payment_mode: string
          payment_proof_url: string | null
          request_id: string
          requester_id: string
          updated_at: string
          verification_notes: string | null
          verification_status: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount_received: number
          asset_id: string
          created_at?: string
          id?: string
          payment_date: string
          payment_mode: string
          payment_proof_url?: string | null
          request_id: string
          requester_id: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount_received?: number
          asset_id?: string
          created_at?: string
          id?: string
          payment_date?: string
          payment_mode?: string
          payment_proof_url?: string | null
          request_id?: string
          requester_id?: string
          updated_at?: string
          verification_notes?: string | null
          verification_status?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_payments_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "asset_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_requests: {
        Row: {
          actual_return_date: string | null
          approval_date: string | null
          approved_by: string | null
          asset_id: string
          created_at: string
          expected_return_date: string | null
          id: string
          market_id: string | null
          purpose: string
          quantity: number
          rejection_reason: string | null
          remarks: string | null
          request_date: string
          requester_id: string
          requester_role: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_return_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          asset_id: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          market_id?: string | null
          purpose: string
          quantity: number
          rejection_reason?: string | null
          remarks?: string | null
          request_date?: string
          requester_id: string
          requester_role: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_return_date?: string | null
          approval_date?: string | null
          approved_by?: string | null
          asset_id?: string
          created_at?: string
          expected_return_date?: string | null
          id?: string
          market_id?: string | null
          purpose?: string
          quantity?: number
          rejection_reason?: string | null
          remarks?: string | null
          request_date?: string
          requester_id?: string
          requester_role?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_requests_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "asset_inventory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asset_requests_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      assets_money_recovery: {
        Row: {
          created_at: string
          farmer_name: string
          id: string
          item_name: string
          pending_amount: number
          received_amount: number
          session_id: string
          stall_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_name: string
          id?: string
          item_name: string
          pending_amount?: number
          received_amount?: number
          session_id: string
          stall_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_name?: string
          id?: string
          item_name?: string
          pending_amount?: number
          received_amount?: number
          session_id?: string
          stall_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_money_recovery_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      assets_usage: {
        Row: {
          asset_name: string
          created_at: string
          employee_name: string
          id: string
          market_id: string
          quantity: number
          return_date: string | null
          session_id: string
          updated_at: string
        }
        Insert: {
          asset_name: string
          created_at?: string
          employee_name: string
          id?: string
          market_id: string
          quantity?: number
          return_date?: string | null
          session_id: string
          updated_at?: string
        }
        Update: {
          asset_name?: string
          created_at?: string
          employee_name?: string
          id?: string
          market_id?: string
          quantity?: number
          return_date?: string | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_usage_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      bdo_market_submissions: {
        Row: {
          created_at: string
          customer_reach: string | null
          documents_status: string | null
          documents_uploaded_at: string | null
          flats_occupancy: string | null
          google_map_location: string
          id: string
          location_type: string
          market_id: string | null
          market_name: string
          market_opening_date: string | null
          rent: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          service_agreement_url: string | null
          stalls_accommodation_count: number | null
          status: string
          submission_date: string
          submission_metadata: Json | null
          submitted_by: string
          updated_at: string
          video_file_name: string | null
          video_url: string | null
        }
        Insert: {
          created_at?: string
          customer_reach?: string | null
          documents_status?: string | null
          documents_uploaded_at?: string | null
          flats_occupancy?: string | null
          google_map_location: string
          id?: string
          location_type: string
          market_id?: string | null
          market_name: string
          market_opening_date?: string | null
          rent?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_agreement_url?: string | null
          stalls_accommodation_count?: number | null
          status?: string
          submission_date?: string
          submission_metadata?: Json | null
          submitted_by: string
          updated_at?: string
          video_file_name?: string | null
          video_url?: string | null
        }
        Update: {
          created_at?: string
          customer_reach?: string | null
          documents_status?: string | null
          documents_uploaded_at?: string | null
          flats_occupancy?: string | null
          google_map_location?: string
          id?: string
          location_type?: string
          market_id?: string | null
          market_name?: string
          market_opening_date?: string | null
          rent?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          service_agreement_url?: string | null
          stalls_accommodation_count?: number | null
          status?: string
          submission_date?: string
          submission_metadata?: Json | null
          submitted_by?: string
          updated_at?: string
          video_file_name?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bdo_market_submissions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      bdo_stall_submissions: {
        Row: {
          address: string
          contact_number: string
          created_at: string
          date_of_starting_markets: string
          farmer_name: string
          id: string
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          stall_name: string
          status: string
          submitted_at: string
          submitted_by: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_number: string
          created_at?: string
          date_of_starting_markets: string
          farmer_name: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stall_name: string
          status?: string
          submitted_at?: string
          submitted_by: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_number?: string
          created_at?: string
          date_of_starting_markets?: string
          farmer_name?: string
          id?: string
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          stall_name?: string
          status?: string
          submitted_at?: string
          submitted_by?: string
          updated_at?: string
        }
        Relationships: []
      }
      bms_stall_feedbacks: {
        Row: {
          created_at: string
          feedback_text: string | null
          id: string
          rating: number | null
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          feedback_text?: string | null
          id?: string
          rating?: number | null
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bms_stall_feedbacks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          amount: number
          collection_date: string
          created_at: string
          id: string
          market_id: string
          notes: string | null
        }
        Insert: {
          amount: number
          collection_date: string
          created_at?: string
          id?: string
          market_id: string
          notes?: string | null
        }
        Update: {
          amount?: number
          collection_date?: string
          created_at?: string
          id?: string
          market_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          session_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          session_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_allocations: {
        Row: {
          created_at: string
          employee_name: string
          id: string
          market_id: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_name: string
          id?: string
          market_id: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_name?: string
          id?: string
          market_id?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_allocations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_allocations_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_leaves: {
        Row: {
          approved_by: string | null
          created_at: string
          id: string
          leave_date: string
          reason: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          id?: string
          leave_date: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          id?: string
          leave_date?: string
          reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          status: string
          username: string | null
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          phone?: string | null
          status?: string
          username?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          status?: string
          username?: string | null
        }
        Relationships: []
      }
      farmers: {
        Row: {
          address: string | null
          contact_phone: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_phone: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_phone?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      market_inspection_updates: {
        Row: {
          created_at: string
          id: string
          market_id: string
          session_id: string
          update_notes: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_id: string
          session_id: string
          update_notes: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          market_id?: string
          session_id?: string
          update_notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_inspection_updates_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "market_inspection_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_land_search: {
        Row: {
          address: string
          contact_name: string
          contact_phone: string
          created_at: string
          id: string
          is_finalized: boolean
          opening_date: string | null
          place_name: string
          session_id: string
          updated_at: string
        }
        Insert: {
          address: string
          contact_name: string
          contact_phone: string
          created_at?: string
          id?: string
          is_finalized?: boolean
          opening_date?: string | null
          place_name: string
          session_id: string
          updated_at?: string
        }
        Update: {
          address?: string
          contact_name?: string
          contact_phone?: string
          created_at?: string
          id?: string
          is_finalized?: boolean
          opening_date?: string | null
          place_name?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_land_search_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_manager_punchin: {
        Row: {
          created_at: string
          gps_lat: number
          gps_lng: number
          id: string
          punched_at: string
          selfie_url: string
          session_id: string
        }
        Insert: {
          created_at?: string
          gps_lat: number
          gps_lng: number
          id?: string
          punched_at?: string
          selfie_url: string
          session_id: string
        }
        Update: {
          created_at?: string
          gps_lat?: number
          gps_lng?: number
          id?: string
          punched_at?: string
          selfie_url?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_manager_punchin_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_manager_punchout: {
        Row: {
          created_at: string
          gps_lat: number
          gps_lng: number
          id: string
          punched_at: string
          session_id: string
        }
        Insert: {
          created_at?: string
          gps_lat: number
          gps_lng: number
          id?: string
          punched_at?: string
          session_id: string
        }
        Update: {
          created_at?: string
          gps_lat?: number
          gps_lng?: number
          id?: string
          punched_at?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_manager_punchout_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      market_manager_sessions: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          session_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          session_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          session_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      market_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          is_active: boolean
          market_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          is_active?: boolean
          market_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          is_active?: boolean
          market_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "market_schedule_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      markets: {
        Row: {
          city: string | null
          created_at: string
          id: string
          location: string
          name: string
        }
        Insert: {
          city?: string | null
          created_at?: string
          id?: string
          location: string
          name: string
        }
        Update: {
          city?: string | null
          created_at?: string
          id?: string
          location?: string
          name?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          captured_at: string
          content_type: string
          created_at: string
          file_name: string
          file_url: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          is_late: boolean
          market_id: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          session_id: string
        }
        Insert: {
          captured_at?: string
          content_type: string
          created_at?: string
          file_name: string
          file_url: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_late?: boolean
          market_id?: string | null
          media_type: Database["public"]["Enums"]["media_type"]
          session_id: string
        }
        Update: {
          captured_at?: string
          content_type?: string
          created_at?: string
          file_name?: string
          file_url?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          is_late?: boolean
          market_id?: string | null
          media_type?: Database["public"]["Enums"]["media_type"]
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      next_day_planning: {
        Row: {
          created_at: string
          id: string
          market_date: string
          market_id: string
          next_day_market_name: string
          session_id: string | null
          stall_list: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          market_date?: string
          market_id: string
          next_day_market_name: string
          session_id?: string | null
          stall_list: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          market_date?: string
          market_id?: string
          next_day_market_name?: string
          session_id?: string | null
          stall_list?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "next_day_planning_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "next_day_planning_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      non_available_commodities: {
        Row: {
          commodity_name: string
          created_at: string
          id: string
          market_date: string
          market_id: string
          notes: string | null
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commodity_name: string
          created_at?: string
          id?: string
          market_date?: string
          market_id: string
          notes?: string | null
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commodity_name?: string
          created_at?: string
          id?: string
          market_date?: string
          market_id?: string
          notes?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "non_available_commodities_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "non_available_commodities_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          read_at: string | null
          sent_by: string | null
          target_user_id: string | null
          title: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          sent_by?: string | null
          target_user_id?: string | null
          title: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          read_at?: string | null
          sent_by?: string | null
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          category: string
          commodity_name: string
          created_at: string
          id: string
          market_date: string
          market_id: string
          notes: string | null
          price: number | null
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          commodity_name: string
          created_at?: string
          id?: string
          market_date?: string
          market_id: string
          notes?: string | null
          price?: number | null
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          commodity_name?: string
          created_at?: string
          id?: string
          market_date?: string
          market_id?: string
          notes?: string | null
          price?: number | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      organiser_feedback: {
        Row: {
          created_at: string
          difficulties: string | null
          feedback: string | null
          id: string
          market_date: string
          market_id: string
          session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulties?: string | null
          feedback?: string | null
          id?: string
          market_date?: string
          market_id: string
          session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulties?: string | null
          feedback?: string | null
          id?: string
          market_date?: string
          market_id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organiser_feedback_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organiser_feedback_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string
          finalized_at: string | null
          id: string
          market_id: string
          punch_in_time: string | null
          punch_out_time: string | null
          session_date: string
          status: Database["public"]["Enums"]["session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          finalized_at?: string | null
          id?: string
          market_id: string
          punch_in_time?: string | null
          punch_out_time?: string | null
          session_date: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          finalized_at?: string | null
          id?: string
          market_id?: string
          punch_in_time?: string | null
          punch_out_time?: string | null
          session_date?: string
          status?: Database["public"]["Enums"]["session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_confirmations: {
        Row: {
          created_at: string
          created_by: string
          farmer_name: string
          id: string
          market_date: string
          market_id: string
          stall_name: string
          stall_no: string
        }
        Insert: {
          created_at?: string
          created_by: string
          farmer_name: string
          id?: string
          market_date: string
          market_id: string
          stall_name: string
          stall_no: string
        }
        Update: {
          created_at?: string
          created_by?: string
          farmer_name?: string
          id?: string
          market_date?: string
          market_id?: string
          stall_name?: string
          stall_no?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_confirmations_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_inspections: {
        Row: {
          created_at: string
          farmer_name: string
          feedback: string | null
          id: string
          market_id: string
          rating: number | null
          session_id: string
          stall_name: string
          stall_no: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_name: string
          feedback?: string | null
          id?: string
          market_id: string
          rating?: number | null
          session_id: string
          stall_name: string
          stall_no?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_name?: string
          feedback?: string | null
          id?: string
          market_id?: string
          rating?: number | null
          session_id?: string
          stall_name?: string
          stall_no?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_inspections_market_id_fkey"
            columns: ["market_id"]
            isOneToOne: false
            referencedRelation: "markets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stall_inspections_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stall_searching_updates: {
        Row: {
          contact_phone: string
          created_at: string
          farmer_name: string
          id: string
          is_interested: boolean
          joining_date: string | null
          session_id: string
          stall_name: string
          updated_at: string
        }
        Insert: {
          contact_phone: string
          created_at?: string
          farmer_name: string
          id?: string
          is_interested?: boolean
          joining_date?: string | null
          session_id: string
          stall_name: string
          updated_at?: string
        }
        Update: {
          contact_phone?: string
          created_at?: string
          farmer_name?: string
          id?: string
          is_interested?: boolean
          joining_date?: string | null
          session_id?: string
          stall_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stall_searching_updates_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "market_manager_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stalls: {
        Row: {
          created_at: string
          farmer_name: string
          id: string
          session_id: string
          stall_name: string
          stall_no: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          farmer_name: string
          id?: string
          session_id: string
          stall_name: string
          stall_no: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          farmer_name?: string
          id?: string
          session_id?: string
          stall_name?: string
          stall_no?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stalls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      media_type: "outside_rates" | "selfie_gps" | "cash_deposit"
      session_status: "active" | "finalized" | "locked" | "completed"
      user_role:
        | "employee"
        | "admin"
        | "market_manager"
        | "bms_executive"
        | "bdo"
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
      media_type: ["outside_rates", "selfie_gps", "cash_deposit"],
      session_status: ["active", "finalized", "locked", "completed"],
      user_role: [
        "employee",
        "admin",
        "market_manager",
        "bms_executive",
        "bdo",
      ],
    },
  },
} as const
