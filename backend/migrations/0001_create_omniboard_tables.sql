-- 0001_create_omniboard_tables.sql
-- Creates the omniboards table in the plugin schema (plugin_data_com_paca_omniboard).

CREATE TABLE IF NOT EXISTS omniboards (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id    UUID        REFERENCES projects(id) ON DELETE CASCADE,
    scope         TEXT        NOT NULL CHECK (scope IN ('project', 'admin', 'integration')),
    name          TEXT        NOT NULL DEFAULT 'Omniboard',
    description   TEXT        NOT NULL DEFAULT '',
    project_ids   JSONB       NOT NULL DEFAULT '[]'::jsonb,
    column_config JSONB       NOT NULL DEFAULT '[]'::jsonb,
    filters       JSONB       NOT NULL DEFAULT '{}'::jsonb,
    created_by    UUID        REFERENCES project_members(id) ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_omniboards_scope ON omniboards (scope);
CREATE INDEX IF NOT EXISTS idx_omniboards_project_id ON omniboards (project_id);
