import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'aichat',
    path: '/aichat',
    component: () => import('#/views/aichat/index.vue'),
    meta: {
      icon: 'line-md:chat-round',
      title: $t('page.aichat.title'),
      authority: ['admin','user'],
    },
  },
];

export default routes;
