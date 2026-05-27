import type { RouteRecordRaw } from 'vue-router';

import { $t } from '#/locales';

const routes: RouteRecordRaw[] = [
  {
    name: 'setting',
    path: '/setting',
    component: () => import('#/views/setting/index.vue'),
    meta: {
      icon: 'uil:setting',
      title: $t('page.setting.title'),
    },
  },
];

export default routes;
