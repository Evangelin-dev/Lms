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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          entity_type: string
          id: string
          reason: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type: string
          id?: string
          reason?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_type?: string
          id?: string
          reason?: string | null
        }
        Relationships: []
      }
      course_access: {
        Row: {
          course_id: string
          created_at: string
          expires_at: string | null
          grant_reason: string
          granted_at: string
          granted_by: string | null
          id: string
          status: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          expires_at?: string | null
          grant_reason?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          expires_at?: string | null
          grant_reason?: string
          granted_at?: string
          granted_by?: string | null
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_access_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          access_duration_days: number | null
          category: string
          created_at: string
          created_by: string | null
          currency: string
          description: string
          discount_price: number | null
          duration_minutes: number
          id: string
          instructor_name: string
          is_free: boolean
          learning_outcomes: string[]
          level: string
          price: number
          short_description: string
          slug: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          access_duration_days?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          discount_price?: number | null
          duration_minutes?: number
          id?: string
          instructor_name?: string
          is_free?: boolean
          learning_outcomes?: string[]
          level?: string
          price?: number
          short_description?: string
          slug: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          access_duration_days?: number | null
          category?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string
          discount_price?: number | null
          duration_minutes?: number
          id?: string
          instructor_name?: string
          is_free?: boolean
          learning_outcomes?: string[]
          level?: string
          price?: number
          short_description?: string
          slug?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: []
      }
      lessons: {
        Row: {
          allow_downloads: boolean
          captions_reference: string | null
          course_id: string
          created_at: string
          description: string
          duration_seconds: number
          id: string
          is_preview: boolean
          section_title: string
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_provider: string | null
          video_reference: string | null
          visibility: string
        }
        Insert: {
          allow_downloads?: boolean
          captions_reference?: string | null
          course_id: string
          created_at?: string
          description?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          section_title?: string
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_provider?: string | null
          video_reference?: string | null
          visibility?: string
        }
        Update: {
          allow_downloads?: boolean
          captions_reference?: string | null
          course_id?: string
          created_at?: string
          description?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          section_title?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_provider?: string | null
          video_reference?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          course_id: string
          created_at: string
          currency: string
          id: string
          order_number: string
          payment_provider: string | null
          payment_reference: string | null
          refund_status: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          course_id: string
          created_at?: string
          currency?: string
          id?: string
          order_number: string
          payment_provider?: string | null
          payment_reference?: string | null
          refund_status?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          course_id?: string
          created_at?: string
          currency?: string
          id?: string
          order_number?: string
          payment_provider?: string | null
          payment_reference?: string | null
          refund_status?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      video_events: {
        Row: {
          event_type: string
          id: string
          lesson_id: string
          occurred_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          event_type: string
          id?: string
          lesson_id: string
          occurred_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          event_type?: string
          id?: string
          lesson_id?: string
          occurred_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      video_progress: {
        Row: {
          completed: boolean
          id: string
          last_position_seconds: number
          lesson_id: string
          updated_at: string
          user_id: string
          watched_seconds: number
        }
        Insert: {
          completed?: boolean
          id?: string
          last_position_seconds?: number
          lesson_id: string
          updated_at?: string
          user_id: string
          watched_seconds?: number
        }
        Update: {
          completed?: boolean
          id?: string
          last_position_seconds?: number
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watched_seconds?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_catalog_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      course_catalog_lessons: {
        Row: {
          course_id: string | null
          description: string | null
          duration_seconds: number | null
          id: string | null
          is_preview: boolean | null
          section_title: string | null
          sort_order: number | null
          title: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_published_preview_video: {
        Args: { _object_name: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
