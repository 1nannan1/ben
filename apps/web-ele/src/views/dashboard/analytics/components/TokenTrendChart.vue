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

/** 企业级配色：主色蓝 */
const PRIMARY_COLOR = '#3b82f6';
const AREA_COLOR = 'rgba(59,130,246,0.08)';
const GRID_COLOR = 'rgba(0,0,0,0.06)';

/**
 * 渲染 Token 使用量趋势折线图
 * 采用企业级简洁风格：无渐变、细线条、清晰网格
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
      data: [$t('page.dashboard.tokenUsage')],
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
        data: (props.data || []).map((item) => item.tokens),
        lineStyle: { width: 2, color: PRIMARY_COLOR },
        name: $t('page.dashboard.tokenUsage'),
        showSymbol: false,
        smooth: false,
        symbol: 'circle',
        symbolSize: 6,
        type: 'line',
      },
    ],
    tooltip: {
      axisPointer: {
        type: 'line',
        lineStyle: { color: '#d1d5db', type: 'dashed' },
      },
      backgroundColor: '#fff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
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
        formatter: (val: number) =>
          val >= 10_000 ? `${val / 10_000}万` : String(val),
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

/** 数据变化时延迟重绘图表（等待 DOM 更新完成） */
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
            $t('page.dashboard.tokenTrend')
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
