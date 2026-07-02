<script lang="ts" setup>
import type { Prompt } from '#/api/core/prompt';

import { computed } from 'vue';

import {
  ElDescriptions,
  ElDescriptionsItem,
  ElDialog,
  ElTag,
} from 'element-plus';

/**
 * 组件 Props 定义
 */
interface Props {
  /** Prompt 数据 */
  data: null | Prompt;
}

const props = defineProps<Props>();

/**
 * 组件 Emits 定义
 */
const emit = defineEmits<{
  /** 关闭事件 */
  close: [];
}>();

/**
 * 是否显示弹窗
 */
const visible = computed(() => !!props.data);

/**
 * 格式化分类标签类型
 * @param category 分类名称
 */
function getCategoryType(
  category: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  const typeMap: Record<
    string,
    'danger' | 'info' | 'primary' | 'success' | 'warning'
  > = {
    写作: 'primary',
    翻译: 'success',
    编程: 'warning',
    分析: 'danger',
    其他: 'info',
  };
  return typeMap[category] || 'info';
}

/**
 * 格式化时间显示
 * @param dateString 时间字符串
 */
function formatDate(dateString: string): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 关闭弹窗
 */
function handleClose() {
  emit('close');
}
</script>

<template>
  <ElDialog
    :model-value="visible"
    title="Prompt 详情"
    width="700px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <!-- Prompt 详情内容 -->
    <div v-if="data" class="prompt-detail">
      <!-- 基本信息 -->
      <ElDescriptions :column="1" border class="mb-4">
        <!-- 标题 -->
        <ElDescriptionsItem label="标题" :span="1">
          <span class="text-lg font-semibold">{{ data.title }}</span>
        </ElDescriptionsItem>

        <!-- 分类 -->
        <ElDescriptionsItem label="分类" :span="1">
          <ElTag :type="getCategoryType(data.category)" size="default">
            {{ data.category }}
          </ElTag>
        </ElDescriptionsItem>

        <!-- 创建时间 -->
        <ElDescriptionsItem label="创建时间" :span="1">
          <span class="text-gray-600">{{ formatDate(data.created_at) }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <!-- Prompt 内容区域 -->
      <div class="content-section">
        <div class="mb-2 flex items-center gap-2">
          <span class="i-carbon-document text-blue-500"></span>
          <span class="font-medium text-gray-700">Prompt 内容</span>
        </div>

        <!-- 内容展示区域 -->
        <div class="content-display rounded-lg border bg-gray-50 p-4">
          <pre
            class="whitespace-pre-wrap text-sm leading-relaxed text-gray-800"
          >
            {{ data.content }}
          </pre>
        </div>

        <!-- 字数统计 -->
        <div class="mt-2 text-right text-xs text-gray-400">
          共 {{ data.content?.length || 0 }} 个字符
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<style scoped>
.prompt-detail {
  padding: 10px 0;
}

.content-section {
  margin-top: 20px;
}

.content-display {
  max-height: 400px;
  overflow-y: auto;
}

.content-display::-webkit-scrollbar {
  width: 6px;
}

.content-display::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.content-display::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}
</style>
