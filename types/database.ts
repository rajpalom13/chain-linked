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
      /** User accounts with Google OAuth integration (legacy) */
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
      /** User profiles linked to auth.users */
      profiles: {
        Row: {
          id: string
          full_name: string | null
          avatar_url: string | null
          email: string | null
          created_at: string | null
          linkedin_access_token: string | null
          linkedin_user_id: string | null
          linkedin_connected_at: string | null
          linkedin_token_expires_at: string | null
          /** LinkedIn profile picture URL (from OAuth) */
          linkedin_avatar_url: string | null
          /** LinkedIn headline */
          linkedin_headline: string | null
          /** LinkedIn profile URL */
          linkedin_profile_url: string | null
          /** Company onboarding completion status */
          company_onboarding_completed: boolean
          /** Company name for AI context */
          company_name: string | null
          /** Company description for AI context */
          company_description: string | null
          /** Company products/services for AI context */
          company_products: string | null
          /** Ideal Customer Profile for AI context */
          company_icp: string | null
          /** Value propositions for AI context */
          company_value_props: string | null
          /** Company website URL */
          company_website: string | null
          /** Whether the user has completed the full onboarding flow */
          onboarding_completed: boolean
          /** Current step in the onboarding flow (1-4) */
          onboarding_current_step: number
          /** Whether the user has completed first-time topic selection */
          discover_topics_selected: boolean
          /** Array of selected discover topic slugs */
          discover_topics: string[]
        }
        Insert: {
          id: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          created_at?: string | null
          linkedin_access_token?: string | null
          linkedin_user_id?: string | null
          linkedin_connected_at?: string | null
          linkedin_token_expires_at?: string | null
          linkedin_avatar_url?: string | null
          linkedin_headline?: string | null
          linkedin_profile_url?: string | null
          company_onboarding_completed?: boolean
          company_name?: string | null
          company_description?: string | null
          company_products?: string | null
          company_icp?: string | null
          company_value_props?: string | null
          company_website?: string | null
          /** Whether the user has completed the full onboarding flow */
          onboarding_completed?: boolean
          /** Current step in the onboarding flow (1-4) */
          onboarding_current_step?: number
          discover_topics_selected?: boolean
          discover_topics?: string[]
        }
        Update: {
          id?: string
          full_name?: string | null
          avatar_url?: string | null
          email?: string | null
          created_at?: string | null
          linkedin_access_token?: string | null
          linkedin_user_id?: string | null
          linkedin_connected_at?: string | null
          linkedin_token_expires_at?: string | null
          linkedin_avatar_url?: string | null
          linkedin_headline?: string | null
          linkedin_profile_url?: string | null
          company_onboarding_completed?: boolean
          company_name?: string | null
          company_description?: string | null
          company_products?: string | null
          company_icp?: string | null
          company_value_props?: string | null
          company_website?: string | null
          /** Whether the user has completed the full onboarding flow */
          onboarding_completed?: boolean
          /** Current step in the onboarding flow (1-4) */
          onboarding_current_step?: number
          discover_topics_selected?: boolean
          discover_topics?: string[]
        }
        Relationships: []
      }
      /** Company context from AI analysis */
      company_context: {
        Row: {
          id: string
          user_id: string
          company_name: string
          website_url: string | null
          industry: string | null
          target_audience_input: string | null
          value_proposition: string | null
          company_summary: string | null
          products_and_services: Json
          target_audience: Json
          tone_of_voice: Json
          brand_colors: Json
          scraped_content: string | null
          perplexity_research: string | null
          status: string
          error_message: string | null
          inngest_run_id: string | null
          created_at: string
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          website_url?: string | null
          industry?: string | null
          target_audience_input?: string | null
          value_proposition?: string | null
          company_summary?: string | null
          products_and_services?: Json
          target_audience?: Json
          tone_of_voice?: Json
          brand_colors?: Json
          scraped_content?: string | null
          perplexity_research?: string | null
          status?: string
          error_message?: string | null
          inngest_run_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          website_url?: string | null
          industry?: string | null
          target_audience_input?: string | null
          value_proposition?: string | null
          company_summary?: string | null
          products_and_services?: Json
          target_audience?: Json
          tone_of_voice?: Json
          brand_colors?: Json
          scraped_content?: string | null
          perplexity_research?: string | null
          status?: string
          error_message?: string | null
          inngest_run_id?: string | null
          created_at?: string
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      /** LinkedIn profile snapshots */
      linkedin_profiles: {
        Row: {
          id: string
          user_id: string
          profile_urn: string | null
          public_identifier: string | null
          first_name: string | null
          last_name: string | null
          headline: string | null
          location: string | null
          industry: string | null
          profile_picture_url: string | null
          background_image_url: string | null
          connections_count: number | null
          followers_count: number | null
          summary: string | null
          raw_data: Json | null
          captured_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          profile_urn?: string | null
          public_identifier?: string | null
          first_name?: string | null
          last_name?: string | null
          headline?: string | null
          location?: string | null
          industry?: string | null
          profile_picture_url?: string | null
          background_image_url?: string | null
          connections_count?: number | null
          followers_count?: number | null
          summary?: string | null
          raw_data?: Json | null
          captured_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          profile_urn?: string | null
          public_identifier?: string | null
          first_name?: string | null
          last_name?: string | null
          headline?: string | null
          location?: string | null
          industry?: string | null
          profile_picture_url?: string | null
          background_image_url?: string | null
          connections_count?: number | null
          followers_count?: number | null
          summary?: string | null
          raw_data?: Json | null
          captured_at?: string | null
          updated_at?: string | null
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
          posted_at: string | null
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
          posted_at?: string | null
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
          posted_at?: string | null
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
          media_urls: string[] | null
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
          media_urls?: string[] | null
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
          media_urls?: string[] | null
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
          media_urls: string[] | null
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
          media_urls?: string[] | null
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
          media_urls?: string[] | null
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
          scheduled_for: string
          timezone: string | null
          status: 'pending' | 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled'
          visibility: 'PUBLIC' | 'CONNECTIONS'
          media_urls: string[] | null
          linkedin_post_id: string | null
          posted_at: string | null
          error_message: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          scheduled_for: string
          timezone?: string | null
          status?: 'pending' | 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled'
          visibility?: 'PUBLIC' | 'CONNECTIONS'
          media_urls?: string[] | null
          linkedin_post_id?: string | null
          posted_at?: string | null
          error_message?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          scheduled_for?: string
          timezone?: string | null
          status?: 'pending' | 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled'
          visibility?: 'PUBLIC' | 'CONNECTIONS'
          media_urls?: string[] | null
          linkedin_post_id?: string | null
          posted_at?: string | null
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
      /** Companies - Parent organizations for teams */
      companies: {
        Row: {
          id: string
          name: string
          slug: string
          logo_url: string | null
          owner_id: string
          settings: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          logo_url?: string | null
          owner_id: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          owner_id?: string
          settings?: Json | null
          created_at?: string
          updated_at?: string
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
          company_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          owner_id: string
          company_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          owner_id?: string
          company_id?: string | null
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
      /** Team invitations for onboarding */
      team_invitations: {
        Row: {
          id: string
          team_id: string
          email: string
          role: string
          token: string
          invited_by: string
          status: string
          expires_at: string
          created_at: string
          accepted_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          email: string
          role?: string
          token: string
          invited_by: string
          status?: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          email?: string
          role?: string
          token?: string
          invited_by?: string
          status?: string
          expires_at?: string
          created_at?: string
          accepted_at?: string | null
        }
        Relationships: []
      }
      /** Extension settings */
      extension_settings: {
        Row: {
          id: string
          user_id: string
          auto_capture_enabled: boolean | null
          capture_feed: boolean | null
          capture_analytics: boolean | null
          capture_profile: boolean | null
          capture_messaging: boolean | null
          sync_enabled: boolean | null
          sync_interval: number | null
          dark_mode: boolean | null
          notifications_enabled: boolean | null
          raw_settings: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          auto_capture_enabled?: boolean | null
          capture_feed?: boolean | null
          capture_analytics?: boolean | null
          capture_profile?: boolean | null
          capture_messaging?: boolean | null
          sync_enabled?: boolean | null
          sync_interval?: number | null
          dark_mode?: boolean | null
          notifications_enabled?: boolean | null
          raw_settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          auto_capture_enabled?: boolean | null
          capture_feed?: boolean | null
          capture_analytics?: boolean | null
          capture_profile?: boolean | null
          capture_messaging?: boolean | null
          sync_enabled?: boolean | null
          sync_interval?: number | null
          dark_mode?: boolean | null
          notifications_enabled?: boolean | null
          raw_settings?: Json | null
          created_at?: string | null
          updated_at?: string | null
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
      /** User API keys for BYOK (encrypted storage) */
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          provider: string
          encrypted_key: string
          key_hint: string | null
          is_valid: boolean
          last_validated_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider?: string
          encrypted_key: string
          key_hint?: string | null
          is_valid?: boolean
          last_validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider?: string
          encrypted_key?: string
          key_hint?: string | null
          is_valid?: boolean
          last_validated_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** User niches for content personalization */
      user_niches: {
        Row: {
          id: string
          user_id: string
          niche: string
          confidence: number | null
          source: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          niche: string
          confidence?: number | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          niche?: string
          confidence?: number | null
          source?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Saved/bookmarked inspiration posts */
      saved_inspirations: {
        Row: {
          id: string
          user_id: string
          inspiration_post_id: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          inspiration_post_id: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          inspiration_post_id?: string
          created_at?: string
        }
        Relationships: []
      }
      /** LinkedIn OAuth tokens for API access */
      linkedin_tokens: {
        Row: {
          id: string
          user_id: string
          access_token: string
          refresh_token: string | null
          expires_at: string
          linkedin_urn: string | null
          scopes: string[] | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          access_token: string
          refresh_token?: string | null
          expires_at: string
          linkedin_urn?: string | null
          scopes?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          access_token?: string
          refresh_token?: string | null
          expires_at?: string
          linkedin_urn?: string | null
          scopes?: string[] | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Brand kits extracted from websites */
      brand_kits: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          website_url: string
          primary_color: string
          secondary_color: string | null
          accent_color: string | null
          background_color: string | null
          text_color: string | null
          font_primary: string | null
          font_secondary: string | null
          logo_url: string | null
          logo_storage_path: string | null
          raw_extraction: Json | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          website_url: string
          primary_color: string
          secondary_color?: string | null
          accent_color?: string | null
          background_color?: string | null
          text_color?: string | null
          font_primary?: string | null
          font_secondary?: string | null
          logo_url?: string | null
          logo_storage_path?: string | null
          raw_extraction?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          website_url?: string
          primary_color?: string
          secondary_color?: string | null
          accent_color?: string | null
          background_color?: string | null
          text_color?: string | null
          font_primary?: string | null
          font_secondary?: string | null
          logo_url?: string | null
          logo_storage_path?: string | null
          raw_extraction?: Json | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Saved carousel templates for reuse in the carousel editor */
      carousel_templates: {
        Row: {
          id: string
          user_id: string
          team_id: string | null
          name: string
          description: string | null
          category: string
          slides: Json
          brand_colors: Json
          fonts: Json
          thumbnail: string | null
          is_public: boolean
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          team_id?: string | null
          name: string
          description?: string | null
          category?: string
          slides: Json
          brand_colors?: Json
          fonts?: Json
          thumbnail?: string | null
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          team_id?: string | null
          name?: string
          description?: string | null
          category?: string
          slides?: Json
          brand_colors?: Json
          fonts?: Json
          thumbnail?: string | null
          is_public?: boolean
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** LinkedIn Voyager API credentials (session cookies) */
      linkedin_credentials: {
        Row: {
          id: string
          user_id: string
          li_at: string
          jsessionid: string
          liap: string | null
          csrf_token: string | null
          user_agent: string | null
          cookies_set_at: string
          expires_at: string | null
          is_valid: boolean
          last_used_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          li_at: string
          jsessionid: string
          liap?: string | null
          csrf_token?: string | null
          user_agent?: string | null
          cookies_set_at?: string
          expires_at?: string | null
          is_valid?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          li_at?: string
          jsessionid?: string
          liap?: string | null
          csrf_token?: string | null
          user_agent?: string | null
          cookies_set_at?: string
          expires_at?: string | null
          is_valid?: boolean
          last_used_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Perplexity-sourced news articles for the Discover feed */
      discover_news_articles: {
        Row: {
          id: string
          headline: string
          summary: string
          source_url: string
          source_name: string
          published_date: string | null
          relevance_tags: string[]
          topic: string
          ingest_batch_id: string | null
          freshness: string
          perplexity_citations: string[]
          created_at: string
        }
        Insert: {
          id?: string
          headline: string
          summary: string
          source_url: string
          source_name: string
          published_date?: string | null
          relevance_tags?: string[]
          topic: string
          ingest_batch_id?: string | null
          freshness?: string
          perplexity_citations?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          headline?: string
          summary?: string
          source_url?: string
          source_name?: string
          published_date?: string | null
          relevance_tags?: string[]
          topic?: string
          ingest_batch_id?: string | null
          freshness?: string
          perplexity_citations?: string[]
          created_at?: string
        }
        Relationships: []
      }
      /** Discover posts - curated/scraped industry content */
      discover_posts: {
        Row: {
          id: string
          linkedin_url: string
          author_name: string
          author_headline: string
          author_avatar_url: string | null
          author_profile_url: string | null
          content: string
          post_type: string | null
          likes_count: number
          comments_count: number
          reposts_count: number
          impressions_count: number | null
          posted_at: string
          scraped_at: string
          topics: string[]
          is_viral: boolean
          engagement_rate: number | null
          source: string
          /** UUID grouping items from same cron ingest run */
          ingest_batch_id: string | null
          /** Content freshness: 'new' | 'recent' | 'aging' | 'stale' */
          freshness: string
        }
        Insert: {
          id?: string
          linkedin_url: string
          author_name: string
          author_headline: string
          author_avatar_url?: string | null
          author_profile_url?: string | null
          content: string
          post_type?: string | null
          likes_count?: number
          comments_count?: number
          reposts_count?: number
          impressions_count?: number | null
          posted_at: string
          scraped_at?: string
          topics?: string[]
          is_viral?: boolean
          engagement_rate?: number | null
          source?: string
          ingest_batch_id?: string | null
          freshness?: string
        }
        Update: {
          id?: string
          linkedin_url?: string
          author_name?: string
          author_headline?: string
          author_avatar_url?: string | null
          author_profile_url?: string | null
          content?: string
          post_type?: string | null
          likes_count?: number
          comments_count?: number
          reposts_count?: number
          impressions_count?: number | null
          posted_at?: string
          scraped_at?: string
          topics?: string[]
          is_viral?: boolean
          engagement_rate?: number | null
          source?: string
          ingest_batch_id?: string | null
          freshness?: string
        }
        Relationships: []
      }
      /** Writing style profiles derived from user's posts and saved content */
      writing_style_profiles: {
        Row: {
          id: string
          user_id: string
          avg_sentence_length: number | null
          vocabulary_level: string | null
          tone: string | null
          formatting_style: Json
          hook_patterns: string[]
          emoji_usage: string | null
          cta_patterns: string[]
          signature_phrases: string[]
          content_themes: string[]
          raw_analysis: Json
          posts_analyzed_count: number
          wishlisted_analyzed_count: number
          created_at: string
          updated_at: string
          last_refreshed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          avg_sentence_length?: number | null
          vocabulary_level?: string | null
          tone?: string | null
          formatting_style?: Json
          hook_patterns?: string[]
          emoji_usage?: string | null
          cta_patterns?: string[]
          signature_phrases?: string[]
          content_themes?: string[]
          raw_analysis?: Json
          posts_analyzed_count?: number
          wishlisted_analyzed_count?: number
          created_at?: string
          updated_at?: string
          last_refreshed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          avg_sentence_length?: number | null
          vocabulary_level?: string | null
          tone?: string | null
          formatting_style?: Json
          hook_patterns?: string[]
          emoji_usage?: string | null
          cta_patterns?: string[]
          signature_phrases?: string[]
          content_themes?: string[]
          raw_analysis?: Json
          posts_analyzed_count?: number
          wishlisted_analyzed_count?: number
          created_at?: string
          updated_at?: string
          last_refreshed_at?: string
        }
        Relationships: []
      }
      /** AI-generated post suggestions personalized to each user */
      generated_suggestions: {
        Row: {
          id: string
          user_id: string
          content: string
          post_type: string | null
          tone: string | null
          category: string | null
          prompt_context: Json
          generation_batch_id: string | null
          estimated_engagement: number | null
          status: 'active' | 'used' | 'dismissed' | 'expired'
          created_at: string
          expires_at: string
          used_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          content: string
          post_type?: string | null
          tone?: string | null
          category?: string | null
          prompt_context?: Json
          generation_batch_id?: string | null
          estimated_engagement?: number | null
          status?: 'active' | 'used' | 'dismissed' | 'expired'
          created_at?: string
          expires_at?: string
          used_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          content?: string
          post_type?: string | null
          tone?: string | null
          category?: string | null
          prompt_context?: Json
          generation_batch_id?: string | null
          estimated_engagement?: number | null
          status?: 'active' | 'used' | 'dismissed' | 'expired'
          created_at?: string
          expires_at?: string
          used_at?: string | null
        }
        Relationships: []
      }
      /** User-created collections/folders for organizing wishlisted posts */
      wishlist_collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          emoji_icon: string
          color: string
          item_count: number
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          emoji_icon?: string
          color?: string
          item_count?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          emoji_icon?: string
          color?: string
          item_count?: number
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Stores liked post suggestions for later scheduling or posting */
      swipe_wishlist: {
        Row: {
          id: string
          user_id: string
          suggestion_id: string | null
          collection_id: string | null
          content: string
          post_type: string | null
          category: string | null
          notes: string | null
          is_scheduled: boolean
          scheduled_post_id: string | null
          status: 'saved' | 'scheduled' | 'posted' | 'removed'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          suggestion_id?: string | null
          collection_id?: string | null
          content: string
          post_type?: string | null
          category?: string | null
          notes?: string | null
          is_scheduled?: boolean
          scheduled_post_id?: string | null
          status?: 'saved' | 'scheduled' | 'posted' | 'removed'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          suggestion_id?: string | null
          collection_id?: string | null
          content?: string
          post_type?: string | null
          category?: string | null
          notes?: string | null
          is_scheduled?: boolean
          scheduled_post_id?: string | null
          status?: 'saved' | 'scheduled' | 'posted' | 'removed'
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      /** Tracks AI suggestion generation job runs for audit and rate limiting */
      suggestion_generation_runs: {
        Row: {
          id: string
          user_id: string
          status: 'pending' | 'generating' | 'completed' | 'failed'
          suggestions_requested: number
          suggestions_generated: number
          company_context_id: string | null
          post_types_used: string[] | null
          inngest_run_id: string | null
          error_message: string | null
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          suggestions_requested?: number
          suggestions_generated?: number
          company_context_id?: string | null
          post_types_used?: string[] | null
          inngest_run_id?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          status?: 'pending' | 'generating' | 'completed' | 'failed'
          suggestions_requested?: number
          suggestions_generated?: number
          company_context_id?: string | null
          post_types_used?: string[] | null
          inngest_run_id?: string | null
          error_message?: string | null
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      /** LinkedIn research posts - curated viral posts from influencers */
      linkedin_research_posts: {
        Row: {
          id: string
          activity_urn: string | null
          text: string | null
          url: string | null
          post_type: string | null
          posted_date: string | null
          author_first_name: string | null
          author_last_name: string | null
          author_headline: string | null
          author_username: string | null
          author_profile_url: string | null
          author_profile_picture: string | null
          total_reactions: number | null
          likes: number | null
          comments: number | null
          reposts: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          activity_urn?: string | null
          text?: string | null
          url?: string | null
          post_type?: string | null
          posted_date?: string | null
          author_first_name?: string | null
          author_last_name?: string | null
          author_headline?: string | null
          author_username?: string | null
          author_profile_url?: string | null
          author_profile_picture?: string | null
          total_reactions?: number | null
          likes?: number | null
          comments?: number | null
          reposts?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          activity_urn?: string | null
          text?: string | null
          url?: string | null
          post_type?: string | null
          posted_date?: string | null
          author_first_name?: string | null
          author_last_name?: string | null
          author_headline?: string | null
          author_username?: string | null
          author_profile_url?: string | null
          author_profile_picture?: string | null
          total_reactions?: number | null
          likes?: number | null
          comments?: number | null
          reposts?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      /** Research sessions for tracking deep research workflows */
      research_sessions: {
        Row: {
          id: string
          user_id: string
          topics: string[]
          depth: string
          status: string
          posts_discovered: number | null
          posts_generated: number | null
          error_message: string | null
          failed_step: string | null
          started_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
          inngest_run_id: string | null
        }
        Insert: {
          id?: string
          user_id: string
          topics: string[]
          depth?: string
          status?: string
          posts_discovered?: number | null
          posts_generated?: number | null
          error_message?: string | null
          failed_step?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          inngest_run_id?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          topics?: string[]
          depth?: string
          status?: string
          posts_discovered?: number | null
          posts_generated?: number | null
          error_message?: string | null
          failed_step?: string | null
          started_at?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          inngest_run_id?: string | null
        }
        Relationships: []
      }
      /** AI-generated LinkedIn post drafts from research */
      generated_posts: {
        Row: {
          id: string
          user_id: string
          discover_post_id: string | null
          research_session_id: string | null
          content: string
          post_type: string
          hook: string | null
          cta: string | null
          word_count: number | null
          estimated_read_time: number | null
          status: string
          source_url: string | null
          source_title: string | null
          source_snippet: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          discover_post_id?: string | null
          research_session_id?: string | null
          content: string
          post_type: string
          hook?: string | null
          cta?: string | null
          word_count?: number | null
          estimated_read_time?: number | null
          status?: string
          source_url?: string | null
          source_title?: string | null
          source_snippet?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          discover_post_id?: string | null
          research_session_id?: string | null
          content?: string
          post_type?: string
          hook?: string | null
          cta?: string | null
          word_count?: number | null
          estimated_read_time?: number | null
          status?: string
          source_url?: string | null
          source_title?: string | null
          source_snippet?: string | null
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

/**
 * Discover post type for the Discover tab content feed
 */
export interface DiscoverPost {
  /** Unique identifier */
  id: string
  /** LinkedIn URL of the original post */
  linkedin_url: string
  /** Author display name */
  author_name: string
  /** Author headline/title */
  author_headline: string
  /** Author avatar image URL */
  author_avatar_url: string | null
  /** Author LinkedIn profile URL */
  author_profile_url: string | null
  /** Full post content text */
  content: string
  /** Post type (text, image, video, carousel, etc.) */
  post_type: string | null
  /** Number of likes/reactions */
  likes_count: number
  /** Number of comments */
  comments_count: number
  /** Number of reposts/shares */
  reposts_count: number
  /** Number of impressions (if available) */
  impressions_count: number | null
  /** When the post was originally published */
  posted_at: string
  /** When the post was scraped/imported */
  scraped_at: string
  /** Topic tags for categorization */
  topics: string[]
  /** Whether the post is classified as viral */
  is_viral: boolean
  /** Calculated engagement rate */
  engagement_rate: number | null
  /** Data source: 'apify' | 'manual' | 'import' | 'daily-ingest' */
  source: string
  /** UUID grouping items from same cron ingest run */
  ingest_batch_id: string | null
  /** Content freshness: 'new' | 'recent' | 'aging' | 'stale' */
  freshness: string
}

/**
 * Perplexity-sourced news article for the Discover feed
 */
export interface DiscoverNewsArticle {
  /** Unique identifier */
  id: string
  /** Catchy headline for the article */
  headline: string
  /** 2-3 sentence summary of the article */
  summary: string
  /** URL to the original source article */
  source_url: string
  /** Name of the publication/source */
  source_name: string
  /** When the article was published */
  published_date: string | null
  /** Tags indicating relevance to the topic */
  relevance_tags: string[]
  /** Topic slug this article belongs to */
  topic: string
  /** UUID grouping items from same cron ingest run */
  ingest_batch_id: string | null
  /** Content freshness: 'new' | 'recent' | 'aging' | 'stale' */
  freshness: string
  /** Citation URLs from Perplexity API */
  perplexity_citations: string[]
  /** When the article was ingested */
  created_at: string
}

/** Helper type to extract table row types */
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']

/** Helper type to extract insert types */
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']

/** Helper type to extract update types */
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

/**
 * Company type alias for convenience
 */
export type Company = Tables<'companies'>

/**
 * Company insert type alias
 */
export type CompanyInsert = TablesInsert<'companies'>

/**
 * Company update type alias
 */
export type CompanyUpdate = TablesUpdate<'companies'>

/**
 * Team type alias for convenience
 */
export type Team = Tables<'teams'>

/**
 * Team member type alias for convenience
 */
export type TeamMember = Tables<'team_members'>

/**
 * Team invitation type alias for convenience
 */
export type TeamInvitation = Tables<'team_invitations'>

/**
 * Team invitation insert type alias
 */
export type TeamInvitationInsert = TablesInsert<'team_invitations'>

/**
 * Invitation status enum type
 */
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled'

/**
 * Team member role enum type
 */
export type TeamMemberRole = 'owner' | 'admin' | 'member'

/**
 * Company with related team data
 */
export interface CompanyWithTeam extends Company {
  team?: Team | null
  team_members?: TeamMember[]
}

/**
 * Team invitation with inviter info
 */
export interface TeamInvitationWithInviter extends TeamInvitation {
  inviter?: {
    name: string | null
    email: string
    avatar_url: string | null
  }
  team?: {
    name: string
    company?: {
      name: string
      logo_url: string | null
    }
  }
}

/**
 * Scheduled post type alias for convenience
 */
export type ScheduledPost = Tables<'scheduled_posts'>

/**
 * Scheduled post insert type alias
 */
export type ScheduledPostInsert = TablesInsert<'scheduled_posts'>

/**
 * Scheduled post update type alias
 */
export type ScheduledPostUpdate = TablesUpdate<'scheduled_posts'>

/**
 * Scheduled post status enum type
 */
export type ScheduledPostStatus = 'pending' | 'scheduled' | 'posting' | 'posted' | 'failed' | 'cancelled'

/**
 * Post visibility enum type
 */
export type PostVisibility = 'PUBLIC' | 'CONNECTIONS'

/**
 * Research session status enum type
 */
export type ResearchSessionStatus =
  | 'pending'
  | 'initializing'
  | 'searching'
  | 'enriching'
  | 'generating'
  | 'saving'
  | 'completed'
  | 'failed'

/**
 * Research depth enum type
 */
export type ResearchDepth = 'basic' | 'deep'

/**
 * Generated post type enum
 */
export type GeneratedPostType =
  | 'thought-leadership'
  | 'storytelling'
  | 'educational'
  | 'contrarian'
  | 'data-driven'
  | 'how-to'
  | 'listicle'

/**
 * Generated post status enum type
 */
export type GeneratedPostStatus = 'draft' | 'scheduled' | 'posted' | 'archived'

/**
 * Research session for tracking deep research workflows
 */
export interface ResearchSession {
  /** Unique identifier */
  id: string
  /** User who created the session */
  user_id: string
  /** Topics being researched */
  topics: string[]
  /** Research depth level */
  depth: ResearchDepth
  /** Current status */
  status: ResearchSessionStatus
  /** Number of discover posts created */
  posts_discovered: number | null
  /** Number of AI-generated posts created */
  posts_generated: number | null
  /** Error message if failed */
  error_message: string | null
  /** Which step failed */
  failed_step: string | null
  /** When the research started */
  started_at: string | null
  /** When the research completed */
  completed_at: string | null
  /** Record creation timestamp */
  created_at: string
  /** Last update timestamp */
  updated_at: string
  /** Inngest run ID for tracking */
  inngest_run_id: string | null
}

/**
 * Generated post from AI content generation
 */
export interface GeneratedPost {
  /** Unique identifier */
  id: string
  /** User who owns this post */
  user_id: string
  /** Reference to source discover post */
  discover_post_id: string | null
  /** Reference to research session */
  research_session_id: string | null
  /** Generated post content */
  content: string
  /** Type of post (thought-leadership, storytelling, etc.) */
  post_type: GeneratedPostType
  /** Opening hook line */
  hook: string | null
  /** Call to action */
  cta: string | null
  /** Word count */
  word_count: number | null
  /** Estimated read time in seconds */
  estimated_read_time: number | null
  /** Current status */
  status: GeneratedPostStatus
  /** Source URL */
  source_url: string | null
  /** Source title */
  source_title: string | null
  /** Source content snippet */
  source_snippet: string | null
  /** Record creation timestamp */
  created_at: string
  /** Last update timestamp */
  updated_at: string
}

/**
 * Research session insert type
 */
export interface ResearchSessionInsert {
  id?: string
  user_id: string
  topics: string[]
  depth?: ResearchDepth
  status?: ResearchSessionStatus
  posts_discovered?: number
  posts_generated?: number
  error_message?: string | null
  failed_step?: string | null
  started_at?: string | null
  completed_at?: string | null
  inngest_run_id?: string | null
}

/**
 * Generated post insert type
 */
export interface GeneratedPostInsert {
  id?: string
  user_id: string
  discover_post_id?: string | null
  research_session_id?: string | null
  content: string
  post_type: GeneratedPostType
  hook?: string | null
  cta?: string | null
  word_count?: number
  estimated_read_time?: number
  status?: GeneratedPostStatus
  source_url?: string | null
  source_title?: string | null
  source_snippet?: string | null
}

/** Generated suggestion type alias */
export type GeneratedSuggestion = Tables<'generated_suggestions'>

/** Generated suggestion insert type alias */
export type GeneratedSuggestionInsert = TablesInsert<'generated_suggestions'>

/** Generated suggestion update type alias */
export type GeneratedSuggestionUpdate = TablesUpdate<'generated_suggestions'>

/** Wishlist collection type alias */
export type WishlistCollection = Tables<'wishlist_collections'>

/** Wishlist collection insert type alias */
export type WishlistCollectionInsert = TablesInsert<'wishlist_collections'>

/** Wishlist collection update type alias */
export type WishlistCollectionUpdate = TablesUpdate<'wishlist_collections'>

/** Wishlist item type alias */
export type WishlistItem = Tables<'swipe_wishlist'>

/** Wishlist item insert type alias */
export type WishlistItemInsert = TablesInsert<'swipe_wishlist'>

/** Wishlist item update type alias */
export type WishlistItemUpdate = TablesUpdate<'swipe_wishlist'>

/** Generation run type alias */
export type GenerationRun = Tables<'suggestion_generation_runs'>

/** Generation run insert type alias */
export type GenerationRunInsert = TablesInsert<'suggestion_generation_runs'>

/** Generation run update type alias */
export type GenerationRunUpdate = TablesUpdate<'suggestion_generation_runs'>

/** Suggestion status enum */
export type SuggestionStatus = 'active' | 'used' | 'dismissed' | 'expired'

/** Wishlist status enum */
export type WishlistStatus = 'saved' | 'scheduled' | 'posted' | 'removed'

/** Generation run status enum */
export type GenerationRunStatus = 'pending' | 'generating' | 'completed' | 'failed'

/** Writing style profile type alias */
export type WritingStyleProfile = Tables<'writing_style_profiles'>

/** Writing style profile insert type alias */
export type WritingStyleProfileInsert = TablesInsert<'writing_style_profiles'>

/** Writing style profile update type alias */
export type WritingStyleProfileUpdate = TablesUpdate<'writing_style_profiles'>

/** Content freshness enum type */
export type ContentFreshness = 'new' | 'recent' | 'aging' | 'stale'
