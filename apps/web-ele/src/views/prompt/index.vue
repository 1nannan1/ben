<script lang="ts" setup>
import type { Prompt } from '#/api/core/prompt';

import { onMounted, ref } from 'vue';

import { Page, useVbenDrawer } from '@vben/common-ui';

import {
  ElButton,
  ElInput,
  ElMessage,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  createPrompt,
  deletePrompt,
  getPromptList,
  updatePrompt,
} from '#/api/core/prompt';

import PromptFormDrawer from './prompt-form-drawer.vue';
import PromptViewDialog from './prompt-view-dialog.vue';

/**
 * Prompt 列表数据
 */
const promptList = ref<Prompt[]>([]);

/**
 * 加载状态
 */
const loading = ref(false);

/**
 * 搜索关键词
 */
const searchKeyword = ref('');

/**
 * 选中的分类
 */
const selectedCategory = ref('');

/**
 * 当前查看的 Prompt 数据
 */
const viewData = ref<null | Prompt>(null);

/**
 * 是否显示查看弹窗
 */
const showViewDialog = ref(false);

/**
 * 当前编辑的 Prompt 数据
 */
const currentPrompt = ref<null | Prompt>(null);

/**
 * 是否为编辑模式
 */
const isEdit = ref(false);

/**
 * 使用 VbenDrawer 创建抽屉组件和 API
 * [Drawer, drawerApi] - Drawer 是抽屉组件，drawerApi 是控制抽屉的方法
 */
const [Drawer, drawerApi] = useVbenDrawer({
  closable: true,
  title: '编辑 Prompt',
});

/**
 * 分类选项列表
 */
const categoryOptions = [
  { label: '全部', value: '' },
  { label: '写作', value: '写作' },
  { label: '翻译', value: '翻译' },
  { label: '编程', value: '编程' },
  { label: '分析', value: '分析' },
  { label: '其他', value: '其他' },
];

/**
 * 获取 Prompt 列表数据
 */
async function fetchPromptList() {
  try {
    loading.value = true;
    const data = await getPromptList();
    promptList.value = data || [];
  } catch (error) {
    console.error('获取 Prompt 列表失败:', error);
    ElMessage.error('获取数据失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 处理搜索
 */
function handleSearch() {
  fetchPromptList();
}

/**
 * 重置搜索条件
 */
function handleReset() {
  searchKeyword.value = '';
  selectedCategory.value = '';
  fetchPromptList();
}

/**
 * 打开新增 Prompt 抽屉
 */
function handleAdd() {
  isEdit.value = false;
  currentPrompt.value = null;
  drawerApi.open();
}

/**
 * 查看 Prompt 详情
 * @param row 行数据
 */
function handleView(row: Prompt) {
  viewData.value = row;
  showViewDialog.value = true;
}

/**
 * 编辑 Prompt
 * @param row 行数据
 */
function handleEdit(row: Prompt) {
  isEdit.value = true;
  currentPrompt.value = row;
  drawerApi.open();
}

/**
 * 删除 Prompt
 * @param id Prompt ID
 */
async function handleDelete(id: string) {
  try {
    await deletePrompt(id);
    ElMessage.success('删除成功');
    await fetchPromptList();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败');
  }
}

/**
 * 处理表单提交（新增或编辑）
 * @param formData 表单数据
 */
async function handleSubmit(formData: {
  category: string;
  content: string;
  title: string;
}) {
  try {
    if (isEdit.value && currentPrompt.value) {
      // 更新现有 Prompt
      await updatePrompt(currentPrompt.value.id, formData);
      ElMessage.success('更新成功');
    } else {
      // 创建新 Prompt
      await createPrompt(formData);
      ElMessage.success('创建成功');
    }

    drawerApi.close();
    await fetchPromptList();
  } catch (error) {
    console.error(error);
    ElMessage.error(isEdit.value ? '更新失败' : '创建失败');
  }
}

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
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * 组件挂载时加载数据
 */
onMounted(() => {
  fetchPromptList();
});
</script>

<template>
  <Page title="Prompt 管理">
    <!-- 操作按钮区域 -->
    <div class="mb-4 flex items-center justify-between">
      <div class="text-sm text-gray-500">共 {{ promptList.length }} 条记录</div>
      <ElButton type="primary" @click="handleAdd">+ 新增 Prompt</ElButton>
    </div>

    <!-- 筛选区域 -->
    <div class="mb-4 flex items-center gap-4 rounded-lg bg-gray-50 p-4">
      <!-- 标题搜索 -->
      <ElInput
        v-model="searchKeyword"
        placeholder="搜索标题..."
        clearable
        style="width: 250px"
        @keyup.enter="handleSearch"
      >
        <template #prefix>
          <span class="i-carbon-search text-gray-400"></span>
        </template>
      </ElInput>

      <!-- 分类筛选 -->
      <ElSelect
        v-model="selectedCategory"
        placeholder="选择分类"
        clearable
        style="width: 150px"
        @change="handleSearch"
      >
        <ElOption
          v-for="option in categoryOptions"
          :key="option.value"
          :label="option.label"
          :value="option.value"
        />
      </ElSelect>

      <!-- 操作按钮 -->
      <ElButton type="primary" @click="handleSearch">搜索</ElButton>
      <ElButton @click="handleReset">重置</ElButton>
    </div>

    <!-- 数据表格 -->
    <ElTable
      v-loading="loading"
      :data="promptList"
      border
      stripe
      style="width: 100%"
      empty-text="暂无数据"
    >
      <!-- 标题列 -->
      <ElTableColumn prop="title" label="标题" min-width="200">
        <template #default="{ row }">
          <span class="font-medium">{{ row.title }}</span>
        </template>
      </ElTableColumn>

      <!-- 分类列 -->
      <ElTableColumn prop="category" label="分类" width="120" align="center">
        <template #default="{ row }">
          <ElTag :type="getCategoryType(row.category)" size="small">
            {{ row.category }}
          </ElTag>
        </template>
      </ElTableColumn>

      <!-- 内容预览列 -->
      <ElTableColumn
        prop="content"
        label="内容"
        min-width="250"
        show-overflow-tooltip
      >
        <template #default="{ row }">
          <span class="text-gray-600 line-clamp-2">{{ row.content }}</span>
        </template>
      </ElTableColumn>

      <!-- 创建时间列 -->
      <ElTableColumn
        prop="created_at"
        label="创建时间"
        width="180"
        align="center"
      >
        <template #default="{ row }">
          <span class="text-gray-500">{{ formatDate(row.created_at) }}</span>
        </template>
      </ElTableColumn>

      <!-- 操作列 -->
      <ElTableColumn label="操作" width="220" align="center" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-2">
            <ElButton link type="primary" size="small" @click="handleView(row)">
              查看
            </ElButton>
            <ElButton link type="warning" size="small" @click="handleEdit(row)">
              编辑
            </ElButton>
            <ElPopconfirm
              title="确定要删除该 Prompt 吗？删除后无法恢复。"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <ElButton link type="danger" size="small">删除</ElButton>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- 新增/编辑 Prompt 抽屉 -->
    <Drawer>
      <PromptFormDrawer
        :initial-data="currentPrompt"
        :is-edit="isEdit"
        @submit="handleSubmit"
        @cancel="drawerApi.close()"
      />
    </Drawer>

    <!-- 查看 Prompt 详情弹窗 -->
    <PromptViewDialog
      v-if="showViewDialog"
      :data="viewData"
      @close="showViewDialog = false"
    />
  </Page>
</template>
