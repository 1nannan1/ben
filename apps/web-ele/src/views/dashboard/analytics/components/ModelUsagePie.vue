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
 * 饼图配色方案
 * 采用低饱和度企业级配色，无花哨渐变
 */
const PIE_COLORS = [
  '#3b82f6',
  '#10b981',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
];

/**
 * 渲染模型使用占比饼图
 * 环形设计，底部图例横向排列
 */
function renderChart() {
  renderEcharts({
    legend: {
      bottom: 0,
      icon: 'circle',
      itemGap: 16,
      itemWidth: 8,
      itemHeight: 8,
      orient: 'horizontal',
      textStyle: { color: '#6b7280', fontSize: 11 },
      type: 'scroll',
    },
    series: [
      {
        avoidLabelOverlap: true,
        data: (props.data || []).map((item, index) => ({
          name: item.modelName,
          value: item.usageCount,
          itemStyle: {
            color: PIE_COLORS[index % PIE_COLORS.length],
            borderRadius: 4,
            borderColor: '#fff',
            borderWidth: 2,
          },
        })),
        emphasis: {
          label: { fontSize: 13, fontWeight: 600, show: true },
          scale: true,
          scaleSize: 5,
        },
        label: { show: false },
        radius: ['45%', '72%'],
        silent: true,
        type: 'pie',
      },
    ],
    title: {
      left: 'center',
      subtextStyle: { color: '#9ca3af', fontSize: 11 },
      text: $t('page.dashboard.modelDistribution'),
      textStyle: { color: '#374151', fontSize: 13, fontWeight: 500 },
      top: 'center',
    },
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      formatter: '{b}: {c} ({d}%)',
      padding: [8, 12],
      textStyle: { fontSize: 12, color: '#374151' },
      trigger: 'item',
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
  <ElCol :lg="10" :md="24" :xs="24">
    <ElCard shadow="never">
      <template #header>
        <span class="section-title">{{ $t('page.dashboard.modelUsage') }}</span>
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
