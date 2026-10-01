import { randomUUID } from 'crypto';
import { defineAddon, type AddonContext, type AddonRequest } from '@retailflow/addon-sdk';

type Page = {
  identity: { name: string; logo: string; favicon: string; color: string };
  seo: { title: string; description: string; keywords: string; image: string };
  hero: { title: string; subtitle: string; image: string; button: string; link: string };
  contact: { phone: string; whatsapp: string; email: string; address: string; social: string };
  footer: { text: string; links: string; copyright: string };
};

type Section = { id: string; kind: string; title: string; description: string; image: string; order: number; status: string };

const PERMISSIONS = ['website.read', 'website.update', 'website.publish', 'website.settings'];

function emptyPage(): Page {
  return {
    identity: { name: '', logo: '', favicon: '', color: '' },
    seo: { title: '', description: '', keywords: '', image: '' },
    hero: { title: '', subtitle: '', image: '', button: '', link: '' },
    contact: { phone: '', whatsapp: '', email: '', address: '', social: '' },
    footer: { text: '', links: '', copyright: '' },
  };
}

async function query(context: AddonContext, statement: string, params: readonly unknown[] = []) {
  return (await context.database.execute(statement, params)) as Record<string, unknown>[];
}

async function load(context: AddonContext) {
  const tenant = context.tenant.current();
  const settings = await query(context, 'SELECT draft_json, published_json FROM addon_website_settings WHERE tenant_id = @P1', [tenant]);
  const sections = await query(
    context,
    'SELECT id, kind, title, description, image_url, sort_order, status FROM addon_website_sections WHERE tenant_id = @P1 ORDER BY sort_order',
    [tenant],
  );
  const mapSection = (row: Record<string, unknown>): Section => ({
    id: String(row.id),
    kind: String(row.kind),
    title: String(row.title),
    description: row.description ? String(row.description) : '',
    image: row.image_url ? String(row.image_url) : '',
    order: Number(row.sort_order),
    status: String(row.status),
  });
  return {
    draft: settings[0]?.draft_json ? (JSON.parse(String(settings[0].draft_json)) as Page) : emptyPage(),
    published: settings[0]?.published_json ? (JSON.parse(String(settings[0].published_json)) as Page) : null,
    sections: sections.map(mapSection),
  };
}

async function rememberMedia(context: AddonContext, value: string, alt: string) {
  if (!value || value.length > 400_000) return;
  await context.database.execute('INSERT INTO addon_website_media (id, tenant_id, path, alt) VALUES (@P1, @P2, @P3, @P4)', [
    randomUUID(),
    context.tenant.current(),
    value,
    alt,
  ]);
}

export default defineAddon((context) => {
  context.permissions.register(PERMISSIONS);
  context.menu.register({ to: '/admin/website', label: 'Website', permission: 'website.read' });
  context.ui.extend('sidebar.items', { id: 'website', label: 'Website' });

  context.http.publicRoute('GET', '/website/public', async (ctx) => {
    const page = await load(ctx);
    if (!page.published) throw new Error('NOT_FOUND');
    return { page: page.published, sections: page.sections.filter((section) => section.status === 'PUBLISHED') };
  });

  context.http.route('GET', '/website/settings', 'website.read', (ctx) => load(ctx));

  context.http.route('PUT', '/website/settings', 'website.update', async (ctx, request) => save(ctx, request));

  context.http.route('POST', '/website/publish', 'website.publish', async (ctx) => {
    const current = await load(ctx);
    const payload = JSON.stringify(current.draft);
    await ctx.database.execute('UPDATE addon_website_settings SET published_json = @P1, updated_at = SYSUTCDATETIME() WHERE tenant_id = @P2', [payload, ctx.tenant.current()]);
    await ctx.database.execute("UPDATE addon_website_sections SET status = CASE WHEN status = 'HIDDEN' THEN 'HIDDEN' ELSE 'PUBLISHED' END WHERE tenant_id = @P1", [ctx.tenant.current()]);
    await ctx.audit.log({ action: 'website.publish', entity: 'addon_website_settings', entityId: ctx.tenant.current(), newValue: current.draft.hero });
    return load(ctx);
  });
});

async function save(context: AddonContext, request: AddonRequest) {
  const body = request.body as { page?: Page; sections?: Section[] };
  const page = body.page ?? emptyPage();
  if ([page.hero?.image, page.identity?.logo, page.seo?.image].some((value) => (value?.length ?? 0) > 400_000)) {
    throw new Error('IMAGE');
  }
  const tenant = context.tenant.current();
  const existing = await query(context, 'SELECT id FROM addon_website_settings WHERE tenant_id = @P1', [tenant]);
  const payload = JSON.stringify(page);
  if (!existing.length) {
    await context.database.execute('INSERT INTO addon_website_settings (id, tenant_id, draft_json, published_json) VALUES (@P1, @P2, @P3, NULL)', [randomUUID(), tenant, payload]);
  } else {
    await context.database.execute('UPDATE addon_website_settings SET draft_json = @P1, updated_at = SYSUTCDATETIME() WHERE tenant_id = @P2', [payload, tenant]);
  }
  await context.database.execute('DELETE FROM addon_website_sections WHERE tenant_id = @P1', [tenant]);
  for (const section of body.sections ?? []) {
    await context.database.execute(
      'INSERT INTO addon_website_sections (id, tenant_id, kind, title, description, image_url, sort_order, status) VALUES (@P1, @P2, @P3, @P4, @P5, @P6, @P7, @P8)',
      [section.id || randomUUID(), tenant, section.kind || 'secao', section.title || 'Seção', section.description || '', section.image || '', section.order || 0, section.status || 'DRAFT'],
    );
    await rememberMedia(context, section.image, section.title);
  }
  await rememberMedia(context, page.hero.image, page.hero.title);
  return load(context);
}
