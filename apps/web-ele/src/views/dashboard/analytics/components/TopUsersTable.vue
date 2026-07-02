<script lang="ts" setup>
import type { UserRanking } from '#/api/system/dashboard';

import { onMounted, ref } from 'vue';

import {
  ElCard,
  ElImage,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { getUserRanking } from '#/api/system/dashboard';
import { $t } from '#/locales';

/** 组件 Props */
interface Props {
  /** 是否加载中（父组件全局 loading） */
  loading?: boolean;
}

withDefaults(defineProps<Props>(), {
  loading: false,
});

// ==================== 后端分页状态 ====================

/** 当前页码（从 1 开始） */
const currentPage = ref(1);
/** 每页条数 */
const pageSize = ref(8);
/** 当前页用户排行数据 */
const userRanking = ref<UserRanking[]>([]);
/** 总记录数 */
const total = ref(0);
/** 分页加载状态（切换页时显示） */
const pageLoading = ref(false);

/**
 * 从后端加载当前页的用户排行数据
 * 使用 Supabase range() 实现真正的后端分页
 */
async function fetchUserRanking() {
  pageLoading.value = true;
  try {
    const result = await getUserRanking(currentPage.value, pageSize.value);
    userRanking.value = result.data;
    total.value = result.total;
  } catch (error) {
    console.error('Failed to load user ranking:', error);
  } finally {
    pageLoading.value = false;
  }
}

/**
 * 分页切换回调：重新请求对应页数据
 *
 * @param page - 目标页码
 */
function handlePageChange(page: number) {
  currentPage.value = page;
  fetchUserRanking();
}

/**
 * 每页条数变化回调：重置到第一页并重新请求
 *
 * @param size - 新的每页条数
 */
function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchUserRanking();
}

// ==================== 格式化工具函数 ====================

/**
 * 格式化大数字（万级简化）
 *
 * @param num - 原始数字
 * @returns 格式化字符串
 */
function formatLargeNumber(num: number): string {
  if (num >= 10_000) {
    return `${(num / 10_000).toFixed(1)}万`;
  }
  return num.toLocaleString();
}

/**
 * 格式化费用值（美元）
 *
 * @param value - 费用字符串
 * @returns 格式化后的费用
 */
function formatCost(value: string): string {
  const num = Number.parseFloat(value);
  if (num >= 10_000) {
    return `$${(num / 10_000).toFixed(1)}万`;
  }
  return `$${num.toFixed(4)}`;
}

/**
 * 格式化为相对时间描述
 *
 * @param timestamp - ISO 时间字符串
 * @returns 相对时间文本
 */
function formatRelativeTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  // 超过7天显示具体日期
  return new Date(timestamp).toLocaleDateString();
}

// 组件挂载时加载数据
onMounted(() => {
  fetchUserRanking();
});
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <span class="section-title">{{ $t('page.dashboard.topUsers') }}</span>
    </template>

    <!-- 空数据状态 -->
    <div
      v-if="!pageLoading && userRanking.length === 0"
      class="py-12 text-center"
    >
      <p class="text-sm text-gray-400">{{ $t('page.dashboard.noData') }}</p>
    </div>

    <!-- 表格区域 -->
    <ElTable
      v-else
      v-loading="pageLoading"
      :data="userRanking"
      :default-sort="{ prop: 'totalTokens', order: 'descending' }"
      border
      size="small"
      stripe
      style="width: 100%"
    >
      <!-- 排名 -->
      <ElTableColumn width="60" align="center" label="#" type="index">
        <template #default="{ $index }">
          <span
            class="inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold"
            :class="{
              'bg-blue-50 text-blue-600': $index === 0,
              'bg-gray-50 text-gray-500': $index === 1,
              'bg-orange-50 text-orange-600': $index === 2,
              'text-gray-400': $index > 2,
            }"
          >
            {{ $index + 1 }}
          </span>
        </template>
      </ElTableColumn>

      <!-- 用户 -->
      <ElTableColumn min-width="180" :label="$t('page.dashboard.user')">
        <template #default="{ row }">
          <div class="flex items-center gap-2.5">
            <ElImage
              :src="row.avatar || ''"
              fit="cover"
              class="h-8 w-8 flex-shrink-0 rounded-full"
            >
              <template #error>
                <div
                  class="flex h-full w-full items-center justify-center bg-gray-100 text-xs font-medium text-gray-400"
                >
                  {{ row.nickname?.charAt(0)?.toUpperCase() }}
                </div>
              </template>
            </ElImage>
            <span class="truncate font-medium text-sm">{{ row.nickname }}</span>
          </div>
        </template>
      </ElTableColumn>

      <!-- 请求数 -->
      <ElTableColumn
        width="90"
        align="center"
        prop="requests"
        sortable="custom"
        :label="$t('page.dashboard.requests')"
      >
        <template #default="{ row }">
          <span class="font-mono text-xs">{{ row.requests }}</span>
        </template>
      </ElTableColumn>

      <!-- Token 消耗 -->
      <ElTableColumn
        width="120"
        align="center"
        prop="totalTokens"
        sortable="custom"
        :label="$t('page.dashboard.tokensUsed')"
      >
        <template #default="{ row }">
          <span class="font-mono text-xs font-medium text-blue-600">
            {{ formatLargeNumber(row.totalTokens) }}
          </span>
        </template>
      </ElTableColumn>

      <!-- 费用 -->
      <ElTableColumn
        width="110"
        align="center"
        sortable="custom"
        :label="$t('page.dashboard.costSpent')"
      >
        <template #default="{ row }">
          <span class="font-mono text-xs text-amber-600">
            {{ formatCost(row.totalCost) }}
          </span>
        </template>
      </ElTableColumn>

      <!-- 最后活跃 -->
      <ElTableColumn
        min-width="110"
        align="center"
        prop="lastActiveTime"
        sortable="custom"
        :label="$t('page.dashboard.lastActive')"
      >
        <template #default="{ row }">
          <span class="text-xs text-gray-500">
            {{ formatRelativeTime(row.lastActiveTime) }}
          </span>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- 分页器（始终显示，数据少时禁用） -->
    <div class="flex justify-end mt-4">
      <ElPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :disabled="total <= pageSize"
        :page-sizes="[5, 8, 10, 20]"
        :total="total"
        background
        layout="sizes, prev, pager, next"
        small
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </ElCard>
</template>

<style scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
