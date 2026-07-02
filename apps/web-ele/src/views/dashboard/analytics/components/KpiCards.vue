<script lang="ts" setup>
import type { DashboardStats } from '#/api/system/dashboard';

import { computed, ref, watch } from 'vue';

import { ElCard, ElCol, ElRow, ElSkeletonItem } from 'element-plus';

import { $t } from '#/locales';

/** 单个 KPI 卡片的配置 */
interface KpiCardConfig {
  /** 唯一标识 */
  key: string;
  /** 标题 */
  label: string;
  /** 数值 */
  value: number | string;
  /** 格式化后缀 */
  suffix?: boolean;
  /** 是否为费用类型（显示 $ 前缀） */
  isCost?: boolean;
  /** 内联 SVG 图标路径数据 */
  svgPath: string;
}

/** 组件 Props */
interface Props {
  /** 统计数据 */
  stats: DashboardStats;
  /** 是否加载中 */
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

/** 当前动画数值（用于数字滚动效果） */
const animatedValues = ref<Record<string, number>>({});

/**
 * 数字滚动动画
 * 从 0 平滑过渡到目标值
 *
 * @param key - 卡片标识
 * @param target - 目标值
 * @param duration - 动画时长(ms)
 */
function animateNumber(key: string, target: number, duration = 800) {
  const start = animatedValues.value[key] ?? 0;
  const startTime = performance.now();

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // easeOutCubic 缓动函数
    const eased = 1 - (1 - progress) ** 3;
    animatedValues.value[key] = start + (target - start) * eased;

    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }

  requestAnimationFrame(step);
}

/**
 * 格式化大数字
 * 超过 10000 显示为 "X.X万"
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
 * 格式化费用值
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
 * 6 个 KPI 卡片配置
 * 根据 stats 数据动态生成，支持数字动画
 * 使用内联 SVG 图标，零外部依赖
 */
const cards = computed<KpiCardConfig[]>(() => [
  {
    isCost: false,
    key: 'totalUsers',
    label: $t('page.dashboard.totalUsers'),
    suffix: false,
    svgPath:
      'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 19v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    value: props.stats.totalUsers,
  },
  {
    isCost: false,
    key: 'totalConversations',
    label: $t('page.dashboard.totalConversations'),
    suffix: false,
    svgPath: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    value: props.stats.totalConversations,
  },
  {
    isCost: false,
    key: 'totalMessages',
    label: $t('page.dashboard.totalMessages'),
    suffix: false,
    svgPath:
      'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
    value: props.stats.totalMessages,
  },
  {
    isCost: false,
    key: 'totalTokens',
    label: $t('page.dashboard.totalTokens'),
    suffix: false,
    svgPath: 'M18 20V10M12 20V4M6 20v-6',
    value: props.stats.totalTokens,
  },
  {
    isCost: true,
    key: 'totalCost',
    label: $t('page.dashboard.totalCost'),
    suffix: false,
    svgPath: 'M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
    value: props.stats.totalCost,
  },
  {
    isCost: false,
    key: 'activeUsers',
    label: $t('page.dashboard.activeUsers'),
    suffix: true,
    svgPath: 'M22 12h-4l-3 9L9 3l-3 9H2',
    value: props.stats.activeUsers,
  },
]);

/** 监听数据变化，触发数字动画 */
watch(
  () => props.stats,
  (newStats) => {
    if (!newStats) return;
    animateNumber('totalUsers', newStats.totalUsers);
    animateNumber('totalConversations', newStats.totalConversations);
    animateNumber('totalMessages', newStats.totalMessages);
    animateNumber('totalTokens', newStats.totalTokens);
    // 费用单独处理
    const costNum = Number.parseFloat(newStats.totalCost);
    animateNumber('totalCost', costNum);
    animateNumber('activeUsers', newStats.activeUsers);
  },
  { immediate: true },
);

/**
 * 获取卡片显示的数值文本
 *
 * @param card - 卡片配置
 * @returns 显示文本
 */
function getDisplayValue(card: KpiCardConfig): string {
  if (card.isCost) {
    return formatCost(String(card.value));
  }

  const num =
    typeof card.value === 'number' ? card.value : Number.parseFloat(card.value);
  return formatLargeNumber(num);
}
</script>

<template>
  <ElRow :gutter="16" class="mb-5">
    <ElCol
      v-for="card in cards"
      :key="card.key"
      :lg="4"
      :md="8"
      :sm="12"
      :xs="12"
    >
      <!-- 加载中显示骨架屏 -->
      <ElCard v-if="loading" shadow="never" class="kpi-card">
        <div class="flex items-center justify-between">
          <div class="flex-1">
            <ElSkeletonItem variant="text" style="width: 80px; height: 14px" />
            <ElSkeletonItem
              variant="h3"
              style="width: 100px; margin-top: 8px"
            />
          </div>
          <ElSkeletonItem
            variant="circle"
            style="flex-shrink: 0; width: 40px; height: 40px"
          />
        </div>
      </ElCard>

      <!-- 正常状态 -->
      <ElCard v-else shadow="never" class="kpi-card">
        <div class="flex items-center justify-between">
          <!-- 左侧：指标名称 + 数值 -->
          <div class="min-w-0 flex-1">
            <p class="kpi-label">{{ card.label }}</p>
            <div class="flex items-baseline gap-1">
              <span class="kpi-value">
                {{ getDisplayValue(card) }}
              </span>
              <span v-if="card.suffix" class="kpi-suffix">{{
                $t('page.dashboard.activeDays')
              }}</span>
            </div>
          </div>

          <!-- 右侧：SVG 图标 -->
          <div class="kpi-icon-wrapper">
            <svg
              class="kpi-icon"
              fill="none"
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path :d="card.svgPath" />
            </svg>
          </div>
        </div>
      </ElCard>
    </ElCol>
  </ElRow>
</template>

<style scoped>
/* ==================== KPI 卡片样式 ==================== */

.kpi-card {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.kpi-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 12px rgb(0 0 0 / 4%);
}

/* 指标标签 */
.kpi-label {
  margin-bottom: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

/* 指标数值 */
.kpi-value {
  font-family: 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
  color: var(--el-text-color-primary);
  letter-spacing: -0.3px;
}

/* 后缀文字 */
.kpi-suffix {
  padding-left: 2px;
  font-size: 11px;
  font-weight: 500;
  color: var(--el-text-color-placeholder);
}

/* 图标容器 */
.kpi-icon-wrapper {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-left: 12px;
  background-color: var(--el-fill-color-light);
  border-radius: 8px;
}

/* SVG 图标 */
.kpi-icon {
  width: 20px;
  height: 20px;
  color: var(--el-text-color-regular);
}
</style>
