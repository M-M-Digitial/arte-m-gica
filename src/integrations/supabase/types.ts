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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_memories: {
        Row: {
          agent_id: string
          created_at: string
          facts: Json
          id: string
          summary: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          facts?: Json
          id?: string
          summary?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          facts?: Json
          id?: string
          summary?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      assinaturas: {
        Row: {
          created_at: string
          email: string
          hotmart_subscriber: string | null
          hotmart_transaction: string | null
          id: string
          origem: string
          plano: string | null
          raw: Json | null
          status: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          created_at?: string
          email: string
          hotmart_subscriber?: string | null
          hotmart_transaction?: string | null
          id?: string
          origem?: string
          plano?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          hotmart_subscriber?: string | null
          hotmart_transaction?: string | null
          id?: string
          origem?: string
          plano?: string | null
          raw?: Json | null
          status?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      atelie_perfil: {
        Row: {
          atelie_nome: string | null
          canais: string | null
          cidade: string | null
          created_at: string
          observacoes: string | null
          produtos: string
          publico: string | null
          ticket_medio: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          atelie_nome?: string | null
          canais?: string | null
          cidade?: string | null
          created_at?: string
          observacoes?: string | null
          produtos: string
          publico?: string | null
          ticket_medio?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          atelie_nome?: string | null
          canais?: string | null
          cidade?: string | null
          created_at?: string
          observacoes?: string | null
          produtos?: string
          publico?: string | null
          ticket_medio?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversas: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          messages: Json
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          messages?: Json
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      geracoes_ia: {
        Row: {
          created_at: string
          email: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      modelos_prontos_arquivos: {
        Row: {
          created_at: string
          file_name: string
          id: string
          label: string
          sort_order: number
          theme_slug: string
          url: string
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          label: string
          sort_order?: number
          theme_slug: string
          url: string
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          label?: string
          sort_order?: number
          theme_slug?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "modelos_prontos_arquivos_theme_slug_fkey"
            columns: ["theme_slug"]
            isOneToOne: false
            referencedRelation: "modelos_prontos_temas"
            referencedColumns: ["slug"]
          },
        ]
      }
      modelos_prontos_temas: {
        Row: {
          created_at: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      moldes: {
        Row: {
          category: string
          created_at: string
          description: string | null
          emoji: string | null
          faces_url: string | null
          id: string
          image_url: string | null
          mask_url: string | null
          name: string
          popular: boolean
          sort_order: number
          svg_url: string | null
          template_pdf_url: string | null
          template_png_url: string | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          faces_url?: string | null
          id?: string
          image_url?: string | null
          mask_url?: string | null
          name: string
          popular?: boolean
          sort_order?: number
          svg_url?: string | null
          template_pdf_url?: string | null
          template_png_url?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          emoji?: string | null
          faces_url?: string | null
          id?: string
          image_url?: string | null
          mask_url?: string | null
          name?: string
          popular?: boolean
          sort_order?: number
          svg_url?: string | null
          template_pdf_url?: string | null
          template_png_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projetos: {
        Row: {
          arte_url: string | null
          created_at: string
          id: string
          molde_id: string | null
          name: string
          personalization: Json
          preview_url: string | null
          status: string
          tema_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          arte_url?: string | null
          created_at?: string
          id?: string
          molde_id?: string | null
          name: string
          personalization?: Json
          preview_url?: string | null
          status?: string
          tema_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          arte_url?: string | null
          created_at?: string
          id?: string
          molde_id?: string | null
          name?: string
          personalization?: Json
          preview_url?: string | null
          status?: string
          tema_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projetos_molde_id_fkey"
            columns: ["molde_id"]
            isOneToOne: false
            referencedRelation: "moldes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projetos_tema_id_fkey"
            columns: ["tema_id"]
            isOneToOne: false
            referencedRelation: "temas"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_custos: {
        Row: {
          atualizado: string
          campanha: string
          gasto: number
        }
        Insert: {
          atualizado?: string
          campanha: string
          gasto?: number
        }
        Update: {
          atualizado?: string
          campanha?: string
          gasto?: number
        }
        Relationships: []
      }
      quiz_leads: {
        Row: {
          classificacao: string | null
          concluido: string | null
          data_inicio: string
          desejo: string | null
          device: string | null
          dor: string | null
          eliminado: string | null
          email: string | null
          etapa: string | null
          faturamento: string | null
          idade: string | null
          investimento: string | null
          nome: string | null
          pagamento: string | null
          promessa: string | null
          score: number | null
          session_id: string
          ultima_atualizacao: string
          urgencia: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          whatsapp: string | null
        }
        Insert: {
          classificacao?: string | null
          concluido?: string | null
          data_inicio?: string
          desejo?: string | null
          device?: string | null
          dor?: string | null
          eliminado?: string | null
          email?: string | null
          etapa?: string | null
          faturamento?: string | null
          idade?: string | null
          investimento?: string | null
          nome?: string | null
          pagamento?: string | null
          promessa?: string | null
          score?: number | null
          session_id: string
          ultima_atualizacao?: string
          urgencia?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Update: {
          classificacao?: string | null
          concluido?: string | null
          data_inicio?: string
          desejo?: string | null
          device?: string | null
          dor?: string | null
          eliminado?: string | null
          email?: string | null
          etapa?: string | null
          faturamento?: string | null
          idade?: string | null
          investimento?: string | null
          nome?: string | null
          pagamento?: string | null
          promessa?: string | null
          score?: number | null
          session_id?: string
          ultima_atualizacao?: string
          urgencia?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      tema_assets: {
        Row: {
          created_at: string
          id: string
          kind: string
          meta: Json
          name: string
          role: string | null
          sort_order: number
          theme_slug: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          meta?: Json
          name: string
          role?: string | null
          sort_order?: number
          theme_slug: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          meta?: Json
          name?: string
          role?: string | null
          sort_order?: number
          theme_slug?: string
          url?: string
        }
        Relationships: []
      }
      temas: {
        Row: {
          category: string
          colors: string[]
          created_at: string
          emoji: string | null
          id: string
          image_url: string | null
          name: string
          sort_order: number
          trending: boolean
          updated_at: string
        }
        Insert: {
          category: string
          colors?: string[]
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name: string
          sort_order?: number
          trending?: boolean
          updated_at?: string
        }
        Update: {
          category?: string
          colors?: string[]
          created_at?: string
          emoji?: string | null
          id?: string
          image_url?: string | null
          name?: string
          sort_order?: number
          trending?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      upload_jobs: {
        Row: {
          bucket: string
          created_at: string
          default_category: string
          error: string | null
          failed: number
          file_name: string
          id: string
          prefix: string
          register_in_moldes: boolean
          results: Json
          status: string
          success: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          bucket: string
          created_at?: string
          default_category?: string
          error?: string | null
          failed?: number
          file_name: string
          id?: string
          prefix?: string
          register_in_moldes?: boolean
          results?: Json
          status?: string
          success?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          bucket?: string
          created_at?: string
          default_category?: string
          error?: string | null
          failed?: number
          file_name?: string
          id?: string
          prefix?: string
          register_in_moldes?: boolean
          results?: Json
          status?: string
          success?: number
          total?: number
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
