BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[addon_installations] (
    [id] NVARCHAR(1000) NOT NULL,
    [tenantId] NVARCHAR(1000) NOT NULL,
    [addonName] NVARCHAR(1000) NOT NULL,
    [installedVersion] NVARCHAR(1000) NOT NULL,
    [state] NVARCHAR(1000) NOT NULL,
    [error] NVARCHAR(MAX) NULL,
    [installedAt] DATETIME2 NOT NULL CONSTRAINT [addon_installations_installedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [activatedAt] DATETIME2 NULL,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [addon_installations_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [addon_installations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [addon_installations_tenantId_addonName_key] UNIQUE NONCLUSTERED ([tenantId], [addonName])
);

CREATE TABLE [dbo].[addon_migrations] (
    [id] NVARCHAR(1000) NOT NULL,
    [addonName] NVARCHAR(1000) NOT NULL,
    [addonVersion] NVARCHAR(1000) NOT NULL,
    [migrationName] NVARCHAR(1000) NOT NULL,
    [checksum] NVARCHAR(1000) NOT NULL,
    [executedAt] DATETIME2 NOT NULL CONSTRAINT [addon_migrations_executedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [addon_migrations_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [addon_migrations_addonName_migrationName_key] UNIQUE NONCLUSTERED ([addonName], [migrationName])
);

ALTER TABLE [dbo].[addon_installations] ADD CONSTRAINT [addon_installations_tenantId_fkey] FOREIGN KEY ([tenantId]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
