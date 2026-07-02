<script lang="ts" setup>
import type {
  DashboardStats,
  ModelUsage,
  TrendItem,
} from '#/api/system/dashboard';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import { ElRow } from 'element-plus';

/** API 接口 */
import {
  getDashboardStats,
  getModelUsage,
  getTrendData,
} from '#/api/system/dashboard';
import { $t } from '#/locales';

/** 子组件 */
import CostTrendChart from './components/CostTrendChart.vue';
import KpiCards from './components/KpiCards.vue';
import ModelTokenBar from './components/ModelTokenBar.vue';
import ModelUsagePie from './components/ModelUsagePie.vue';
import RecentActivities from './components/RecentActivities.vue';
import TokenTrendChart from './components/TokenTrendChart.vue';
import TopUsersTable from './components/TopUsersTable.vue';

// ==================== 响应式数据 ====================

/** 全局加载状态 */
const loading = ref(false);

/** 概览统计数据 */
const stats = ref<DashboardStats>({
  activeUsers: 0,
  totalConversations: 0,
  totalCost: '0',
  totalMessages: 0,
  totalTokens: 0,
  totalUsers: 0,
});

/** 趋势数据 */
const trendData = ref<TrendItem[]>([]);

/** 模型使用统计 */
const modelUsage = ref<ModelUsage[]>([]);

/**
 * 并行加载仪表盘核心数据（图表和 KPI）
 * 用户排行和最近活动由子组件自行通过后端分页加载
 */
async function fetchDashboardData() {
  loading.value = true;
  try {
    const [statsRes, trendRes, modelRes] = await Promise.all([
      getDashboardStats(),
      getTrendData(),
      getModelUsage(),
    ]);

    stats.value = statsRes;
    trendData.value = trendRes;
    modelUsage.value = modelRes;
  } catch (error) {
    console.error($t('page.dashboard.fetchFailed'), error);
  } finally {
    loading.value = false;
  }
}

// 组件挂载时加载数据
onMounted(() => {
  fetchDashboardData();
});
</script>

<template>
  <Page v-loading="loading" :title="$t('page.dashboard.title')">
    <!-- ========== 第一部分：KPI 统计卡片（6个） ========== -->
    <KpiCards :stats="stats" :loading="loading" />

    <!-- ========== 第二部分：趋势分析（折线图） ========== -->
    <ElRow :gutter="16" class="mb-5">
      <TokenTrendChart :data="trendData" :loading="loading" />
      <CostTrendChart :data="trendData" :loading="loading" />
    </ElRow>

    <!-- ========== 第三部分：业务分析（饼图 + 柱状图） ========== -->
    <ElRow :gutter="16" class="mb-5">
      <ModelUsagePie :data="modelUsage" :loading="loading" />
      <ModelTokenBar :data="modelUsage" :loading="loading" />
    </ElRow>

    <!-- ========== 第四部分：用户排行表格（整行） ========== -->
    <div class="mb-5">
      <TopUsersTable :loading="loading" />
    </div>

    <!-- ========== 第五部分：最近活动时间线（整行） ========== -->
    <RecentActivities :loading="loading" />
  </Page>
</template>

<style scoped>
/* 页面级样式 */
</style>
