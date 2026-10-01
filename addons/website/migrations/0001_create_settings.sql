CREATE TABLE [dbo].[addon_website_settings] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenant_id] NVARCHAR(1000) NOT NULL,
    [draft_json] NVARCHAR(MAX) NOT NULL,
    [published_json] NVARCHAR(MAX) NULL,
    [updated_at] DATETIME2 NOT NULL CONSTRAINT [addon_website_settings_updated_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [addon_website_settings_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [addon_website_settings_tenant_id_key] UNIQUE NONCLUSTERED ([tenant_id])
)
