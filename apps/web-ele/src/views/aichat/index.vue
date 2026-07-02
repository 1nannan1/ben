<script lang="ts" setup>
import type { Chat } from '#/api/core/chat';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElOption,
  ElPagination,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  deleteChat,
  getChatDetail,
  getChatList,
  getChatStats,
} from '#/api/core/chat';

import ChatDetailDrawer from './chat-detail-drawer.vue';

/**
 * 分页配置
 */
const pageSize = ref(10);
const currentPage = ref(1);

/**
 * 搜索关键词 - 标题搜索
 */
const searchKeyword = ref('');

/**
 * 选中的模型筛选
 */
const selectedModel = ref('');

/**
 * 数据列表
 */
const chatList = ref<Chat[]>([]);

/**
 * 总记录数
 */
const total = ref(0);

/**
 * 今日新增会话数
 * 根据会话列表中 created_at 为今天的数据统计
 */
const todayNewCount = ref(0);

/**
 * 活跃模型数量
 * 从实际数据中去重统计，而非硬编码
 */
const activeModelCount = ref(0);

/**
 * 加载状态
 */
const loading = ref(false);

/**
 * 当前查看详情的会话数据
 */
const currentChat = ref<Chat | null>(null);

/**
 * 是否显示详情 Drawer
 */
const showDetailDrawer = ref(false);

/**
 * 详情数据加载状态
 */
const detailLoading = ref(false);

/**
 * Drawer 组件和 API
 */
const [DetailDrawer, detailDrawerApi] = useVbenDrawer({
  title: '会话详情',
});

/**
 * AI 模型选项列表
 * 用于筛选下拉框
 */
const modelOptions = [
  { label: '全部模型', value: '' },
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-3.5', value: 'gpt-3.5-turbo' },
  { label: 'Claude', value: 'claude' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: '其他', value: 'other' },
];

/**
 * 格式化日期时间 - 显示相对时间
 * @param dateStr - ISO 格式的日期字符串
 * @returns 格式化后的时间字符串
 */
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // 计算时间差
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  // 超过7天显示具体日期
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化完整日期时间
 * @param dateStr - ISO 格式的日期字符串
 * @returns 完整的日期时间字符串
 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';

  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 获取模型标签类型和样式
 * 不同模型使用不同颜色区分
 * @param model - 模型名称
 * @returns Element Plus Tag 类型
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

  return modelTypeMap[model] || 'primary';
}

/**
 * 获取模型显示名称
 * 将模型标识转换为友好的显示名称
 * @param model - 模型标识
 * @returns 显示名称
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
 * 获取模型图标/emoji
 * 为每个模型分配一个视觉标识
 * @param model - 模型名称
 * @returns 图标或 emoji 字符串
 */
function getModelIcon(model: string): string {
  const iconMap: Record<string, string> = {
    'gpt-4': '🧠',
    'gpt-3.5-turbo': '⚡',
    claude: '🎭',
    deepseek: '🔍',
  };

  return iconMap[model] || '🤖';
}

/**
 * 获取 Chat 列表数据
 * 支持分页、标题搜索、模型筛选
 */
async function fetchChatList() {
  loading.value = true;

  try {
    // 构建查询参数
    const params: {
      model?: string;
      page: number;
      pageSize: number;
      search?: string;
    } = {
      page: currentPage.value,
      pageSize: pageSize.value,
    };

    // 如果有搜索关键词
    if (searchKeyword.value.trim()) {
      params.search = searchKeyword.value.trim();
    }

    // 如果有模型筛选
    if (selectedModel.value) {
      params.model = selectedModel.value;
    }

    // 调用 API 获取列表
    const result = await getChatList(params);
    chatList.value = result.list;
    total.value = result.total;

    // 统计数据通过独立的 getChatStats API 获取（全量统计，不受分页影响）
    // 在 onMounted 和增删操作后调用 fetchChatStats 更新
  } catch (error) {
    console.error('获取 Chat 列表失败:', error);
    ElMessage.error('获取会话列表失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 处理搜索操作
 * 重置到第一页并刷新数据
 */
function handleSearch() {
  currentPage.value = 1;
  fetchChatList();
}

/**
 * 重置所有筛选条件
 * 清空搜索和筛选并刷新数据
 */
function handleReset() {
  searchKeyword.value = '';
  selectedModel.value = '';
  currentPage.value = 1;
  fetchChatList();
}

/**
 * 处理分页变化
 * @param page - 新的页码
 */
function handlePageChange(page: number) {
  currentPage.value = page;
  fetchChatList();
}

/**
 * 处理每页条数变化
 * @param size - 新的每页条数
 */
function handleSizeChange(size: number) {
  pageSize.value = size;
  currentPage.value = 1;
  fetchChatList();
}

/**
 * 打开会话详情 Drawer
 * 加载完整的会话信息（包含消息数量等）
 * @param row - 要查看的会话对象
 */
async function handleViewDetail(row: Chat) {
  try {
    showDetailDrawer.value = true;
    detailLoading.value = true;

    // 调用 API 获取详细信息（包含关联的消息）
    const detailData = await getChatDetail(row.id);
    currentChat.value = detailData;

    // 打开 Drawer
    detailDrawerApi.open();
  } catch (error) {
    console.error('获取会话详情失败:', error);
    ElMessage.error('获取会话详情失败');
    showDetailDrawer.value = false;
  } finally {
    detailLoading.value = false;
  }
}

/**
 * 关闭详情 Drawer
 */
function handleCloseDetail() {
  showDetailDrawer.value = false;
  currentChat.value = null;
  detailDrawerApi.close();
}

/**
 * 处理删除操作
 * 带确认提示的删除功能
 * @param id - 要删除的会话 ID
 */
async function handleDelete(id: string) {
  try {
    await deleteChat(id);
    ElMessage.success('会话已删除');

    // 如果当前页没有数据了，回到上一页
    if (chatList.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }

    await fetchChatList();
    // 同时刷新统计数据
    await fetchChatStats();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败，请重试');
  }
}

/**
 * 组件挂载时加载数据
 */
/**
 * 加载看板统计数据（全量统计，不受分页影响）
 * 并行查询：总会话数、今日新增、活跃模型数
 */
async function fetchChatStats() {
  try {
    const stats = await getChatStats();
    total.value = stats.total;
    todayNewCount.value = stats.todayNew;
    activeModelCount.value = stats.activeModels;
  } catch (error) {
    console.error('获取统计数据失败:', error);
  }
}

onMounted(() => {
  // 并行加载列表数据和统计数据
  fetchChatList();
  fetchChatStats();
});
</script>

<template>
  <Page title="💬 会话管理">
    <!-- 顶部统计卡片区域 -->
    <div class="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <!-- 总会话数 -->
      <div
        class="rounded-xl border bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">总会话数</p>
            <p class="mt-1 text-3xl font-bold text-gray-900">{{ total }}</p>
          </div>
          <!-- 会话图标（内联 SVG） -->
          <div class="rounded-full bg-blue-100 p-3">
            <svg
              class="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- 今日新增 -->
      <div
        class="rounded-xl border bg-gradient-to-br from-green-50 to-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">今日新增</p>
            <p class="mt-1 text-3xl font-bold text-green-600">
              {{ todayNewCount }}
            </p>
          </div>
          <!-- 趋势上升图标（内联 SVG） -->
          <div class="rounded-full bg-green-100 p-3">
            <svg
              class="h-6 w-6 text-green-600"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22 12h-4l-3 9L9 3l-3 9H2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>
      </div>

      <!-- 活跃模型 -->
      <div
        class="rounded-xl border bg-gradient-to-br from-purple-50 to-white p-6 shadow-sm"
      >
        <div class="flex items-center justify-between">
          <div>
            <p class="text-sm text-gray-500">活跃模型</p>
            <p class="mt-1 text-3xl font-bold text-purple-600">
              {{ activeModelCount }}
            </p>
          </div>
          <!-- 机器人图标（内联 SVG） -->
          <div class="rounded-full bg-purple-100 p-3">
            <svg
              class="h-6 w-6 text-purple-600"
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

    <!-- 搜索和筛选区域 -->
    <div class="mb-6 rounded-lg border bg-gray-50 p-4">
      <div class="flex flex-wrap items-center gap-3">
        <!-- 标题搜索框 -->
        <ElInput
          v-model="searchKeyword"
          placeholder="搜索会话标题..."
          clearable
          style="width: 280px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <span class="i-carbon-search text-gray-400"></span>
          </template>
        </ElInput>

        <!-- 模型筛选下拉框 -->
        <ElSelect
          v-model="selectedModel"
          placeholder="选择模型"
          clearable
          style="width: 160px"
          @change="handleSearch"
        >
          <ElOption
            v-for="option in modelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 操作按钮组 -->
        <ElButton type="primary" @click="handleSearch">
          <template #icon><span class="i-carbon-search"></span></template>
          搜索
        </ElButton>
        <ElButton @click="handleReset">重置</ElButton>
      </div>
    </div>

    <!-- 会话列表表格 -->
    <ElTable
      v-loading="loading"
      :data="chatList"
      border
      stripe
      style="width: 100%"
      empty-text="暂无会话记录"
      :header-cell-style="{
        background: '#f8fafc',
        color: '#64748b',
        fontWeight: 600,
      }"
    >
      <!-- 会话标题列 -->
      <ElTableColumn prop="title" label="会话标题" min-width="250">
        <template #default="{ row }">
          <div class="flex items-center gap-3">
            <!-- 模型图标 -->
            <span class="text-2xl">{{ getModelIcon(row.model) }}</span>
            <!-- 标题文本 -->
            <div class="flex-1">
              <p class="font-medium text-gray-900 line-clamp-1">
                {{ row.title }}
              </p>
              <p class="mt-0.5 text-xs text-gray-400">
                ID: {{ row.id.slice(0, 8) }}...
              </p>
            </div>
          </div>
        </template>
      </ElTableColumn>

      <!-- AI 模型列 -->
      <ElTableColumn prop="model" label="AI 模型" width="140" align="center">
        <template #default="{ row }">
          <ElTag
            :type="getModelType(row.model)"
            effect="dark"
            size="small"
            round
          >
            {{ getModelLabel(row.model) }}
          </ElTag>
        </template>
      </ElTableColumn>

      <!-- 创建时间列 -->
      <ElTableColumn
        prop="created_at"
        label="创建时间"
        width="160"
        align="center"
      >
        <template #default="{ row }">
          <div class="text-center">
            <p class="text-sm font-medium text-gray-700">
              {{ formatRelativeTime(row.created_at) }}
            </p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ formatDate(row.created_at) }}
            </p>
          </div>
        </template>
      </ElTableColumn>

      <!-- 用户 ID 列 -->
      <ElTableColumn prop="user_id" label="所属用户" width="180">
        <template #default="{ row }">
          <span class="font-mono text-sm text-gray-600">
            {{ row.user_id?.slice(0, 12) }}...
          </span>
        </template>
      </ElTableColumn>

      <!-- 操作列 -->
      <ElTableColumn label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-2">
            <!-- 查看详情按钮 -->
            <ElButton
              type="primary"
              link
              size="small"
              @click="handleViewDetail(row)"
            >
              <template #icon><span class="i-carbon-view"></span></template>
              详情
            </ElButton>

            <!-- 删除按钮（带确认） -->
            <ElPopconfirm
              title="确定要删除该会话吗？删除后无法恢复。"
              confirm-button-text="确定删除"
              cancel-button-text="取消"
              type="warning"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <ElButton type="danger" link size="small">
                  <template #icon>
                    <span class="i-carbon-trash-can"></span>
                  </template>
                  删除
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

    <!-- 会话详情 Drawer -->
    <DetailDrawer>
      <ChatDetailDrawer
        :data="currentChat"
        :loading="detailLoading"
        @close="handleCloseDetail"
      />
    </DetailDrawer>
  </Page>
</template>
