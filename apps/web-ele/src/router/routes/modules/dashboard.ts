import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: $t('page.dashboard.title'),
      authority: ['admin','user'],
      affixTab: true,
    },
    name: 'Dashboard',
    path: '/dashboard/analytics',
    component: () => import('#/views/dashboard/analytics/index.vue'),
  },
];

export default routes;
