<script lang="ts" setup>
import type { EchartsUIType } from '@vben/plugins/echarts';

import type { TrendItem } from '#/api/system/dashboard';

import { ref, watch } from 'vue';

import { EchartsUI, useEcharts } from '@vben/plugins/echarts';

import { ElCard, ElCol, ElEmpty } from 'element-plus';

import { $t } from '#/locales';

/** 组件 Props */
interface Props {
  /** 趋势数据 */
  data: TrendItem[];
  /** 是否加载中 */
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

/** ECharts 实例引用 */
const chartRef = ref<EchartsUIType>();
const { renderEcharts } = useEcharts(chartRef);

/** 企业级配色：费用用暖橙色 */
const PRIMARY_COLOR = '#f59e0b';
const AREA_COLOR = 'rgba(245,158,11,0.08)';
const GRID_COLOR = 'rgba(0,0,0,0.06)';

/**
 * 渲染费用趋势折线图
 * 与 Token 趋势图保持一致的企业级视觉风格
 */
function renderChart() {
  renderEcharts({
    animationDuration: 600,
    color: [PRIMARY_COLOR],
    grid: {
      bottom: 28,
      containLabel: true,
      left: 48,
      right: 16,
      top: 36,
    },
    legend: {
      data: [$t('page.dashboard.costUsage')],
      icon: 'roundRect',
      itemWidth: 12,
      itemHeight: 3,
      itemGap: 24,
      textStyle: { fontSize: 12, color: '#6b7280' },
      top: 4,
    },
    series: [
      {
        areaStyle: { color: AREA_COLOR },
        data: (props.data || []).map((item) => Number(item.cost.toFixed(6))),
        lineStyle: { width: 2, color: PRIMARY_COLOR },
        name: $t('page.dashboard.costUsage'),
        showSymbol: false,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        type: 'line',
      },
    ],
    tooltip: {
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      formatter: (params: any) => {
        const val = params[0];
        return `<strong>${val.axisValue}</strong><br/>$ ${Number(val.data).toFixed(6)}`;
      },
      padding: [8, 12],
      textStyle: { fontSize: 12, color: '#374151' },
      trigger: 'axis',
    },
    xAxis: {
      axisLabel: { color: '#9ca3af', fontSize: 11 },
      axisLine: { show: false },
      axisTick: { show: false },
      boundaryGap: false,
      data: (props.data || []).map((item) => item.date),
      splitLine: { show: false },
      type: 'category',
    },
    yAxis: {
      axisLabel: {
        color: '#9ca3af',
        fontSize: 11,
        formatter: (val: number) => `$${val.toFixed(2)}`,
      },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        lineStyle: { color: GRID_COLOR, type: 'solid' },
        show: true,
      },
      type: 'value',
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
  <ElCol :lg="12" :md="24" :xs="24">
    <ElCard shadow="never">
      <template #header>
        <div class="flex items-center justify-between">
          <span class="section-title">{{
            $t('page.dashboard.costTrend')
          }}</span>
        </div>
      </template>

      <!-- 空数据状态 -->
      <ElEmpty
        v-if="!loading && data.length === 0"
        :description="$t('page.dashboard.noData')"
        :image-size="80"
      />

      <!-- 图表区域 -->
      <EchartsUI v-else ref="chartRef" height="300px" />
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
