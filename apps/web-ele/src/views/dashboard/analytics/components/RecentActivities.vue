<script lang="ts" setup>
import type { Activity } from '#/api/system/dashboard';

import { onMounted, ref } from 'vue';

import {
  ElCard,
  ElEmpty,
  ElPagination,
  ElTable,
  ElTableColumn,
} from 'element-plus';

import { getRecentActivities } from '#/api/system/dashboard';
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
/** 当前页数据列表 */
const activities = ref<Activity[]>([]);
/** 总记录数 */
const total = ref(0);
/** 分页加载状态（切换页时显示） */
const pageLoading = ref(false);

/**
 * 从后端加载当前页的活动数据
 * 使用 Supabase range() 实现真正的后端分页
 */
async function fetchActivities() {
  pageLoading.value = true;
  try {
    const result = await getRecentActivities(currentPage.value, pageSize.value);
    activities.value = result.data;
    total.value = result.total;
  } catch (error) {
    console.error('Failed to load recent activities:', error);
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
  fetchActivities();
}

/**
 * 每页条数变化回调：重置到第一页并重新请求
 *
 * @param size - 新的每页条数
 */
function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchActivities();
}

// 组件挂载时加载数据
onMounted(() => {
  fetchActivities();
});

/**
 * 格式化活动时间为相对时间
 *
 * @param timestamp - ISO 时间字符串
 * @returns 相对时间文本
 */
function formatActivityTime(timestamp: string): string {
  const now = Date.now();
  const time = new Date(timestamp).getTime();
  const diffMs = now - time;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHour = Math.floor(diffMs / 3_600_000);
  const diffDay = Math.floor(diffMs / 86_400_000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  return new Date(timestamp).toLocaleDateString();
}
</script>

<template>
  <ElCard shadow="never">
    <template #header>
      <span class="section-title">{{
        $t('page.dashboard.recentActivities')
      }}</span>
    </template>

    <!-- 空数据状态 -->
    <ElEmpty
      v-if="!pageLoading && activities.length === 0"
      :description="$t('page.dashboard.noData')"
      :image-size="80"
    />

    <!-- 活动表格 -->
    <ElTable
      v-else
      v-loading="pageLoading"
      :data="activities"
      :show-header="true"
      stripe
      size="small"
      class="activity-table"
    >
      <!-- 用户列 -->
      <ElTableColumn :label="$t('page.dashboard.activityUser')" min-width="100">
        <template #default="{ row }">
          <div class="flex items-center gap-2">
            <img
              v-if="row.userAvatar"
              :src="row.userAvatar"
              alt=""
              class="h-5 w-5 rounded-full object-cover flex-shrink-0"
            />
            <span
              v-else
              class="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[10px] text-gray-400"
            >
              {{ row.userName?.charAt(0) }}
            </span>
            <span class="user-name">{{ row.userName }}</span>
          </div>
        </template>
      </ElTableColumn>

      <!-- 描述列 -->
      <ElTableColumn
        :label="$t('page.dashboard.activityDesc')"
        min-width="160"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <div class="flex items-center gap-1.5">
            <svg
              stroke="#8b5cf6"
              class="h-3.5 w-3.5 flex-shrink-0"
              fill="none"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
            <span class="activity-desc">{{ row.description }}</span>
          </div>
        </template>
      </ElTableColumn>

      <!-- 时间列 -->
      <ElTableColumn
        :label="$t('page.dashboard.activityTime')"
        width="70"
        align="right"
      >
        <template #default="{ row }">
          <span class="activity-time">
            {{ formatActivityTime(row.timestamp) }}
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
/* 表格样式 */
.activity-table {
  --el-table-header-bg-color: var(--el-fill-color-lighter);
  --el-table-header-text-color: var(--el-text-color-secondary);
  --el-table-border-color: var(--el-border-color-lighter);

  margin-top: auto; /* 推到底部对齐左侧视觉 */
  margin-bottom: auto; /* 居中效果 */
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.user-name {
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.activity-desc {
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
}

.activity-time {
  font-size: 11px;
  color: var(--el-text-color-placeholder);
  white-space: nowrap;
}
</style>
