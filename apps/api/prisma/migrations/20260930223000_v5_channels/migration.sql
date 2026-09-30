BEGIN TRY

BEGIN TRAN;

ALTER TABLE [dbo].[customers] ADD [source] NVARCHAR(1000) NOT NULL CONSTRAINT [customers_source_df] DEFAULT 'LOJA';
ALTER TABLE [dbo].[sales] ADD [channel] NVARCHAR(1000) NOT NULL CONSTRAINT [sales_channel_df] DEFAULT 'STORE';
ALTER TABLE [dbo].[sales] ADD [externalOrderId] NVARCHAR(1000) NULL;
ALTER TABLE [dbo].[integration_jobs] ADD [nextAttemptAt] DATETIME2 NULL;

CREATE INDEX [sales_externalOrderId_idx] ON [dbo].[sales]([externalOrderId]);

CREATE TABLE [dbo].[nuvemshop_connections] (
    [id] NVARCHAR(1000) NOT NULL,
    [companyId] NVARCHAR(1000) NOT NULL,
    [storeId] NVARCHAR(1000) NOT NULL,
    [nuvemshopStoreId] NVARCHAR(1000) NOT NULL,
    [accessTokenEnc] NVARCHAR(MAX) NOT NULL,
    [storeName] NVARCHAR(1000) NOT NULL,
    [storeEmail] NVARCHAR(1000) NULL,
    [storeDomain] NVARCHAR(1000) NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [connectedAt] DATETIME2 NOT NULL CONSTRAINT [nuvemshop_connections_connectedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [lastSyncAt] DATETIME2 NULL,
    CONSTRAINT [nuvemshop_connections_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [nuvemshop_connections_companyId_key] UNIQUE NONCLUSTERED ([companyId])
);

CREATE TABLE [dbo].[external_identities] (
    [id] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [externalId] NVARCHAR(1000) NOT NULL,
    [localId] NVARCHAR(1000) NOT NULL,
    [sku] NVARCHAR(1000) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [external_identities_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [external_identities_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [external_identities_provider_kind_externalId_key] UNIQUE NONCLUSTERED ([provider], [kind], [externalId])
);

CREATE INDEX [external_identities_localId_idx] ON [dbo].[external_identities]([localId]);

CREATE TABLE [dbo].[webhook_events] (
    [id] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [externalEventId] NVARCHAR(1000) NOT NULL,
    [event] NVARCHAR(1000) NOT NULL,
    [payload] NVARCHAR(MAX) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [lastError] NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [webhook_events_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [webhook_events_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [webhook_events_provider_externalEventId_key] UNIQUE NONCLUSTERED ([provider], [externalEventId])
);

CREATE TABLE [dbo].[payment_accounts] (
    [id] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [publicKeyEnc] NVARCHAR(MAX) NULL,
    [accessTokenEnc] NVARCHAR(MAX) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [payment_accounts_active_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [payment_accounts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payment_accounts_provider_key] UNIQUE NONCLUSTERED ([provider])
);

CREATE TABLE [dbo].[charges] (
    [id] NVARCHAR(1000) NOT NULL,
    [customerId] NVARCHAR(1000) NOT NULL,
    [saleId] NVARCHAR(1000) NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [method] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [provider] NVARCHAR(1000) NOT NULL,
    [externalId] NVARCHAR(1000) NOT NULL,
    [copyPaste] NVARCHAR(MAX) NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [charges_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [charges_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [charges_externalId_key] UNIQUE NONCLUSTERED ([externalId])
);

CREATE TABLE [dbo].[fiscal_profiles] (
    [id] NVARCHAR(1000) NOT NULL,
    [cnpj] NVARCHAR(1000) NOT NULL,
    [legalName] NVARCHAR(1000) NOT NULL,
    [tradeName] NVARCHAR(1000) NULL,
    [stateRegistration] NVARCHAR(1000) NULL,
    [municipalRegistration] NVARCHAR(1000) NULL,
    [regime] NVARCHAR(1000) NOT NULL,
    [ncm] NVARCHAR(1000) NOT NULL,
    [cfop] NVARCHAR(1000) NOT NULL,
    [csosn] NVARCHAR(1000) NOT NULL,
    [cest] NVARCHAR(1000) NULL,
    [serviceCode] NVARCHAR(1000) NULL,
    [issRate] DECIMAL(8,4) NULL,
    [city] NVARCHAR(1000) NOT NULL,
    [certificateEnc] NVARCHAR(MAX) NULL,
    [certificatePasswordEnc] NVARCHAR(MAX) NULL,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [fiscal_profiles_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE TABLE [dbo].[fiscal_documents] (
    [id] NVARCHAR(1000) NOT NULL,
    [saleId] NVARCHAR(1000) NOT NULL,
    [kind] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [accessKey] NVARCHAR(1000) NULL,
    [number] NVARCHAR(1000) NULL,
    [link] NVARCHAR(1000) NULL,
    [pushedToChannel] BIT NOT NULL CONSTRAINT [fiscal_documents_pushedToChannel_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [fiscal_documents_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [fiscal_documents_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [fiscal_documents_saleId_kind_key] UNIQUE NONCLUSTERED ([saleId], [kind])
);

ALTER TABLE [dbo].[nuvemshop_connections] ADD CONSTRAINT [nuvemshop_connections_companyId_fkey] FOREIGN KEY ([companyId]) REFERENCES [dbo].[companies]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[nuvemshop_connections] ADD CONSTRAINT [nuvemshop_connections_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[stores]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[charges] ADD CONSTRAINT [charges_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[charges] ADD CONSTRAINT [charges_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[sales]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;
ALTER TABLE [dbo].[fiscal_documents] ADD CONSTRAINT [fiscal_documents_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[sales]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
