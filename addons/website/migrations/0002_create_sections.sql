CREATE TABLE [dbo].[addon_website_sections] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenant_id] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [title] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(MAX) NULL,
    [image_url] NVARCHAR(MAX) NULL,
    [sort_order] INT NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [addon_website_sections_pkey] PRIMARY KEY CLUSTERED ([id])
)
