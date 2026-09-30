BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[integration_providers] ADD [enabled] BIT NOT NULL CONSTRAINT [integration_providers_enabled_df] DEFAULT 0;
ALTER TABLE [dbo].[integration_providers] ADD [secret] NVARCHAR(MAX) NULL;

CREATE TABLE [dbo].[companies] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [logoSquare] NVARCHAR(1000) NULL,
    [logoWide] NVARCHAR(1000) NULL,
    [logoStory] NVARCHAR(1000) NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [companies_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[payment_options] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [payment_options_active_df] DEFAULT 1,
    CONSTRAINT [payment_options_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payment_options_code_key] UNIQUE NONCLUSTERED ([code])
);

CREATE TABLE [dbo].[suppliers] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [document] NVARCHAR(1000) NULL,
    [active] BIT NOT NULL CONSTRAINT [suppliers_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [suppliers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [suppliers_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[partner_api_keys] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [tokenHash] NVARCHAR(1000) NOT NULL,
    [prefix] NVARCHAR(1000) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [partner_api_keys_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [partner_api_keys_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [partner_api_keys_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [partner_api_keys_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
