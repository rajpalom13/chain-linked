/**
 * Database Types for Supabase
 * @description TypeScript types matching the Supabase database schema
 * @module types/database
 */

/**
 * JSON type for flexible JSONB columns
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

/**
 * Database schema type definition
 */
export interface Database {
  public: {
    Tables: {
      /** User accounts with Google OAuth integration */
      users: {
        Row: {
          id: string
          google_id: string | null
          email: string
          name: string | null
          avatar_url: string | null
          linkedin_profile_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          google_id?: string | null
          email: string
          name?: string | null
          avatar_url?: string | null
          linkedin_profile_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          google_id?: string | null
          email?: string
          name?: string | null
          avatar_url?: string | null
          linkedin_profile_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** LinkedIn profile snapshots */
      linkedin_profiles: {
        Row: {
          id: string
          user_id: string
          profile_urn: string
          public_identifier: string | null
          first_name: string | null
          last_name: string | null
          headline: string | null
          location: string | null
          profile_picture_url: string | null
          background_image_url: string | null
          connections_count: number | null
          followers_count: number | null
          raw_data: Json | null
          captured_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          profile_urn: string
          public_identifier?: string | null
          first_name?: string | null
          last_name?: string | null
          headline?: string | null
          location?: string | null
          profile_picture_url?: string | null
          background_image_url?: string | null
          connections_count?: number | null
          followers_count?: number | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          profile_urn?: string
          public_identifier?: string | null
          first_name?: string | null
          last_name?: string | null
          headline?: string | null
          location?: string | null
          profile_picture_url?: string | null
          background_image_url?: string | null
          connections_count?: number | null
          followers_count?: number | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Creator analytics snapshots */
      linkedin_analytics: {
        Row: {
          id: string
          user_id: string
          page_type: string
          impressions: number | null
          members_reached: number | null
          engagements: number | null
          new_followers: number | null
          profile_views: number | null
          search_appearances: number | null
          top_posts: Json | null
          raw_data: Json | null
          captured_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          page_type: string
          impressions?: number | null
          members_reached?: number | null
          engagements?: number | null
          new_followers?: number | null
          profile_views?: number | null
          search_appearances?: number | null
          top_posts?: Json | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          page_type?: string
          impressions?: number | null
          members_reached?: number | null
          engagements?: number | null
          new_followers?: number | null
          profile_views?: number | null
          search_appearances?: number | null
          top_posts?: Json | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** 90-day trend data */
      analytics_history: {
        Row: {
          id: string
          user_id: string
          date: string
          impressions: number | null
          members_reached: number | null
          engagements: number | null
          followers: number | null
          profile_views: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          impressions?: number | null
          members_reached?: number | null
          engagements?: number | null
          followers?: number | null
          profile_views?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          impressions?: number | null
          members_reached?: number | null
          engagements?: number | null
          followers?: number | null
          profile_views?: number | null
          created_at?: string
        }
        Relationships: []
      }
      /** Individual post performance */
      post_analytics: {
        Row: {
          id: string
          user_id: string
          activity_urn: string
          post_content: string | null
          post_type: string | null
          impressions: number | null
          members_reached: number | null
          unique_views: number | null
          reactions: number | null
          comments: number | null
          reposts: number | null
          engagement_rate: number | null
          profile_viewers: number | null
          followers_gained: number | null
          demographics: Json | null
          raw_data: Json | null
          captured_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_urn: string
          post_content?: string | null
          post_type?: string | null
          impressions?: number | null
          members_reached?: number | null
          unique_views?: number | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          engagement_rate?: number | null
          profile_viewers?: number | null
          followers_gained?: number | null
          demographics?: Json | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_urn?: string
          post_content?: string | null
          post_type?: string | null
          impressions?: number | null
          members_reached?: number | null
          unique_views?: number | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          engagement_rate?: number | null
          profile_viewers?: number | null
          followers_gained?: number | null
          demographics?: Json | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Follower demographics and audience info */
      audience_data: {
        Row: {
          id: string
          user_id: string
          total_followers: number | null
          follower_growth: number | null
          demographics_preview: Json | null
          top_job_titles: Json | null
          top_companies: Json | null
          top_locations: Json | null
          top_industries: Json | null
          raw_data: Json | null
          captured_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          total_followers?: number | null
          follower_growth?: number | null
          demographics_preview?: Json | null
          top_job_titles?: Json | null
          top_companies?: Json | null
          top_locations?: Json | null
          top_industries?: Json | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          total_followers?: number | null
          follower_growth?: number | null
          demographics_preview?: Json | null
          top_job_titles?: Json | null
          top_companies?: Json | null
          top_locations?: Json | null
          top_industries?: Json | null
          raw_data?: Json | null
          captured_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** User's own posts */
      my_posts: {
        Row: {
          id: string
          user_id: string
          activity_urn: string
          content: string | null
          media_type: string | null
          reactions: number | null
          comments: number | null
          reposts: number | null
          impressions: number | null
          posted_at: string | null
          raw_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_urn: string
          content?: string | null
          media_type?: string | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          impressions?: number | null
          posted_at?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_urn?: string
          content?: string | null
          media_type?: string | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          impressions?: number | null
          posted_at?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Posts captured from LinkedIn feed */
      feed_posts: {
        Row: {
          id: string
          user_id: string
          activity_urn: string
          author_urn: string | null
          author_name: string | null
          author_headline: string | null
          author_profile_url: string | null
          content: string | null
          hashtags: Json | null
          media_type: string | null
          reactions: number | null
          comments: number | null
          reposts: number | null
          engagement_score: number | null
          posted_at: string | null
          raw_data: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_urn: string
          author_urn?: string | null
          author_name?: string | null
          author_headline?: string | null
          author_profile_url?: string | null
          content?: string | null
          hashtags?: Json | null
          media_type?: string | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          engagement_score?: number | null
          posted_at?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_urn?: string
          author_urn?: string | null
          author_name?: string | null
          author_headline?: string | null
          author_profile_url?: string | null
          content?: string | null
          hashtags?: Json | null
          media_type?: string | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          engagement_score?: number | null
          posted_at?: string | null
          raw_data?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Scheduled posts queue */
      scheduled_posts: {
        Row: {
          id: string
          user_id: string
          content: string
          media_urls: Json | null
          scheduled_for: string
          timezone: string | null
          status: string
          posted_at: string | null
          linkedin_post_id: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          media_urls?: Json | null
          scheduled_for: string
          timezone?: string | null
          status?: string
          posted_at?: string | null
          linkedin_post_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          media_urls?: Json | null
          scheduled_for?: string
          timezone?: string | null
          status?: string
          posted_at?: string | null
          linkedin_post_id?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Post templates */
      templates: {
        Row: {
          id: string
          user_id: string | null
          team_id: string | null
          name: string
          content: string
          category: string | null
          tags: Json | null
          is_public: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          team_id?: string | null
          name: string
          content: string
          category?: string | null
          tags?: Json | null
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          team_id?: string | null
          name?: string
          content?: string
          category?: string | null
          tags?: Json | null
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Inspiration/viral posts */
      inspiration_posts: {
        Row: {
          id: string
          author_name: string | null
          author_headline: string | null
          author_profile_url: string | null
          author_avatar_url: string | null
          content: string
          category: string | null
          niche: string | null
          reactions: number | null
          comments: number | null
          reposts: number | null
          engagement_score: number | null
          posted_at: string | null
          source: string | null
          created_at: string
        }
        Insert: {
          id?: string
          author_name?: string | null
          author_headline?: string | null
          author_profile_url?: string | null
          author_avatar_url?: string | null
          content: string
          category?: string | null
          niche?: string | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          engagement_score?: number | null
          posted_at?: string | null
          source?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          author_name?: string | null
          author_headline?: string | null
          author_profile_url?: string | null
          author_avatar_url?: string | null
          content?: string
          category?: string | null
          niche?: string | null
          reactions?: number | null
          comments?: number | null
          reposts?: number | null
          engagement_score?: number | null
          posted_at?: string | null
          source?: string | null
          created_at?: string
        }
        Relationships: []
      }
      /** Swipe preferences for AI learning */
      swipe_preferences: {
        Row: {
          id: string
          user_id: string
          post_id: string | null
          suggestion_content: string | null
          action: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          post_id?: string | null
          suggestion_content?: string | null
          action: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          post_id?: string | null
          suggestion_content?: string | null
          action?: string
          created_at?: string
        }
        Relationships: []
      }
      /** Teams/Companies */
      teams: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Team members */
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: string
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: string
          joined_at?: string
        }
        Relationships: []
      }
      /** Extension settings */
      extension_settings: {
        Row: {
          id: string
          user_id: string
          auto_sync: boolean
          sync_interval: number
          capture_feed: boolean
          capture_analytics: boolean
          dark_mode: boolean
          notifications: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          auto_sync?: boolean
          sync_interval?: number
          capture_feed?: boolean
          capture_analytics?: boolean
          dark_mode?: boolean
          notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          auto_sync?: boolean
          sync_interval?: number
          capture_feed?: boolean
          capture_analytics?: boolean
          dark_mode?: boolean
          notifications?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Sync metadata tracking */
      sync_metadata: {
        Row: {
          id: string
          user_id: string
          table_name: string
          last_synced_at: string
          sync_status: string
          pending_changes: number
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          table_name: string
          last_synced_at?: string
          sync_status?: string
          pending_changes?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          table_name?: string
          last_synced_at?: string
          sync_status?: string
          pending_changes?: number
          created_at?: string
        }
        Relationships: []
      }
      /** Posting goals */
      posting_goals: {
        Row: {
          id: string
          user_id: string
          period: string
          target_posts: number
          current_posts: number
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period: string
          target_posts: number
          current_posts?: number
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period?: string
          target_posts?: number
          current_posts?: number
          start_date?: string
          end_date?: string
          created_at?: string
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

/** Helper type to extract table row types */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

/** Helper type to extract insert types */
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

/** Helper type to extract update types */
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
