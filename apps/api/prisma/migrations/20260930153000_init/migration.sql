BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[users] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000) NOT NULL,
    [passwordHash] NVARCHAR(1000) NOT NULL,
    [role] NVARCHAR(1000) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [users_active_df] DEFAULT 1,
    [storeId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [users_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [users_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [users_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[stores] (
    [id] NVARCHAR(1000) NOT NULL,
    [code] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [city] NVARCHAR(1000) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [stores_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [stores_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [stores_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [stores_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateTable
CREATE TABLE [dbo].[customers] (
    [id] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [cpf] NVARCHAR(1000) NOT NULL,
    [email] NVARCHAR(1000),
    [phone] NVARCHAR(1000),
    [creditLimit] DECIMAL(18,2) NOT NULL CONSTRAINT [customers_creditLimit_df] DEFAULT 0,
    [active] BIT NOT NULL CONSTRAINT [customers_active_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [customers_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [customers_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [customers_cpf_key] UNIQUE NONCLUSTERED ([cpf])
);

-- CreateTable
CREATE TABLE [dbo].[products] (
    [id] NVARCHAR(1000) NOT NULL,
    [sku] NVARCHAR(1000) NOT NULL,
    [name] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(1000),
    [price] DECIMAL(18,2) NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [products_active_df] DEFAULT 1,
    CONSTRAINT [products_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [products_sku_key] UNIQUE NONCLUSTERED ([sku])
);

-- CreateTable
CREATE TABLE [dbo].[inventory] (
    [id] NVARCHAR(1000) NOT NULL,
    [storeId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    CONSTRAINT [inventory_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [inventory_storeId_productId_key] UNIQUE NONCLUSTERED ([storeId],[productId])
);

-- CreateTable
CREATE TABLE [dbo].[sales] (
    [id] NVARCHAR(1000) NOT NULL,
    [number] INT NOT NULL IDENTITY(1,1),
    [storeId] NVARCHAR(1000) NOT NULL,
    [customerId] NVARCHAR(1000) NOT NULL,
    [sellerId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [paymentMethod] NVARCHAR(1000) NOT NULL,
    [total] DECIMAL(18,2) NOT NULL,
    [cancelReason] NVARCHAR(max),
    [cancelledAt] DATETIME2,
    [cancelledById] NVARCHAR(1000),
    [proposalId] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [sales_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [sales_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [sales_number_key] UNIQUE NONCLUSTERED ([number]),
    CONSTRAINT [sales_proposalId_key] UNIQUE NONCLUSTERED ([proposalId])
);

-- CreateTable
CREATE TABLE [dbo].[sale_items] (
    [id] NVARCHAR(1000) NOT NULL,
    [saleId] NVARCHAR(1000) NOT NULL,
    [productId] NVARCHAR(1000) NOT NULL,
    [quantity] INT NOT NULL,
    [unitPrice] DECIMAL(18,2) NOT NULL,
    CONSTRAINT [sale_items_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[credit_proposals] (
    [id] NVARCHAR(1000) NOT NULL,
    [customerId] NVARCHAR(1000) NOT NULL,
    [storeId] NVARCHAR(1000) NOT NULL,
    [sellerId] NVARCHAR(1000) NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [installments] INT NOT NULL,
    [installmentAmount] DECIMAL(18,2) NOT NULL,
    [financedTotal] DECIMAL(18,2) NOT NULL,
    [monthlyInterestRate] DECIMAL(8,6) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [reviewerId] NVARCHAR(1000),
    [reviewedAt] DATETIME2,
    [rejectionReason] NVARCHAR(max),
    [additionalPolicyConfirmed] BIT NOT NULL CONSTRAINT [credit_proposals_additionalPolicyConfirmed_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [credit_proposals_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [credit_proposals_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[contracts] (
    [id] NVARCHAR(1000) NOT NULL,
    [number] INT NOT NULL IDENTITY(1,1),
    [proposalId] NVARCHAR(1000) NOT NULL,
    [saleId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [total] DECIMAL(18,2) NOT NULL,
    [installmentCount] INT NOT NULL,
    [cancelReason] NVARCHAR(max),
    [cancelledAt] DATETIME2,
    [cancelledById] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [contracts_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [contracts_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [contracts_number_key] UNIQUE NONCLUSTERED ([number]),
    CONSTRAINT [contracts_proposalId_key] UNIQUE NONCLUSTERED ([proposalId]),
    CONSTRAINT [contracts_saleId_key] UNIQUE NONCLUSTERED ([saleId])
);

-- CreateTable
CREATE TABLE [dbo].[installments] (
    [id] NVARCHAR(1000) NOT NULL,
    [contractId] NVARCHAR(1000) NOT NULL,
    [number] INT NOT NULL,
    [amount] DECIMAL(18,2) NOT NULL,
    [dueDate] DATETIME2 NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    CONSTRAINT [installments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [installments_contractId_number_key] UNIQUE NONCLUSTERED ([contractId],[number])
);

-- CreateTable
CREATE TABLE [dbo].[payments] (
    [id] NVARCHAR(1000) NOT NULL,
    [saleId] NVARCHAR(1000),
    [installmentId] NVARCHAR(1000),
    [amount] DECIMAL(18,2) NOT NULL,
    [method] NVARCHAR(1000) NOT NULL,
    [externalTransactionId] NVARCHAR(1000) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [registeredById] NVARCHAR(1000),
    [refundedById] NVARCHAR(1000),
    [refundReason] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [payments_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [payments_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [payments_externalTransactionId_key] UNIQUE NONCLUSTERED ([externalTransactionId])
);

-- CreateTable
CREATE TABLE [dbo].[audit_logs] (
    [id] NVARCHAR(1000) NOT NULL,
    [userId] NVARCHAR(1000),
    [action] NVARCHAR(1000) NOT NULL,
    [entity] NVARCHAR(1000) NOT NULL,
    [entityId] NVARCHAR(1000) NOT NULL,
    [oldValue] NVARCHAR(max),
    [newValue] NVARCHAR(max),
    [ip] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [audit_logs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_logs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[support_tickets] (
    [id] NVARCHAR(1000) NOT NULL,
    [customerId] NVARCHAR(1000) NOT NULL,
    [openedById] NVARCHAR(1000) NOT NULL,
    [assigneeId] NVARCHAR(1000),
    [subject] NVARCHAR(1000) NOT NULL,
    [description] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [support_tickets_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [support_tickets_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[credit_policies] (
    [id] NVARCHAR(1000) NOT NULL,
    [analystLimit] DECIMAL(18,2) NOT NULL,
    [managerLimit] DECIMAL(18,2) NOT NULL,
    [monthlyInterestRate] DECIMAL(8,6) NOT NULL,
    [maxInstallments] INT NOT NULL,
    [active] BIT NOT NULL CONSTRAINT [credit_policies_active_df] DEFAULT 1,
    [updatedAt] DATETIME2 NOT NULL CONSTRAINT [credit_policies_updatedAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [credit_policies_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[integration_jobs] (
    [id] NVARCHAR(1000) NOT NULL,
    [type] NVARCHAR(1000) NOT NULL,
    [payload] NVARCHAR(max) NOT NULL,
    [status] NVARCHAR(1000) NOT NULL,
    [attempts] INT NOT NULL CONSTRAINT [integration_jobs_attempts_df] DEFAULT 0,
    [lastError] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [integration_jobs_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [integration_jobs_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [sales_storeId_status_idx] ON [dbo].[sales]([storeId], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [credit_proposals_status_idx] ON [dbo].[credit_proposals]([status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [audit_logs_entity_entityId_idx] ON [dbo].[audit_logs]([entity], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [integration_jobs_status_idx] ON [dbo].[integration_jobs]([status]);

-- AddForeignKey
ALTER TABLE [dbo].[users] ADD CONSTRAINT [users_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[stores]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventory] ADD CONSTRAINT [inventory_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[stores]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[inventory] ADD CONSTRAINT [inventory_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[stores]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_sellerId_fkey] FOREIGN KEY ([sellerId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_cancelledById_fkey] FOREIGN KEY ([cancelledById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sales] ADD CONSTRAINT [sales_proposalId_fkey] FOREIGN KEY ([proposalId]) REFERENCES [dbo].[credit_proposals]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sale_items] ADD CONSTRAINT [sale_items_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[sales]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[sale_items] ADD CONSTRAINT [sale_items_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[products]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[credit_proposals] ADD CONSTRAINT [credit_proposals_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[credit_proposals] ADD CONSTRAINT [credit_proposals_storeId_fkey] FOREIGN KEY ([storeId]) REFERENCES [dbo].[stores]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[credit_proposals] ADD CONSTRAINT [credit_proposals_sellerId_fkey] FOREIGN KEY ([sellerId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[credit_proposals] ADD CONSTRAINT [credit_proposals_reviewerId_fkey] FOREIGN KEY ([reviewerId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[contracts] ADD CONSTRAINT [contracts_proposalId_fkey] FOREIGN KEY ([proposalId]) REFERENCES [dbo].[credit_proposals]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[contracts] ADD CONSTRAINT [contracts_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[sales]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[contracts] ADD CONSTRAINT [contracts_cancelledById_fkey] FOREIGN KEY ([cancelledById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[installments] ADD CONSTRAINT [installments_contractId_fkey] FOREIGN KEY ([contractId]) REFERENCES [dbo].[contracts]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_saleId_fkey] FOREIGN KEY ([saleId]) REFERENCES [dbo].[sales]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_installmentId_fkey] FOREIGN KEY ([installmentId]) REFERENCES [dbo].[installments]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_registeredById_fkey] FOREIGN KEY ([registeredById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[payments] ADD CONSTRAINT [payments_refundedById_fkey] FOREIGN KEY ([refundedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_logs] ADD CONSTRAINT [audit_logs_userId_fkey] FOREIGN KEY ([userId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[support_tickets] ADD CONSTRAINT [support_tickets_customerId_fkey] FOREIGN KEY ([customerId]) REFERENCES [dbo].[customers]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[support_tickets] ADD CONSTRAINT [support_tickets_openedById_fkey] FOREIGN KEY ([openedById]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[support_tickets] ADD CONSTRAINT [support_tickets_assigneeId_fkey] FOREIGN KEY ([assigneeId]) REFERENCES [dbo].[users]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
