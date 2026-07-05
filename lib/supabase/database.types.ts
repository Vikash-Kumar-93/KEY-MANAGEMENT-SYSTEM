type Json = any;

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          email_verified_at: string | null;
          master_key_salt: string;
          master_key_hash: string;
          totp_secret_encrypted: string | null;
          totp_secret_iv: string | null;
          totp_secret_auth_tag: string | null;
          backup_codes_encrypted: string | null;
          backup_codes_iv: string | null;
          backup_codes_auth_tag: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      projects: {
        Row: {
          id: string;
          owner_user_id: string;
          name: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
          archived_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["projects"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["projects"]["Insert"]>;
      };
      hosting: {
        Row: {
          id: string;
          project_id: string;
          host_type: string | null;
          vercel_url: string | null;
          vps_host: string | null;
          vps_sso_login_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["hosting"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["hosting"]["Insert"]>;
      };
      github_accounts: {
        Row: {
          id: string;
          owner_user_id: string;
          github_handle: string;
          profile_url: string;
          access_token_encrypted: string;
          token_iv: string;
          token_auth_tag: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["github_accounts"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["github_accounts"]["Insert"]>;
      };
      repositories: {
        Row: {
          id: string;
          project_id: string;
          github_account_id: string;
          repo_url: string;
          default_branch: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["repositories"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["repositories"]["Insert"]>;
      };
      project_data_keys: {
        Row: {
          id: string;
          project_id: string;
          owner_user_id: string;
          wrapped_key: string;
          key_iv: string;
          key_auth_tag: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["project_data_keys"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["project_data_keys"]["Insert"]>;
      };
      secrets: {
        Row: {
          id: string;
          project_id: string;
          owner_user_id: string;
          label: string;
          category: string | null;
          env_var_name: string | null;
          ciphertext: string;
          secret_iv: string;
          secret_auth_tag: string;
          source: string | null;
          created_at: string;
          updated_at: string;
          rotated_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["secrets"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["secrets"]["Insert"]>;
      };
      key_values: {
        Row: {
          id: string;
          project_id: string;
          owner_user_id: string;
          key: string;
          ciphertext: string;
          kv_iv: string;
          kv_auth_tag: string;
          is_sensitive: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["key_values"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["key_values"]["Insert"]>;
      };
      devices: {
        Row: {
          id: string;
          owner_user_id: string;
          device_name: string;
          device_fingerprint_hashed: string;
          is_trusted: boolean;
          last_otp_verified_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["devices"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["devices"]["Insert"]>;
      };
      audit_log: {
        Row: {
          id: string;
          owner_user_id: string;
          action: string;
          project_id: string | null;
          secret_id: string | null;
          device_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["audit_log"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["audit_log"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
