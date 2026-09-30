BEGIN TRY

BEGIN TRAN;

CREATE TABLE [dbo].[integration_providers] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [category] NVARCHAR(1000) NOT NULL,
    [available] BIT NOT NULL CONSTRAINT [integration_providers_available_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [integration_providers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [integration_providers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [integration_providers_code_key] UNIQUE NONCLUSTERED ([code])
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
