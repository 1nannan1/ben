import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'message',
    path: '/message',
    component: () => import('#/views/message/index.vue'),
    meta: {
      icon: 'carbon:document',
      title: $t('page.message.title'),
      authority: ['admin','user'],
    },
  },
];

export default routes;
