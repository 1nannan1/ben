<script lang="ts" setup>
import type { Chat } from '#/api/core/chat';

import { computed } from 'vue';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
  ElEmpty,
  ElSkeleton,
  ElTag,
} from 'element-plus';

/**
 * 组件 Props 定义
 */
interface Props {
  /** 会话数据（包含关联的消息数组） */
  data: (Chat & { messages?: any[] }) | null;
  /** 加载状态 */
  loading: boolean;
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
 * 计算属性：消息数量
 * 从嵌套的 messages 数组中获取长度
 */
const messageCount = computed(() => {
  if (!props.data?.messages) return 0;
  return props.data.messages.length;
});

/**
 * 获取模型标签类型
 * @param model - 模型名称
 */
function getModelType(
  model: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  const modelTypeMap: Record<
    string,
    'danger' | 'info' | 'primary' | 'success' | 'warning'
  > = {
    'gpt-4': 'primary',
    'gpt-3.5-turbo': 'success',
    claude: 'warning',
    deepseek: 'info',
  };

  return modelTypeMap[model] || 'info';
}

/**
 * 获取模型显示名称
 * @param model - 模型标识
 */
function getModelLabel(model: string): string {
  const labelMap: Record<string, string> = {
    'gpt-4': 'GPT-4',
    'gpt-3.5-turbo': 'GPT-3.5',
    claude: 'Claude',
    deepseek: 'DeepSeek',
  };

  return labelMap[model] || model.toUpperCase();
}

/**
 * 格式化完整日期时间
 * @param dateStr - ISO 格式日期字符串
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 关闭 Drawer
 */
function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="chat-detail-drawer">
    <!-- 加载状态 -->
    <div v-if="loading" class="p-6">
      <ElSkeleton :rows="8" animated />
    </div>

    <!-- 空数据状态 -->
    <div
      v-else-if="!data"
      class="flex flex-col items-center justify-center py-12"
    >
      <ElEmpty description="暂无会话数据" :image-size="120" />
      <ElButton type="primary" class="mt-4" @click="handleClose">关闭</ElButton>
    </div>

    <!-- 详情内容 -->
    <div v-else class="p-6">
      <!-- 头部区域：标题和模型 -->
      <div
        class="mb-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 p-5"
      >
        <h2
          class="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2"
        >
          <span class="text-2xl">💬</span>
          {{ data.title }}
        </h2>
        <div class="flex items-center gap-3 mt-3">
          <ElTag
            :type="getModelType(data.model)"
            effect="dark"
            size="large"
            round
          >
            {{ getModelLabel(data.model) }}
          </ElTag>
          <span class="text-sm text-gray-500"> 会话 ID: {{ data.id }} </span>
        </div>
      </div>

      <!-- 基本信息描述列表 -->
      <ElDescriptions
        title="📋 基本信息"
        :column="1"
        border
        class="mb-6"
        :label-style="{
          width: '100px',
          backgroundColor: '#f8fafc',
          fontWeight: 600,
        }"
      >
        <!-- 会话 ID -->
        <ElDescriptionsItem label="会话 ID">
          <span class="font-mono text-sm">{{ data.id }}</span>
        </ElDescriptionsItem>

        <!-- 用户 ID -->
        <ElDescriptionsItem label="所属用户">
          <span class="font-mono text-sm">{{ data.user_id }}</span>
        </ElDescriptionsItem>

        <!-- AI 模型 -->
        <ElDescriptionsItem label="AI 模型">
          <ElTag :type="getModelType(data.model)" effect="light" round>
            {{ getModelLabel(data.model) }}
          </ElTag>
        </ElDescriptionsItem>

        <!-- 创建时间 -->
        <ElDescriptionsItem label="创建时间">
          <span class="text-gray-700">{{ formatDate(data.created_at) }}</span>
        </ElDescriptionsItem>

        <!-- 消息数量 -->
        <ElDescriptionsItem label="消息数量">
          <div class="flex items-center gap-2">
            <span class="i-carbon-chat text-blue-600 text-lg"></span>
            <span class="font-semibold text-blue-600 text-lg">
              {{ messageCount }}
            </span>
            <span class="text-gray-500">条消息</span>
          </div>
        </ElDescriptionsItem>
      </ElDescriptions>

      <!-- 统计信息卡片 -->
      <div v-if="data.messages && data.messages.length > 0" class="mb-6">
        <ElDivider content-position="left">
          <span class="font-semibold text-gray-700">📊 消息统计</span>
        </ElDivider>

        <div class="grid grid-cols-2 gap-3">
          <!-- 用户消息数 -->
          <div class="rounded-lg border bg-green-50 p-4 text-center">
            <p class="text-2xl font-bold text-green-600">
              {{ data.messages.filter((m) => m.role === 'user').length }}
            </p>
            <p class="text-xs text-gray-500 mt-1">用户消息</p>
          </div>

          <!-- AI 回复数 -->
          <div class="rounded-lg border bg-blue-50 p-4 text-center">
            <p class="text-2xl font-bold text-blue-600">
              {{ data.messages.filter((m) => m.role === 'assistant').length }}
            </p>
            <p class="text-xs text-gray-500 mt-1">AI 回复</p>
          </div>
        </div>
      </div>

      <!-- 最近消息预览 -->
      <div v-if="data.messages && data.messages.length > 0">
        <ElDivider content-position="left">
          <span class="font-semibold text-gray-700">💬 最近消息预览</span>
        </ElDivider>

        <div class="space-y-3 max-h-[300px] overflow-y-auto pr-2">
          <div
            v-for="(msg, index) in data.messages.slice(-5)"
            :key="index"
            class="rounded-lg p-3"
            :class="
              msg.role === 'user'
                ? 'bg-gray-100 border-l-4 border-green-400'
                : 'bg-blue-50 border-l-4 border-blue-400'
            "
          >
            <div class="flex items-center justify-between mb-2">
              <ElTag
                :type="msg.role === 'user' ? 'success' : 'primary'"
                size="small"
                effect="dark"
                round
              >
                {{ msg.role === 'user' ? '👤 用户' : '🤖 助手' }}
              </ElTag>
              <span class="text-xs text-gray-400">
                {{ formatDate(msg.created_at) }}
              </span>
            </div>
            <p class="text-sm text-gray-700 line-clamp-3">
              {{ msg.content }}
            </p>
          </div>
        </div>

        <!-- 显示更多提示 -->
        <div
          v-if="messageCount > 5"
          class="mt-3 text-center text-sm text-gray-400"
        >
          还有 {{ messageCount - 5 }} 条消息未显示...
        </div>
      </div>

      <!-- 无消息提示 -->
      <div v-else class="text-center py-8">
        <span class="i-carbon-chat text-gray-300 text-5xl"></span>
        <p class="mt-3 text-gray-500">该会话暂无消息记录</p>
      </div>

      <!-- 底部操作按钮 -->
      <div class="mt-6 pt-4 border-t flex justify-end">
        <ElButton type="primary" @click="handleClose">关闭</ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-detail-drawer {
  height: 100%;
  overflow-y: auto;
}

/* 自定义滚动条样式 */
.chat-detail-drawer::-webkit-scrollbar {
  width: 6px;
}

.chat-detail-drawer::-webkit-scrollbar-thumb {
  background-color: #d1d5db;
  border-radius: 3px;
}

.chat-detail-drawer::-webkit-scrollbar-track {
  background-color: #f3f4f6;
}

/* 文本截断效果 */
.line-clamp-3 {
  display: -webkit-box;
  overflow: hidden;
  text-overflow: ellipsis;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
</style>
