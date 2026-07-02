import type { RouteRecordRaw } from "vue-router";

import { $t } from "#/locales";

const routes: RouteRecordRaw[] = [
  {
    name: "models",
    path: "/system/models",
    component: () => import("#/views/system/models/index.vue"),
    meta: {
      icon: "carbon:machine-learning-model",
      title: $t("page.model.title"),
      authority: ['admin'],
    },
  },
];

export default routes;
