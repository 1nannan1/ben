<script lang="ts" setup>
import type { Message } from '#/api/core/message';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  ElButton,
  ElMessage,
  ElOption,
  ElPagination,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import { deleteMessage, getMessageList } from '#/api/core/message';
import { $t } from '#/locales';

import MessageDetailDrawer from './message-detail-drawer.vue';

/**
 * 分页配置
 */
const pageSize = ref(20);
const currentPage = ref(1);

/**
 * 选中的角色筛选
 */
const selectedRole = ref('');

/**
 * 数据列表
 */
const messageList = ref<Message[]>([]);

/**
 * 总记录数
 */
const total = ref(0);

/**
 * 用户消息数量统计
 * 从消息列表中筛选 role='user' 的记录数
 */
const userMessageCount = ref(0);

/**
 * AI 回复数量统计
 * 从消息列表中筛选 role='assistant' 的记录数
 */
const aiReplyCount = ref(0);

/**
 * 加载状态
 */
const loading = ref(false);

/**
 * 当前查看详情的消息数据
 */
const currentMessage = ref<Message | null>(null);

/**
 * Drawer 组件和 API
 */
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  title: $t('page.message.detailTitle'),
});

/**
 * 角色选项列表
 * 用于筛选下拉框
 */
const roleOptions = [
  { label: $t('page.message.allRoles'), value: '' },
  { label: $t('page.message.userRole'), value: 'user' },
  { label: $t('page.message.assistantRole'), value: 'assistant' },
];

/**
 * 格式化完整日期时间
 * 显示精确到秒的时间戳
 *
 * @param dateStr - ISO 格式的日期字符串
 * @returns 完整的日期时间字符串（YYYY-MM-DD HH:mm:ss）
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
 * 格式化相对时间
 * 显示友好的时间差描述（支持国际化）
 *
 * @param dateStr - ISO 格式的日期字符串
 * @returns 相对时间字符串（如：5 分钟前）
 */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 计算时间差
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  // 使用国际化翻译
  if (seconds < 60) return $t('page.message.secondsAgo', [seconds]);
  if (minutes < 60) return $t('page.message.minutesAgo', [minutes]);
  if (hours < 24) return $t('page.message.hoursAgo', [hours]);
  if (days < 7) return $t('page.message.daysAgo', [days]);

  // 超过7天显示具体日期
  return formatDate(dateStr);
}

/**
 * 截断消息内容
 * 超过指定长度的文本自动省略显示
 *
 * @param content - 原始消息内容
 * @param maxLength - 最大显示长度，默认 80 字符
 * @returns 截断后的文本
 */
function truncateContent(content: string, maxLength = 80): string {
  if (!content) return '-';
  if (content.length <= maxLength) return content;
  return `${content.slice(0, maxLength)}...`;
}

/**
 * 获取角色标签类型和样式
 * 不同角色使用不同颜色区分
 *
 * @param role - 角色名称（user 或 assistant）
 * @returns Element Plus Tag 类型
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
 * 获取消息内容预览的 CSS 类名
 * 根据角色返回不同的背景色类
 *
 * @param role - 消息角色
 * @returns Tailwind CSS 类名字符串
 */
function getContentClass(role: string): string {
  return role === 'user'
    ? 'text-green-700 bg-green-50 border-green-200'
    : 'text-blue-700 bg-blue-50 border-blue-200';
}

/**
 * 获取消息列表数据
 * 支持分页、角色筛选
 */
async function fetchMessageList() {
  loading.value = true;

  try {
    // 构建查询参数
    const params: {
      page: number;
      pageSize: number;
      role?: string;
    } = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };

    // 如果有角色筛选
    if (selectedRole.value) {
      params.role = selectedRole.value;
    }

    // 调用 API 获取列表
    const result = await getMessageList(params);
    messageList.value = result.list;
    total.value = result.total;

    // 统计用户消息和 AI 回复数量
    // 根据当前页数据计算，如需全局统计可另接接口
    userMessageCount.value = result.list.filter(
      (msg) => msg.role === 'user',
    ).length;
    aiReplyCount.value = result.list.filter(
      (msg) => msg.role === 'assistant',
    ).length;
  } catch (error) {
    console.error($t('page.message.fetchFailed'), error);
    ElMessage.error($t('page.message.fetchFailed'));
  } finally {
    loading.value = false;
  }
}

/**
 * 处理角色筛选变化
 * 重置到第一页并刷新数据
 */
function handleRoleChange() {
  currentPage.value = 1;
  fetchMessageList();
}

/**
 * 重置所有筛选条件
 * 清空角色筛选并刷新数据
 */
function handleReset() {
  selectedRole.value = '';
  currentPage.value = 1;
  fetchMessageList();
}

/**
 * 处理分页变化
 *
 * @param page - 新的页码
 */
function handlePageChange(page: number) {
  currentPage.value = page;
  fetchMessageList();
}

/**
 * 处理每页条数变化
 *
 * @param size - 新的每页条数
 */
function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchMessageList();
}

/**
 * 打开消息详情 Drawer
 * 展示完整的消息内容
 *
 * @param row - 要查看的消息对象
 */
function handleViewDetail(row: Message) {
  currentMessage.value = row;
  detailDrawerApi.open();
}

/**
 * 关闭详情 Drawer
 */
function handleCloseDetail() {
  currentMessage.value = null;
  detailDrawerApi.close();
}

/**
 * 处理删除操作
 * 带确认提示的删除功能
 *
 * @param id - 要删除的消息 ID
 */
async function handleDelete(id: string) {
  try {
    await deleteMessage(id);
    ElMessage.success($t('page.message.deleteSuccess'));

    // 如果当前页没有数据了，回到上一页
    if (messageList.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }

    await fetchMessageList();
  } catch (error) {
    console.error($t('page.message.deleteFailed'), error);
    ElMessage.error($t('page.message.deleteFailed'));
  }
}

/**
 * 组件挂载时加载数据
 */
onMounted(() => {
  fetchMessageList();
});
</script>

<template>
  <Page :title="$t('page.message.title')">
    <!-- 统计信息区域 -->
    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <!-- 总消息数 -->
      <div
        class="rounded-xl border bg-gradient-to-br from-slate-50 to-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ $t('page.message.totalMessages') }}
            </p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ total }}</p>
          </div>
          <div class="rounded-full bg-slate-100 p-3">
            <!-- 文档图标（内联 SVG） -->
            <svg
              class="h-6 w-6 text-slate-600"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 2v6h6M16 13H8M16 17H8M10 9H8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- 用户消息 -->
      <div
        class="rounded-xl border bg-gradient-to-br from-green-50 to-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ $t('page.message.userMessages') }}
            </p>
            <p class="mt-1 text-3xl font-bold text-green-600">
              {{ userMessageCount }}
            </p>
          </div>
          <div class="rounded-full bg-green-100 p-3">
            <!-- 用户图标（内联 SVG） -->
            <svg
              class="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <circle
                cx="12"
                cy="7"
                r="4"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- AI 回复 -->
      <div
        class="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">
              {{ $t('page.message.aiReplies') }}
            </p>
            <p class="mt-1 text-3xl font-bold text-blue-600">
              {{ aiReplyCount }}
            </p>
          </div>
          <div class="rounded-full bg-blue-100 p-3">
            <!-- AI 图标（内联 SVG） -->
            <svg
              class="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M9.5 13A1.5 1.5 0 0 0 8 14.5 1.5 1.5 0 0 0 9.5 16 1.5 1.5 0 0 0 11 14.5 1.5 1.5 0 0 0 9.5 13m5 0a1.5 1.5 0 0 0-1.5 1.5 1.5 1.5 0 0 0 1.5 1.5 1.5 1.5 0 0 0 1.5-1.5 1.5 1.5 0 0 0-1.5-1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="mb-6 rounded-lg border bg-gray-50 p-4">
      <div class="flex flex-wrap items-center gap-3">
        <!-- 角色筛选下拉框 -->
        <ElSelect
          v-model="selectedRole"
          :placeholder="$t('page.message.roleFilter')"
          clearable
          style="width: 200px"
          @change="handleRoleChange"
        >
          <ElOption
            v-for="option in roleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 操作按钮组 -->
        <ElButton @click="handleReset">
          {{ $t('page.message.resetFilter') }}
        </ElButton>
      </div>
    </div>

    <!-- 消息列表表格（OpenAI Log Viewer 风格） -->
    <ElTable
      v-loading="loading"
      :data="messageList"
      border
      stripe
      style="width: 100%"
      :empty-text="$t('page.message.noData')"
      :header-cell-style="{
        background: '#f8fafc',
        color: '#475569',
        fontWeight: 600,
        fontSize: '13px',
      }"
      :row-style="{ cursor: 'pointer' }"
      @row-click="handleViewDetail"
    >
      <!-- 角色列 -->
      <ElTableColumn
        prop="role"
        :label="$t('page.message.role')"
        width="140"
        align="center"
      >
        <template #default="{ row }">
          <ElTag :type="getRoleType(row.role)" effect="dark" size="small" round>
            {{
              row.role === 'user'
                ? $t('page.message.userRole')
                : $t('page.message.assistantRole')
            }}
          </ElTag>
        </template>
      </ElTableColumn>

      <!-- 消息内容列（自动省略） -->
      <ElTableColumn
        prop="content"
        :label="$t('page.message.content')"
        min-width="400"
      >
        <template #default="{ row }">
          <div
            class="rounded-md px-3 py-2 font-mono text-xs leading-relaxed border"
            :class="getContentClass(row.role)"
          >
            {{ truncateContent(row.content) }}
          </div>
        </template>
      </ElTableColumn>

      <!-- 会话 ID 列 -->
      <ElTableColumn
        prop="chat_id"
        :label="$t('page.message.chatId')"
        width="200"
      >
        <template #default="{ row }">
          <span class="font-mono text-xs text-gray-600">
            {{ row.chat_id?.slice(0, 16) }}...
          </span>
        </template>
      </ElTableColumn>

      <!-- 发送时间列 -->
      <ElTableColumn
        prop="created_at"
        :label="$t('page.message.sendTime')"
        width="180"
        align="center"
      >
        <template #default="{ row }">
          <div class="text-center">
            <p class="text-xs font-medium text-gray-700">
              {{ formatRelativeTime(row.created_at) }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ formatDate(row.created_at) }}
            </p>
          </div>
        </template>
      </ElTableColumn>

      <!-- 操作列 -->
      <ElTableColumn
        :label="$t('page.message.operation')"
        width="160"
        align="center"
        fixed="right"
      >
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-2">
            <!-- 查看完整内容按钮 -->
            <ElButton
              type="primary"
              link
              size="small"
              @click.stop="handleViewDetail(row)"
            >
              <template #icon><span class="i-carbon-view"></span></template>
              {{ $t('page.message.view') }}
            </ElButton>

            <!-- 删除按钮（带确认） -->
            <ElPopconfirm
              :title="$t('page.message.confirmDelete')"
              :confirm-button-text="$t('page.message.confirmDeleteButton')"
              :cancel-button-text="$t('page.message.cancelButton')"
              type="warning"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <ElButton type="danger" link size="small" @click.stop>
                  <template #icon>
                    <span class="i-carbon-trash-can"></span>
                  </template>
                  {{ $t('page.message.delete') }}
                </ElButton>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- 分页器 -->
    <div class="mt-6 flex items-center justify-end">
      <ElPagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 消息详情 Drawer -->
    <DetailDrawer>
      <MessageDetailDrawer :data="currentMessage" @close="handleCloseDetail" />
    </DetailDrawer>
  </Page>
</template>
