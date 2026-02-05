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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_generated_contents: {
        Row: {
          additional_instructions: string | null
          client_id: string
          content: string | null
          content_type: string
          created_at: string
          created_by: string
          editorial_content_id: string | null
          hashtags: string[] | null
          id: string
          image_suggestions: string[] | null
          keyword_density: number | null
          main_keyword: string | null
          meta_description: string | null
          readability_score: number | null
          seo_title: string | null
          slides: Json | null
          status: string
          subtitle: string | null
          target_word_count: number | null
          title: string | null
          topic: string
          updated_at: string
          version: number | null
          word_count: number | null
        }
        Insert: {
          additional_instructions?: string | null
          client_id: string
          content?: string | null
          content_type: string
          created_at?: string
          created_by: string
          editorial_content_id?: string | null
          hashtags?: string[] | null
          id?: string
          image_suggestions?: string[] | null
          keyword_density?: number | null
          main_keyword?: string | null
          meta_description?: string | null
          readability_score?: number | null
          seo_title?: string | null
          slides?: Json | null
          status?: string
          subtitle?: string | null
          target_word_count?: number | null
          title?: string | null
          topic: string
          updated_at?: string
          version?: number | null
          word_count?: number | null
        }
        Update: {
          additional_instructions?: string | null
          client_id?: string
          content?: string | null
          content_type?: string
          created_at?: string
          created_by?: string
          editorial_content_id?: string | null
          hashtags?: string[] | null
          id?: string
          image_suggestions?: string[] | null
          keyword_density?: number | null
          main_keyword?: string | null
          meta_description?: string | null
          readability_score?: number | null
          seo_title?: string | null
          slides?: Json | null
          status?: string
          subtitle?: string | null
          target_word_count?: number | null
          title?: string | null
          topic?: string
          updated_at?: string
          version?: number | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_contents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generated_contents_editorial_content_id_fkey"
            columns: ["editorial_content_id"]
            isOneToOne: false
            referencedRelation: "editorial_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_sessions: {
        Row: {
          client_id: string
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_ai_settings: {
        Row: {
          brand_keywords: string[] | null
          brand_voice: string | null
          client_id: string
          content_guidelines: string | null
          created_at: string
          custom_prompt: string | null
          default_word_count: number | null
          id: string
          target_audience: string | null
          updated_at: string
        }
        Insert: {
          brand_keywords?: string[] | null
          brand_voice?: string | null
          client_id: string
          content_guidelines?: string | null
          created_at?: string
          custom_prompt?: string | null
          default_word_count?: number | null
          id?: string
          target_audience?: string | null
          updated_at?: string
        }
        Update: {
          brand_keywords?: string[] | null
          brand_voice?: string | null
          client_id?: string
          content_guidelines?: string | null
          created_at?: string
          custom_prompt?: string | null
          default_word_count?: number | null
          id?: string
          target_audience?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_ai_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_meta_ads: {
        Row: {
          access_token: string
          ad_account_id: string
          ad_account_name: string | null
          client_id: string
          created_at: string
          id: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          ad_account_id: string
          ad_account_name?: string | null
          client_id: string
          created_at?: string
          id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          ad_account_id?: string
          ad_account_name?: string | null
          client_id?: string
          created_at?: string
          id?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_meta_ads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          created_at: string
          google_ads_id: string | null
          google_drive_id: string | null
          id: string
          logo_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          google_ads_id?: string | null
          google_drive_id?: string | null
          id?: string
          logo_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          google_ads_id?: string | null
          google_drive_id?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      content_references: {
        Row: {
          client_id: string | null
          content: string
          content_type: string
          created_at: string
          created_by: string
          id: string
          is_global: boolean | null
          notes: string | null
          title: string
        }
        Insert: {
          client_id?: string | null
          content: string
          content_type: string
          created_at?: string
          created_by: string
          id?: string
          is_global?: boolean | null
          notes?: string | null
          title: string
        }
        Update: {
          client_id?: string | null
          content?: string
          content_type?: string
          created_at?: string
          created_by?: string
          id?: string
          is_global?: boolean | null
          notes?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_references_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      documents_knowledge: {
        Row: {
          client_id: string
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json | null
        }
        Insert: {
          client_id: string
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Update: {
          client_id?: string
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_knowledge_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_campaigns: {
        Row: {
          blog_count: number
          client_id: string
          created_at: string
          created_by: string
          email_count: number
          end_date: string
          facebook_count: number
          google_ads_count: number
          id: string
          instagram_count: number
          name: string
          notes: string | null
          start_date: string
          updated_at: string
        }
        Insert: {
          blog_count?: number
          client_id: string
          created_at?: string
          created_by: string
          email_count?: number
          end_date: string
          facebook_count?: number
          google_ads_count?: number
          id?: string
          instagram_count?: number
          name: string
          notes?: string | null
          start_date: string
          updated_at?: string
        }
        Update: {
          blog_count?: number
          client_id?: string
          created_at?: string
          created_by?: string
          email_count?: number
          end_date?: string
          facebook_count?: number
          google_ads_count?: number
          id?: string
          instagram_count?: number
          name?: string
          notes?: string | null
          start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_content_comments: {
        Row: {
          content: string
          created_at: string
          editorial_content_id: string
          id: string
          parent_comment_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          editorial_content_id: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          editorial_content_id?: string
          id?: string
          parent_comment_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_content_comments_editorial_content_id_fkey"
            columns: ["editorial_content_id"]
            isOneToOne: false
            referencedRelation: "editorial_contents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_content_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "editorial_content_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_content_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_content_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "editorial_content_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      editorial_contents: {
        Row: {
          campaign_id: string | null
          client_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          created_by: string
          description: string | null
          id: string
          scheduled_date: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          client_id: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          scheduled_date: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          scheduled_date?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_contents_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "editorial_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_contents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agendas: {
        Row: {
          client_id: string
          created_at: string | null
          created_by: string
          generated_summary: string | null
          id: string
          meeting_date: string | null
          notes: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          client_id: string
          created_at?: string | null
          created_by: string
          generated_summary?: string | null
          id?: string
          meeting_date?: string | null
          notes?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string | null
          created_by?: string
          generated_summary?: string | null
          id?: string
          meeting_date?: string | null
          notes?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agendas_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      meta_connections: {
        Row: {
          access_token: string
          client_id: string
          created_at: string
          facebook_page_id: string | null
          facebook_page_name: string | null
          id: string
          instagram_account_id: string | null
          instagram_username: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_username?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string
          facebook_page_id?: string | null
          facebook_page_name?: string | null
          id?: string
          instagram_account_id?: string | null
          instagram_username?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meta_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          client_id: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          created_by: string
          editorial_content_id: string | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          media_urls: Json
          meta_post_id: string | null
          platform: Database["public"]["Enums"]["meta_platform"]
          post_type: Database["public"]["Enums"]["meta_post_type"]
          published_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["scheduled_post_status"]
          updated_at: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          created_by: string
          editorial_content_id?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json
          meta_post_id?: string | null
          platform?: Database["public"]["Enums"]["meta_platform"]
          post_type?: Database["public"]["Enums"]["meta_post_type"]
          published_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          updated_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          editorial_content_id?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json
          meta_post_id?: string | null
          platform?: Database["public"]["Enums"]["meta_platform"]
          post_type?: Database["public"]["Enums"]["meta_post_type"]
          published_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["scheduled_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_editorial_content_id_fkey"
            columns: ["editorial_content_id"]
            isOneToOne: false
            referencedRelation: "editorial_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      social_connections: {
        Row: {
          access_token: string
          client_id: string
          created_at: string
          id: string
          page_id: string | null
          page_name: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          client_id: string
          created_at?: string
          id?: string
          page_id?: string | null
          page_name?: string | null
          platform: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          client_id?: string
          created_at?: string
          id?: string
          page_id?: string | null
          page_name?: string | null
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      social_scheduled_posts: {
        Row: {
          caption: string | null
          client_id: string
          created_at: string
          created_by: string
          editorial_content_id: string | null
          error_message: string | null
          hashtags: string[] | null
          id: string
          media_urls: Json
          platform: Database["public"]["Enums"]["social_platform"]
          platform_post_id: string | null
          post_type: Database["public"]["Enums"]["social_post_type"]
          published_at: string | null
          scheduled_at: string
          status: Database["public"]["Enums"]["social_post_status"]
          updated_at: string
        }
        Insert: {
          caption?: string | null
          client_id: string
          created_at?: string
          created_by: string
          editorial_content_id?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json
          platform: Database["public"]["Enums"]["social_platform"]
          platform_post_id?: string | null
          post_type?: Database["public"]["Enums"]["social_post_type"]
          published_at?: string | null
          scheduled_at: string
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Update: {
          caption?: string | null
          client_id?: string
          created_at?: string
          created_by?: string
          editorial_content_id?: string | null
          error_message?: string | null
          hashtags?: string[] | null
          id?: string
          media_urls?: Json
          platform?: Database["public"]["Enums"]["social_platform"]
          platform_post_id?: string | null
          post_type?: Database["public"]["Enums"]["social_post_type"]
          published_at?: string | null
          scheduled_at?: string
          status?: Database["public"]["Enums"]["social_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_scheduled_posts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_scheduled_posts_editorial_content_id_fkey"
            columns: ["editorial_content_id"]
            isOneToOne: false
            referencedRelation: "editorial_contents"
            referencedColumns: ["id"]
          },
        ]
      }
      task_activity_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_activity_log_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comment_reactions: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comment_reactions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_comment_id: string | null
          task_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          task_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_comment_id?: string | null
          task_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "task_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          category: Database["public"]["Enums"]["task_category"]
          client_id: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          meeting_agenda_id: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          category: Database["public"]["Enums"]["task_category"]
          client_id: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_agenda_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          category?: Database["public"]["Enums"]["task_category"]
          client_id?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          meeting_agenda_id?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_meeting_agenda_id_fkey"
            columns: ["meeting_agenda_id"]
            isOneToOne: false
            referencedRelation: "meeting_agendas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_client_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "client"
      content_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "rejected"
        | "published"
      content_type:
        | "instagram"
        | "facebook"
        | "blog"
        | "email"
        | "google_ads"
        | "other"
      meta_platform: "instagram" | "facebook" | "both"
      meta_post_type: "image" | "video" | "carousel" | "reel" | "story"
      scheduled_post_status: "scheduled" | "publishing" | "published" | "failed"
      social_platform:
        | "instagram"
        | "facebook"
        | "linkedin"
        | "tiktok"
        | "twitter"
      social_post_status:
        | "draft"
        | "scheduled"
        | "publishing"
        | "published"
        | "failed"
        | "cancelled"
      social_post_type:
        | "image"
        | "video"
        | "carousel"
        | "story"
        | "reel"
        | "text"
      task_category: "ads" | "dev" | "automation" | "creative"
      task_status: "pending" | "in_progress" | "completed"
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
      app_role: ["admin", "client"],
      content_status: [
        "draft",
        "pending_approval",
        "approved",
        "rejected",
        "published",
      ],
      content_type: [
        "instagram",
        "facebook",
        "blog",
        "email",
        "google_ads",
        "other",
      ],
      meta_platform: ["instagram", "facebook", "both"],
      meta_post_type: ["image", "video", "carousel", "reel", "story"],
      scheduled_post_status: ["scheduled", "publishing", "published", "failed"],
      social_platform: [
        "instagram",
        "facebook",
        "linkedin",
        "tiktok",
        "twitter",
      ],
      social_post_status: [
        "draft",
        "scheduled",
        "publishing",
        "published",
        "failed",
        "cancelled",
      ],
      social_post_type: ["image", "video", "carousel", "story", "reel", "text"],
      task_category: ["ads", "dev", "automation", "creative"],
      task_status: ["pending", "in_progress", "completed"],
    },
  },
} as const
