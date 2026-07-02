<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { Model } from '#/api/system/models';

import { computed, nextTick, onMounted, reactive, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElPopconfirm,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  createModel,
  deleteModel,
  getModelList,
  providerOptions,
  testModelConnection,
  toggleModelStatus,
  updateModel,
} from '#/api/system/models';
import { $t } from '#/locales';

/** 模型列表数据 */
const modelList = ref<Model[]>([]);

/** 页面加载状态 */
const loading = ref(false);

/** 模型名称搜索关键词 */
const nameKeyword = ref('');

/** Provider 筛选 */
const selectedProvider = ref('');

/** 状态筛选 */
const selectedStatus = ref<string>('');

/** 是否显示新增/编辑弹窗 */
const showFormDialog = ref(false);

/** 是否为编辑模式 */
const isEdit = ref(false);

/** 当前编辑的模型数据 */
const currentModel = ref<Model | null>(null);

/** 表单引用 */
const formRef = ref<FormInstance>();

/** 表单数据对象 */
const formData = reactive({
  api_key: '',
  base_url: '',
  enabled: true,
  name: '',
  provider: '',
});

/**
 * Provider 选项列表（用于搜索筛选）
 */
const filterProviderOptions = computed(() => [
  { label: $t('page.model.allProviders'), value: '' },
  ...providerOptions,
]);

/**
 * 状态选项列表（用于搜索筛选）
 */
const statusOptions = computed(() => [
  { label: $t('page.model.allStatus'), value: '' },
  { label: $t('page.model.enabled'), value: 'enabled' },
  { label: $t('page.model.disabled'), value: 'disabled' },
]);

/**
 * 表单验证规则
 * 包含必填校验和格式校验
 */
const formRules: FormRules = {
  name: [
    {
      required: true,
      message: () => $t('page.model.nameRequired'),
      trigger: 'blur',
    },
    {
      min: 1,
      max: 100,
      message: () => $t('page.model.nameLengthLimit'),
      trigger: 'blur',
    },
  ],
  provider: [
    {
      required: true,
      message: () => $t('page.model.providerRequired'),
      trigger: 'change',
    },
  ],
  api_key: [
    {
      required: true,
      message: () => $t('page.model.apiKeyRequired'),
      trigger: 'blur',
    },
    {
      min: 10,
      message: () => $t('page.model.apiKeyMinLength'),
      trigger: 'blur',
    },
  ],
  base_url: [
    {
      required: true,
      message: () => $t('page.model.baseUrlRequired'),
      trigger: 'blur',
    },
  ],
};

/**
 * 获取过滤后的模型列表
 * 根据搜索条件进行前端过滤
 */
const filteredModelList = computed(() => {
  let result = [...modelList.value];

  // 按模型名称过滤
  if (nameKeyword.value) {
    const keyword = nameKeyword.value.toLowerCase();
    result = result.filter((item) => item.name.toLowerCase().includes(keyword));
  }

  // 按 Provider 过滤
  if (selectedProvider.value) {
    result = result.filter((item) => item.provider === selectedProvider.value);
  }

  // 按状态过滤
  if (selectedStatus.value) {
    const isEnabled = selectedStatus.value === 'enabled';
    result = result.filter((item) => item.enabled === isEnabled);
  }

  return result;
});

/**
 * 加载模型列表数据
 * 从 Supabase 获取所有模型
 */
async function fetchModelList() {
  loading.value = true;
  try {
    const data = await getModelList();
    modelList.value = data as Model[];
  } catch (error) {
    console.error($t('page.model.fetchFailed'), error);
    ElMessage.error($t('page.model.fetchFailed'));
  } finally {
    loading.value = false;
  }
}

/**
 * 处理搜索操作
 * 触发计算属性重新计算过滤结果
 */
function handleSearch() {
  // 前端过滤，无需额外请求
}

/**
 * 重置搜索条件
 * 清空所有筛选项
 */
function handleReset() {
  nameKeyword.value = '';
  selectedProvider.value = '';
  selectedStatus.value = '';
}

/**
 * 刷新数据
 * 重新从服务器获取最新数据
 */
function handleRefresh() {
  fetchModelList();
}

/**
 * 打开新增模型弹窗
 * 先打开弹窗，等 DOM 渲染完成后重置表单数据
 */
async function handleAdd() {
  isEdit.value = false;
  currentModel.value = null;
  showFormDialog.value = true;

  // 等待弹窗渲染完成后再重置表单，确保 formRef 可用
  await nextTick();
  resetForm();
}

/**
 * 打开编辑模型弹窗
 * 加载当前模型数据到表单
 *
 * @param row - 要编辑的模型对象
 */
function handleEdit(row: Model) {
  isEdit.value = true;
  currentModel.value = { ...row };

  // 回显表单数据
  formData.name = row.name || '';
  formData.provider = row.provider || '';
  formData.api_key = row.api_key || '';
  formData.base_url = row.base_url || '';
  formData.enabled = row.enabled ?? true;

  showFormDialog.value = true;
}

/**
 * 处理删除模型
 *
 * @param id - 要删除的模型 ID
 */
async function handleDelete(id: string) {
  try {
    await deleteModel(id);
    ElMessage.success($t('page.model.deleteSuccess'));

    // 刷新列表
    await fetchModelList();
  } catch (error) {
    console.error($t('page.model.deleteFailed'), error);
    ElMessage.error($t('page.model.deleteFailed'));
  }
}

/**
 * 切换模型启用/禁用状态
 *
 * @param row - 模型对象
 * @param value - 目标状态
 */
async function handleToggleStatus(row: Model, value: boolean) {
  try {
    await toggleModelStatus(row.id, value);
    // 更新本地数据
    row.enabled = value;

    ElMessage.success(
      value ? $t('page.model.enableSuccess') : $t('page.model.disableSuccess'),
    );
  } catch (error) {
    console.error($t('page.model.toggleFailed'), error);
    ElMessage.error($t('page.model.toggleFailed'));

    // 回滚状态
    row.enabled = !value;
  }
}

/**
 * 测试模型连接
 *
 * @param id - 模型 ID
 */
async function handleTestConnection(id: string) {
  try {
    ElMessage.info($t('page.model.testing'));

    const result = await testModelConnection(id);

    if (result.status === 'success') {
      ElMessage.success(result.message);
    } else {
      ElMessage.error(result.message);
    }
  } catch (error: any) {
    console.error($t('page.model.testFailed'), error);
    ElMessage.error(error.message || $t('page.model.testFailed'));
  }
}

/**
 * 提交表单（创建或更新）
 * 先进行表单验证，验证通过后调用 API
 */
async function handleSubmit() {
  if (!formRef.value) return;

  try {
    // 执行表单验证
    await formRef.value.validate();

    if (isEdit.value && currentModel.value?.id) {
      // 编辑模式：调用更新 API
      await updateModel(currentModel.value.id, {
        api_key: formData.api_key,
        base_url: formData.base_url,
        enabled: formData.enabled,
        name: formData.name,
        provider: formData.provider,
      });
      ElMessage.success($t('page.model.updateSuccess'));
    } else {
      // 新增模式：调用创建 API
      await createModel({
        api_key: formData.api_key,
        base_url: formData.base_url,
        enabled: formData.enabled,
        name: formData.name,
        provider: formData.provider,
      });
      ElMessage.success($t('page.model.createSuccess'));
    }

    // 关闭弹窗并刷新列表
    showFormDialog.value = false;
    await fetchModelList();
  } catch (error: any) {
    console.error($t('page.model.submitFailed'), error);

    let errorMessage = $t('page.model.submitFailed');
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    ElMessage.error(
      isEdit.value
        ? `${$t('page.model.updateFailed')}: ${errorMessage}`
        : `${$t('page.model.createFailed')}: ${errorMessage}`,
    );
  }
}

/**
 * 关闭弹窗
 * 重置表单
 */
function handleCloseDialog() {
  showFormDialog.value = false;
  resetForm();
}

/**
 * 重置表单
 * 清空所有字段并清除验证状态
 */
function resetForm() {
  formData.name = '';
  formData.provider = '';
  formData.api_key = '';
  formData.base_url = '';
  formData.enabled = true;
  formRef.value?.resetFields();
}

/**
 * 格式化 API Key 显示
 * 只显示前缀和后缀，中间用星号代替
 *
 * @param key - API Key 字符串
 * @returns 格式化后的字符串
 */
function maskApiKey(key: null | string): string {
  if (!key) return '-';

  // 如果是测试 key 或短 key，直接返回掩码
  if (key.length <= 10) return 'sk-****';

  // 显示前3位和后4位，中间用星号替代
  const prefix = key.slice(0, 7); // sk-xxx
  const suffix = key.slice(Math.max(0, key.length - 4));
  const maskedLength = Math.min(key.length - 11, 20);
  const masked = '*'.repeat(maskedLength);

  return `${prefix}${masked}${suffix}`;
}

/**
 * 格式化日期时间
 * 将 ISO 格式转换为易读格式
 *
 * @param dateString - ISO 日期字符串
 * @returns 格式化后的日期时间字符串
 */
function formatDateTime(dateString: null | string): string {
  if (!dateString) return '-';

  const date = new Date(dateString);

  // 检查日期是否有效
  if (Number.isNaN(date.getTime())) return '-';

  // 格式化为：YYYY-MM-DD HH:mm:ss
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 获取 Provider 对应的 Tag 类型
 * 不同 Provider 显示不同颜色
 *
 * @param provider - Provider 标识
 * @returns Element Plus Tag 类型
 */
function getProviderType(
  provider: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  const typeMap: Record<
    string,
    'danger' | 'info' | 'primary' | 'success' | 'warning'
  > = {
    openai: 'primary',
    deepseek: 'success',
    anthropic: 'warning',
    google: 'danger',
    custom: 'info',
  };
  return typeMap[provider] || 'info';
}

/**
 * 获取 Provider 显示标签
 *
 * @param provider - Provider 标识
 * @returns 显示文本
 */
function getProviderLabel(provider: string): string {
  const labelMap: Record<string, string> = {
    openai: 'OpenAI',
    deepseek: 'DeepSeek',
    anthropic: 'Anthropic',
    google: 'Google',
    custom: 'Custom',
  };
  return labelMap[provider] || provider;
}

// 组件挂载时加载数据
onMounted(() => {
  fetchModelList();
});
</script>

<template>
  <Page :title="$t('page.model.title')">
    <!-- ====== 顶部操作栏 ====== -->
    <div class="mb-4 flex items-center justify-between">
      <!-- 左侧：统计信息 -->
      <div class="text-sm text-gray-600">
        {{ $t('page.model.totalModels') }}
        <span class="font-semibold text-blue-600">{{
          filteredModelList.length
        }}</span>
      </div>

      <!-- 右侧：操作按钮组 -->
      <div class="flex items-center gap-2">
        <!-- 刷新按钮 -->
        <ElButton :loading="loading" @click="handleRefresh">
          <span class="i-carbon-refresh mr-1"></span>
          {{ $t('page.model.refresh') }}
        </ElButton>

        <!-- 新增模型按钮 -->
        <ElButton type="primary" @click="handleAdd">
          <span class="i-carbon-add mr-1"></span>
          {{ $t('page.model.addModel') }}
        </ElButton>
      </div>
    </div>

    <!-- ====== 搜索/筛选区域 ====== -->
    <div class="mb-4 rounded-lg border bg-gray-50 p-4">
      <div class="flex flex-wrap items-center gap-3">
        <!-- 模型名称搜索 -->
        <ElInput
          v-model="nameKeyword"
          :placeholder="$t('page.model.namePlaceholder')"
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <span class="i-carbon-search text-gray-400"></span>
          </template>
        </ElInput>

        <!-- Provider 筛选 -->
        <ElSelect
          v-model="selectedProvider"
          :placeholder="$t('page.model.providerFilter')"
          clearable
          style="width: 160px"
          @change="handleSearch"
        >
          <ElOption
            v-for="option in filterProviderOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 状态筛选 -->
        <ElSelect
          v-model="selectedStatus"
          :placeholder="$t('page.model.statusFilter')"
          clearable
          style="width: 140px"
          @change="handleSearch"
        >
          <ElOption
            v-for="option in statusOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 操作按钮 -->
        <ElButton type="primary" @click="handleSearch">
          <span class="i-carbon-search mr-1"></span>
          {{ $t('page.model.search') }}
        </ElButton>
        <ElButton @click="handleReset">
          <span class="i-carbon-reset mr-1"></span>
          {{ $t('page.model.reset') }}
        </ElButton>
      </div>
    </div>

    <!-- ====== 模型列表表格 ====== -->
    <ElTable
      v-loading="loading"
      :data="filteredModelList"
      border
      stripe
      style="width: 100%"
    >
      <!-- 模型名称列 -->
      <ElTableColumn
        prop="name"
        :label="$t('page.model.tableName')"
        min-width="150"
      >
        <template #default="{ row }">
          <span class="font-medium text-gray-900">{{ row.name }}</span>
        </template>
      </ElTableColumn>

      <!-- Provider 列 -->
      <ElTableColumn
        prop="provider"
        :label="$t('page.model.tableProvider')"
        width="130"
        align="center"
      >
        <template #default="{ row }">
          <ElTag
            :type="getProviderType(row.provider)"
            effect="dark"
            size="small"
          >
            {{ getProviderLabel(row.provider) }}
          </ElTag>
        </template>
      </ElTableColumn>

      <!-- Base URL 列 -->
      <ElTableColumn
        prop="base_url"
        :label="$t('page.model.tableBaseUrl')"
        min-width="200"
      >
        <template #default="{ row }">
          <code class="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">{{
            row.base_url || '-'
          }}</code>
        </template>
      </ElTableColumn>

      <!-- API Key 列（脱敏显示） -->
      <ElTableColumn
        prop="api_key"
        :label="$t('page.model.tableApiKey')"
        width="220"
      >
        <template #default="{ row }">
          <span class="font-mono text-xs text-gray-500">{{
            maskApiKey(row.api_key)
          }}</span>
        </template>
      </ElTableColumn>

      <!-- Status 列（Switch 开关） -->
      <ElTableColumn
        :label="$t('page.model.tableStatus')"
        width="100"
        align="center"
      >
        <template #default="{ row }">
          <ElSwitch
            :model-value="row.enabled"
            @change="(val: string | number | boolean) => handleToggleStatus(row, Boolean(val))"
          />
        </template>
      </ElTableColumn>

      <!-- Created At 列 -->
      <ElTableColumn
        :label="$t('page.model.tableCreatedAt')"
        width="180"
        align="center"
      >
        <template #default="{ row }">
          <span class="text-gray-500">{{
            formatDateTime(row.created_at)
          }}</span>
        </template>
      </ElTableColumn>

      <!-- Actions 操作列 -->
      <ElTableColumn
        :label="$t('page.model.tableActions')"
        width="240"
        align="center"
        fixed="right"
      >
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-2">
            <!-- 编辑按钮 -->
            <ElButton link type="primary" size="small" @click="handleEdit(row)">
              {{ $t('page.model.edit') }}
            </ElButton>

            <!-- 测试连接按钮 -->
            <ElButton
              link
              type="warning"
              size="small"
              @click="handleTestConnection(row.id)"
            >
              {{ $t('page.model.testConnection') }}
            </ElButton>

            <!-- 删除按钮（带确认框） -->
            <ElPopconfirm
              :title="$t('page.model.deleteConfirm')"
              :confirm-button-text="$t('page.model.confirmBtn')"
              :cancel-button-text="$t('page.model.cancelBtn')"
              @confirm="handleDelete(row.id)"
            >
              <template #reference>
                <ElButton link type="danger" size="small">
                  {{ $t('page.model.delete') }}
                </ElButton>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- ====== 新增/编辑模型弹窗 ====== -->
    <ElDialog
      :model-value="showFormDialog"
      :title="
        isEdit
          ? $t('page.model.editDialogTitle')
          : $t('page.model.addDialogTitle')
      "
      width="550px"
      :close-on-click-modal="false"
      @close="handleCloseDialog"
    >
      <!-- 模型信息表单 -->
      <ElForm
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-position="top"
        size="default"
        class="px-4"
      >
        <!-- 模型名称字段 -->
        <ElFormItem :label="$t('page.model.formName')" prop="name">
          <ElInput
            v-model="formData.name"
            :placeholder="$t('page.model.formNamePlaceholder')"
            maxlength="100"
            show-word-limit
            clearable
          />
        </ElFormItem>

        <!-- Provider 选择字段 -->
        <ElFormItem :label="$t('page.model.formProvider')" prop="provider">
          <ElSelect
            v-model="formData.provider"
            :placeholder="$t('page.model.formProviderPlaceholder')"
            style="width: 100%"
          >
            <ElOption
              v-for="option in providerOptions"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </ElSelect>
        </ElFormItem>

        <!-- API Key 字段 -->
        <ElFormItem :label="$t('page.model.formApiKey')" prop="api_key">
          <ElInput
            v-model="formData.api_key"
            type="password"
            :placeholder="$t('page.model.formApiKeyPlaceholder')"
            show-password
            maxlength="500"
          />
          <div class="mt-1 text-xs text-gray-400">
            {{ $t('page.model.formApiKeyTip') }}
          </div>
        </ElFormItem>

        <!-- Base URL 字段 -->
        <ElFormItem :label="$t('page.model.formBaseUrl')" prop="base_url">
          <ElInput
            v-model="formData.base_url"
            :placeholder="$t('page.model.formBaseUrlPlaceholder')"
            maxlength="500"
            clearable
          />
          <div class="mt-1 text-xs text-gray-400">
            {{ $t('page.model.formBaseUrlTip') }}
          </div>
        </ElFormItem>

        <!-- Enabled 开关字段 -->
        <ElFormItem :label="$t('page.model.formEnabled')" prop="enabled">
          <ElSwitch
            v-model="formData.enabled"
            :active-text="$t('page.model.yes')"
            :inactive-text="$t('page.model.no')"
          />
        </ElFormItem>
      </ElForm>

      <!-- 操作按钮区域 -->
      <template #footer>
        <div class="flex justify-end gap-3">
          <!-- 取消按钮 -->
          <ElButton @click="handleCloseDialog">
            {{ $t('page.model.cancelBtn') }}
          </ElButton>
          <!-- 提交按钮：根据模式显示不同文案 -->
          <ElButton type="primary" @click="handleSubmit">
            {{
              isEdit ? $t('page.model.updateBtn') : $t('page.model.createBtn')
            }}
          </ElButton>
        </div>
      </template>
    </ElDialog>
  </Page>
</template>
