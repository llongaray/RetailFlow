import { createRouter, createWebHistory } from 'vue-router';
import { useSession } from '../stores/session';
import AuditView from '../modules/audit/AuditView.vue';
import CatalogView from '../modules/products/CatalogView.vue';
import CreditView from '../modules/credit/CreditView.vue';
import CustomersView from '../modules/customers/CustomersView.vue';
import DashboardView from '../modules/dashboard/DashboardView.vue';
import AddonsView from '../modules/addons/AddonsView.vue';
import IntegrationsView from '../modules/integrations/IntegrationsView.vue';
import SaleDetailView from '../modules/sales/SaleDetailView.vue';
import SaleWizardView from '../modules/sales/SaleWizardView.vue';
import SalesView from '../modules/sales/SalesView.vue';
import SupportView from '../modules/support/SupportView.vue';
import LoginView from '../views/LoginView.vue';
import WelcomeView from '../views/WelcomeView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: LoginView, meta: { public: true } },
    { path: '/', component: DashboardView },
    { path: '/welcome', component: WelcomeView },
    { path: '/customers', component: CustomersView, meta: { permission: 'customer.read' } },
    { path: '/catalog', component: CatalogView, meta: { permission: 'catalog.read' } },
    { path: '/sales', component: SalesView, meta: { permission: 'sale.read' } },
    { path: '/sales/new', component: SaleWizardView, meta: { permission: 'sale.create' } },
    { path: '/sales/:id', component: SaleDetailView, meta: { permission: 'sale.read' } },
    { path: '/credit', component: CreditView, meta: { permission: 'credit.read' } },
    { path: '/support', component: SupportView, meta: { permission: 'support.read' } },
    { path: '/audit', component: AuditView, meta: { permission: 'audit.read' } },
    { path: '/integrations', component: IntegrationsView, meta: { permission: 'audit.read' } },
    { path: '/addons', component: AddonsView, meta: { permission: 'addon.manage' } },
  ],
});

router.beforeEach((to) => {
  const session = useSession();
  if (to.meta.public) return session.authenticated ? '/' : true;
  if (!session.authenticated) return '/login';
  const permission = to.meta.permission as string | undefined;
  if (permission && !session.can(permission)) return '/';
  return true;
});
