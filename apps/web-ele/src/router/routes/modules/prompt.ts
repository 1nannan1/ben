import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'prompt',
    path: '/prompt',
    component: () => import('#/views/prompt/index.vue'),
    meta: {
      icon: 'humbleicons:prompt',
      title: $t('page.prompt.title'),
    },
  },
];

export default routes;
