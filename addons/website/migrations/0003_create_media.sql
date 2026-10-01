CREATE TABLE [dbo].[addon_website_media] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenant_id] NVARCHAR(1000) NOT NULL,
    [path] NVARCHAR(MAX) NOT NULL,
    [alt] NVARCHAR(1000) NULL,
    CONSTRAINT [addon_website_media_pkey] PRIMARY KEY CLUSTERED ([id])
)
