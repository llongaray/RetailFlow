INSERT INTO [dbo].[addon_website_settings] ([id], [tenant_id], [draft_json], [published_json])
VALUES (
    N'website-settings-company',
    N'company',
    N'{"identity":{"name":"RetailFlow","logo":"","favicon":"","color":""},"seo":{"title":"RetailFlow","description":"Varejo e crédito na mesma operação.","keywords":"varejo, crédito","image":""},"hero":{"title":"Vendas e crédito num só lugar","subtitle":"A página pública da loja.","image":"","button":"Falar com a loja","link":"/contato"},"contact":{"phone":"","whatsapp":"","email":"contato@retailflow.local","address":"","social":""},"footer":{"text":"RetailFlow","links":"","copyright":"RetailFlow"}}',
    N'{"identity":{"name":"RetailFlow","logo":"","favicon":"","color":""},"seo":{"title":"RetailFlow","description":"Varejo e crédito na mesma operação.","keywords":"varejo, crédito","image":""},"hero":{"title":"Vendas e crédito num só lugar","subtitle":"A página pública da loja.","image":"","button":"Falar com a loja","link":"/contato"},"contact":{"phone":"","whatsapp":"","email":"contato@retailflow.local","address":"","social":""},"footer":{"text":"RetailFlow","links":"","copyright":"RetailFlow"}}'
);

INSERT INTO [dbo].[addon_website_sections] ([id], [tenant_id], [kind], [title], [description], [image_url], [sort_order], [status])
VALUES (N'website-section-benefits', N'company', N'beneficios', N'Benefícios', N'Mais controle para o varejo.', N'', 1, N'PUBLISHED')
