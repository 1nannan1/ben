<script lang="ts" setup>
import type { Message } from '#/api/core/message';

import {
  ElButton,
  ElDescriptions,
  ElDescriptionsItem,
  ElDivider,
  ElTag,
} from 'element-plus';

import { $t } from '#/locales';

/**
 * 组件 Props 定义
 */
interface Props {
  /** 消息数据 */
  data: Message | null;
}

defineProps<Props>();

/**
 * 组件 Emits 定义
 */
const emit = defineEmits<{
  /** 关闭事件 */
  close: [];
}>();

/**
 * 获取角色标签类型
 *
 * @param role - 角色名称
 */
function getRoleType(
  role: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  const roleTypeMap: Record<
    string,
    'danger' | 'info' | 'primary' | 'success' | 'warning'
  > = {
    user: 'success',
    assistant: 'primary',
  };

  return roleTypeMap[role] || 'info';
}

/**
 * 获取角色显示名称（支持国际化）
 *
 * @param role - 角色标识
 * @returns 国际化后的显示名称
 */
function getRoleLabel(role: string): string {
  const labelMap: Record<string, string> = {
    user: $t('page.message.userRole'),
    assistant: $t('page.message.assistantRole'),
  };

  return labelMap[role] || role.toUpperCase();
}

/**
 * 格式化完整日期时间
 *
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
 * 获取消息内容区域的背景样式类名
 * 根据角色返回不同的视觉样式
 *
 * @param role - 消息角色
 * @returns Tailwind CSS 类名字符串
 */
function getContentBackgroundClass(role: string): string {
  return role === 'user'
    ? 'bg-green-50 border-green-300'
    : 'bg-blue-50 border-blue-300';
}

/**
 * 获取消息内容文本颜色类名
 *
 * @param role - 消息角色
 * @returns 文本颜色类名字符串
 */
function getContentTextClass(role: string): string {
  return role === 'user' ? 'text-green-900' : 'text-blue-900';
}

/**
 * 关闭 Drawer
 */
function handleClose() {
  emit('close');
}
</script>

<template>
  <div class="message-detail-drawer">
    <!-- 空数据状态 -->
    <div v-if="!data" class="flex flex-col items-center justify-center py-12">
      <span class="i-carbon-document text-gray-300 text-6xl"></span>
      <p class="mt-4 text-gray-500">{{ $t('page.message.noMessageData') }}</p>
      <ElButton type="primary" class="mt-4" @click="handleClose">
        {{ $t('page.message.close') }}
      </ElButton>
    </div>

    <!-- 详情内容 -->
    <div v-else class="p-6">
      <!-- 头部区域：角色标识和基本信息 -->
      <div
        class="mb-6 rounded-xl p-5 border-l-4"
        :class="
          data.role === 'user'
            ? 'bg-gradient-to-r from-green-50 to-white border-green-400'
            : 'bg-gradient-to-r from-blue-50 to-white border-blue-400'
        "
      >
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-bold text-gray-900 flex items-center gap-2">
            {{ getRoleLabel(data.role) }}
          </h2>
          <ElTag
            :type="getRoleType(data.role)"
            effect="dark"
            size="large"
            round
          >
            {{ data.role.toUpperCase() }}
          </ElTag>
        </div>

        <p class="text-xs text-gray-500 mt-2">
          {{ $t('page.message.messageId') }}: {{ data.id }}
        </p>
      </div>

      <!-- 基本信息描述列表 -->
      <ElDescriptions
        :title="$t('page.message.basicInfo')"
        :column="1"
        border
        class="mb-6"
        :label-style="{
          width: '100px',
          backgroundColor: '#f8fafc',
          fontWeight: 600,
        }"
      >
        <!-- 消息 ID -->
        <ElDescriptionsItem :label="$t('page.message.messageId')">
          <span class="font-mono text-sm">{{ data.id }}</span>
        </ElDescriptionsItem>

        <!-- 会话 ID -->
        <ElDescriptionsItem :label="$t('page.message.chatId')">
          <span class="font-mono text-sm">{{ data.chat_id }}</span>
        </ElDescriptionsItem>

        <!-- 角色 -->
        <ElDescriptionsItem :label="$t('page.message.role')">
          <ElTag :type="getRoleType(data.role)" effect="light" round>
            {{ getRoleLabel(data.role) }}
          </ElTag>
        </ElDescriptionsItem>

        <!-- 发送时间 -->
        <ElDescriptionsItem :label="$t('page.message.sendTime')">
          <span class="text-gray-700 font-medium">{{
            formatDate(data.created_at)
          }}</span>
        </ElDescriptionsItem>

        <!-- 内容长度 -->
        <ElDescriptionsItem :label="$t('page.message.contentLength')">
          <span class="font-semibold text-blue-600">
            {{ data.content?.length || 0 }}
          </span>
          <span class="text-gray-500 ml-1">{{
            $t('page.message.characters')
          }}</span>
        </ElDescriptionsItem>
      </ElDescriptions>

      <!-- 完整消息内容区域（OpenAI Log 风格） -->
      <div class="mb-6">
        <ElDivider content-position="left">
          <span class="font-semibold text-gray-700 flex items-center gap-2">
            <span class="i-carbon-document"></span>
            {{ $t('page.message.fullContent') }}
          </span>
        </ElDivider>

        <!-- 消息内容展示框 -->
        <div
          class="rounded-lg p-5 border-2 font-mono text-sm leading-relaxed whitespace-pre-wrap break-words max-h-[400px] overflow-y-auto"
          :class="[
            getContentBackgroundClass(data.role),
            getContentTextClass(data.role),
          ]"
        >
          {{ data.content }}
        </div>

        <!-- 内容统计信息 -->
        <div
          class="mt-3 flex items-center justify-between text-xs text-gray-500"
        >
          <span>
            {{ $t('page.message.contentLength') }}：{{
              data.content?.length || 0
            }}
          </span>
          <span>
            {{ $t('page.message.lines') }}：{{
              data.content?.split('\n').length || 0
            }}
          </span>
        </div>
      </div>

      <!-- 底部操作按钮 -->
      <div class="pt-4 border-t flex justify-end">
        <ElButton type="primary" @click="handleClose">
          {{ $t('page.message.close') }}
        </ElButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-detail-drawer {
  height: 100%;
  overflow-y: auto;
}

/* 自定义滚动条样式 - OpenAI 风格 */
.message-detail-drawer::-webkit-scrollbar {
  width: 8px;
}

.message-detail-drawer::-webkit-scrollbar-thumb {
  background-color: #cbd5e1;
  border-radius: 4px;
}

.message-detail-drawer::-webkit-scrollbar-track {
  background-color: #f1f5f9;
}

/* 消息内容区域的滚动条样式 */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: #94a3b8;
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background-color: #e2e8f0;
}
</style>
