CREATE EXTENSION IF NOT EXISTS "uuid-ossp";




CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  email_verified_at TIMESTAMP,
  master_key_salt BYTEA NOT NULL,
  master_key_hash TEXT NOT NULL, 
  totp_secret_encrypted BYTEA, 
  totp_secret_iv BYTEA, 
  totp_secret_auth_tag BYTEA,
  backup_codes_encrypted BYTEA, 
  backup_codes_iv BYTEA, 
  backup_codes_auth_tag BYTEA, 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);




CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  archived_at TIMESTAMP,
  UNIQUE(owner_user_id, name)
);


CREATE TABLE public.hosting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  host_type TEXT CHECK (host_type IN ('vercel', 'vps', 'other')),
  vercel_url TEXT,
  vps_host TEXT,
  vps_sso_login_url TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE public.github_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  github_handle TEXT NOT NULL,
  profile_url TEXT NOT NULL,
  access_token_encrypted BYTEA NOT NULL, -- PAT (encrypted)
  token_iv BYTEA NOT NULL,
  token_auth_tag BYTEA NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_user_id, github_handle)
);

CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  github_account_id UUID NOT NULL REFERENCES public.github_accounts(id) ON DELETE CASCADE,
  repo_url TEXT NOT NULL,
  default_branch TEXT DEFAULT 'main',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);



CREATE TABLE public.project_data_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wrapped_key BYTEA NOT NULL, -- Data key encrypted with 
  key_iv BYTEA NOT NULL, -- IV for wrapping the 
  key_auth_tag BYTEA NOT NULL, -- AEAD auth tag for wrapped 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id) -- One wrapped data key 
);


CREATE TABLE public.secrets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  category TEXT CHECK (category IN ('api_key', 'db', 'token', 'password', 'cert', 'other')),
  env_var_name TEXT, 
  ciphertext BYTEA NOT NULL, 
  secret_iv BYTEA NOT NULL,
  secret_auth_tag BYTEA NOT NULL,
  source TEXT CHECK (source IN ('manual', 'vercel_sync', 'github_sync')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  rotated_at TIMESTAMP,
  UNIQUE(project_id, label)
);




CREATE TABLE public.key_values (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  ciphertext BYTEA NOT NULL,
  kv_iv BYTEA NOT NULL,
  kv_auth_tag BYTEA NOT NULL,
  is_sensitive BOOLEAN DEFAULT TRUE, 
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, key)
);




CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_fingerprint_hashed TEXT NOT NULL, 
  is_trusted BOOLEAN DEFAULT FALSE,
  last_otp_verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(owner_user_id, device_fingerprint_hashed)
);



CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  secret_id UUID REFERENCES public.secrets(id) ON DELETE SET NULL,
  device_id UUID REFERENCES public.devices(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);




ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hosting ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_data_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.key_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_row" ON public.users
  FOR SELECT USING (auth.uid()::TEXT = id::TEXT);

CREATE POLICY "projects_own_projects" ON public.projects
  FOR SELECT USING (auth.uid()::TEXT = owner_user_id::TEXT);
CREATE POLICY "projects_insert_own" ON public.projects
  FOR INSERT WITH CHECK (auth.uid()::TEXT = owner_user_id::TEXT);
CREATE POLICY "projects_update_own" ON public.projects
  FOR UPDATE USING (auth.uid()::TEXT = owner_user_id::TEXT);
CREATE POLICY "projects_delete_own" ON public.projects
  FOR DELETE USING (auth.uid()::TEXT = owner_user_id::TEXT);



CREATE POLICY "hosting_select_own_projects" ON public.hosting
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "hosting_insert_own_projects" ON public.hosting
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "hosting_update_own_projects" ON public.hosting
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "hosting_delete_own_projects" ON public.hosting
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );



CREATE POLICY "github_accounts_select_own" ON public.github_accounts
  FOR SELECT USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "github_accounts_insert_own" ON public.github_accounts
  FOR INSERT WITH CHECK (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "github_accounts_update_own" ON public.github_accounts
  FOR UPDATE USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "github_accounts_delete_own" ON public.github_accounts
  FOR DELETE USING (auth.uid()::TEXT = owner_user_id::TEXT);




CREATE POLICY "repositories_select_own" ON public.repositories
  FOR SELECT USING (
    github_account_id IN (
      SELECT id FROM public.github_accounts WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "repositories_insert_own" ON public.repositories
  FOR INSERT WITH CHECK (
    github_account_id IN (
      SELECT id FROM public.github_accounts WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "repositories_update_own" ON public.repositories
  FOR UPDATE USING (
    github_account_id IN (
      SELECT id FROM public.github_accounts WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "repositories_delete_own" ON public.repositories
  FOR DELETE USING (
    github_account_id IN (
      SELECT id FROM public.github_accounts WHERE owner_user_id = auth.uid()::UUID
    )
  );




CREATE POLICY "secrets_select_own_projects" ON public.secrets
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "secrets_insert_own_projects" ON public.secrets
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    ) AND owner_user_id = auth.uid()::UUID
  );

CREATE POLICY "secrets_update_own_projects" ON public.secrets
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "secrets_delete_own_projects" ON public.secrets
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );




CREATE POLICY "key_values_select_own_projects" ON public.key_values
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "key_values_insert_own_projects" ON public.key_values
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    ) AND owner_user_id = auth.uid()::UUID
  );

CREATE POLICY "key_values_update_own_projects" ON public.key_values
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );

CREATE POLICY "key_values_delete_own_projects" ON public.key_values
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    )
  );




CREATE POLICY "devices_select_own" ON public.devices
  FOR SELECT USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "devices_insert_own" ON public.devices
  FOR INSERT WITH CHECK (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "devices_update_own" ON public.devices
  FOR UPDATE USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "devices_delete_own" ON public.devices
  FOR DELETE USING (auth.uid()::TEXT = owner_user_id::TEXT);




CREATE POLICY "audit_log_select_own" ON public.audit_log
  FOR SELECT USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "audit_log_insert_own" ON public.audit_log
  FOR INSERT WITH CHECK (auth.uid()::TEXT = owner_user_id::TEXT);







CREATE POLICY "project_data_keys_select_own" ON public.project_data_keys
  FOR SELECT USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "project_data_keys_insert_own" ON public.project_data_keys
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM public.projects WHERE owner_user_id = auth.uid()::UUID
    ) AND owner_user_id = auth.uid()::UUID
  );

CREATE POLICY "project_data_keys_update_own" ON public.project_data_keys
  FOR UPDATE USING (auth.uid()::TEXT = owner_user_id::TEXT);

CREATE POLICY "project_data_keys_delete_own" ON public.project_data_keys
  FOR DELETE USING (auth.uid()::TEXT = owner_user_id::TEXT);






GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

CREATE INDEX idx_projects_owner ON public.projects(owner_user_id);
CREATE INDEX idx_hosting_project ON public.hosting(project_id);
CREATE INDEX idx_github_accounts_owner ON public.github_accounts(owner_user_id);
CREATE INDEX idx_repositories_project ON public.repositories(project_id);
CREATE INDEX idx_repositories_github_account ON public.repositories(github_account_id);
CREATE INDEX idx_project_data_keys_project ON public.project_data_keys(project_id);
CREATE INDEX idx_project_data_keys_owner ON public.project_data_keys(owner_user_id);
CREATE INDEX idx_secrets_project ON public.secrets(project_id);
CREATE INDEX idx_secrets_owner ON public.secrets(owner_user_id);
CREATE INDEX idx_key_values_project ON public.key_values(project_id);
CREATE INDEX idx_devices_owner ON public.devices(owner_user_id);
CREATE INDEX idx_audit_log_owner ON public.audit_log(owner_user_id);
CREATE INDEX idx_audit_log_created ON public.audit_log(created_at DESC);






