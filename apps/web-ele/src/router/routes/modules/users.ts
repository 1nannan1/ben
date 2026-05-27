import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'users',
    path: '/users',
    component: () => import('#/views/users/index.vue'),
    meta: {
      icon: 'lucide:user',
      title: $t('page.users.title'),
    },
  },
];

export default routes;
