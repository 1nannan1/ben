<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { ModelUsage } from '#/api/system/dashboard';

import { ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { ElCard, ElCol, ElEmpty } from 'element-plus';

import { $t } from '#/locales';

/** 组件 Props */
interface Props {
  /** 模型使用统计数据 */
  data: ModelUsage[];
  /** 是否加载中 */
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

/** ECharts 实例引用 */
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

/**
 * 柱状图配色
 * 与饼图保持一致的调色板
 */
const BAR_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

/**
 * 渲染模型 Token 排名水平柱状图
 * 按 Token 消耗降序排列，右侧显示数值标签
 */
function renderChart() {
  if ((props.data || []).length === 0) return;

  // 按 Token 数降序排列
  const sorted = [...props.data].toSorted(
    (a, b) => b.totalTokens - a.totalTokens,
  );

  renderEcharts({
    grid: { bottom: 16, containLabel: true, left: 100, right: 40, top: 8 },
    series: [
      {
        barMaxWidth: 20,
        data: sorted.map((item, index) => ({
          name: item.modelName,
          value: item.totalTokens,
          itemStyle: {
            color: BAR_COLORS[index % BAR_COLORS.length],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        label: {
          color: '#6b7280',
          fontFamily: "'SF Mono','Menlo','Monaco',monospace",
          fontSize: 11,
          position: 'right',
          show: true,
          formatter: (params: any) => {
            const val = params.value as number;
            return val >= 10_000
              ? `${(val / 10_000).toFixed(1)}万`
              : String(val);
          },
        },
        type: 'bar',
      },
    ],
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params[0] : params;
        return `<strong>${p.name}</strong><br/>Tokens: ${(p.value ?? 0).toLocaleString()}`;
      },
      padding: [8, 12],
      textStyle: { fontSize: 12, color: '#374151' },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { show: false },
      axisLine: { show: false },
      splitLine: { show: false },
      type: 'value',
    },
    yAxis: {
      axisLabel: { color: '#6b7280', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      data: sorted.map((item) => item.modelName),
      inverse: true,
      type: 'category',
    },
  });
}

/** 数据变化时延迟重绘图表 */
watch(
  () => props.data,
  async () => {
    await new Promise<void>((resolve) => setTimeout(resolve, 60));
    renderChart();
  },
  { deep: true },
);
</script>

<template>
  <ElCol :lg="14" :md="24" :xs="24">
    <ElCard shadow="never">
      <template #header>
        <span class="section-title">{{
          $t('page.dashboard.modelTokenRank')
        }}</span>
      </template>

      <!-- 空数据状态 -->
      <ElEmpty
        v-if="!loading && data.length === 0"
        :description="$t('page.dashboard.noData')"
        :image-size="80"
      />

      <!-- 图表区域 -->
      <EchartsUI v-else ref="chartRef" height="320px" />
    </ElCard>
  </ElCol>
</template>

<style scoped>
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>
