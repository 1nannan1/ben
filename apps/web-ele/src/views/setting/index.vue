<script lang="ts" setup>
import type { Settings } from '#/api/core/settings';

import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElAlert,
  ElButton,
  ElCard,
  ElCol,
  ElDescriptions,
  ElDescriptionsItem,
  ElMessage,
  ElRow,
  ElSpace,
  ElTag,
} from 'element-plus';

import { useVbenForm } from '#/adapter/form';
import {
  getSettings,
  testModelConnection,
  updateSettings,
} from '#/api/core/settings';
import { $t } from '#/locales';

/** 当前激活的设置面板 */
const activeMenu = ref<string>('basic');

/** 页面加载状态 */
const loading = ref(false);

/** 保存操作状态 */
const saving = ref(false);

/** 模型测试连接状态 */
const testing = ref(false);

/** 当前设置记录 ID（用于更新操作） */
const settingsId = ref<string>('');

/** 设置原始数据（用于重置） */
const originalData = ref<Partial<Settings>>({});

/** 模型连接状态 */
const modelStatus = ref<'fail' | 'idle' | 'success' | 'testing'>('idle');

/** Logo 预览 URL（实时响应输入框变化） */
const logoPreviewUrl = ref<string>('');

/**
 * 可选 AI 模型列表
 */
const modelOptions = [
  { label: 'GPT-4o', value: 'gpt-4o' },
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo' },
  { label: 'DeepSeek Chat', value: 'deepseek-chat' },
  { label: 'DeepSeek Coder', value: 'deepseek-coder' },
];

/**
 * 环境信息（只读）
 */
const envInfo = computed(() => ({
  version: import.meta.env.VITE_APP_VERSION || '1.0.0',
  database: 'Supabase (PostgreSQL)',
  framework: 'Vue 3 + Vben Admin',
  backend: 'Supabase REST API',
  lastUpdate: originalData.value.updated_at || '-',
}));

/**
 * 左侧菜单项定义
 */
const menuItems = computed(() => [
  {
    key: 'basic',
    icon: 'carbon:application',
    label: $t('page.setting.basicSetting'),
  },
  {
    key: 'aimodel',
    icon: 'carbon:machine-learning-model',
    label: $t('page.setting.aiModelConfig'),
  },
  {
    key: 'system',
    icon: 'carbon:information',
    label: $t('page.setting.systemInfo'),
  },
]);

/**
 * 使用 useVbenForm 创建基础设置表单
 * 包含：网站名称、Logo、允许注册、默认模型、系统公告
 */
const [BasicForm, basicFormApi] = useVbenForm({
  /** 公共配置：所有表单项宽度撑满 */
  commonConfig: {
    componentProps: {
      class: 'w-full',
    },
  },
  /** 表单布局：水平排列 */
  layout: 'horizontal',
  /** 隐藏默认的提交/重置按钮（自定义底部按钮栏） */
  showDefaultActions: false,
  /** 表单提交处理 */
  handleSubmit: async (values) => {
    await handleSave(values);
  },
  /** 监听表单值变化，实时更新 Logo 预览 */
  handleValuesChange: (values) => {
    logoPreviewUrl.value = values.site_logo || '';
  },
  /** 表单字段 Schema 定义 */
  schema: [
    {
      component: 'Input',
      fieldName: 'site_name',
      label: $t('page.setting.siteName'),
      rules: 'required',
      componentProps: {
        placeholder: $t('page.setting.siteNamePlaceholder'),
        maxlength: 100,
        showWordLimit: true,
        clearable: true,
      },
    },
    {
      component: 'Input',
      fieldName: 'site_logo',
      label: $t('page.setting.siteLogo'),
      componentProps: {
        placeholder: $t('page.setting.siteLogoPlaceholder'),
        clearable: true,
      },
    },
    {
      component: 'Switch',
      defaultValue: true,
      fieldName: 'allow_register',
      label: $t('page.setting.allowRegister'),
    },
    {
      component: 'Select',
      fieldName: 'default_model',
      label: $t('page.setting.defaultModel'),
      rules: 'selectRequired',
      componentProps: {
        options: modelOptions,
        placeholder: $t('page.setting.modelPlaceholder'),
      },
    },
    {
      component: 'Input',
      fieldName: 'announcement',
      label: $t('page.setting.announcement'),
      componentProps: {
        type: 'textarea',
        rows: 5,
        placeholder: $t('page.setting.announcementPlaceholder'),
        maxlength: 1000,
        showWordLimit: true,
      },
    },
  ],
});

/**
 * 加载系统设置数据
 * 从 Supabase 获取并填充到表单
 */
async function loadSettings() {
  loading.value = true;
  try {
    const data = await getSettings();
    if (data && data.length > 0) {
      const settings = data[0] as Settings;
      settingsId.value = settings.id;

      // 缓存原始数据（用于重置和系统信息展示）
      originalData.value = { ...settings };

      // 将数据库值填入 Vben Form
      basicFormApi.setValues({
        site_name: settings.site_name ?? '',
        site_logo: settings.site_logo ?? '',
        allow_register: settings.allow_register ?? true,
        default_model: settings.default_model ?? 'gpt-4o',
        announcement: settings.announcement ?? '',
      });
    }
  } catch (error) {
    console.error($t('page.setting.loadFailed'), error);
    ElMessage.error($t('page.setting.loadFailed'));
  } finally {
    loading.value = false;
  }
}

/**
 * 保存所有设置
 *
 * @param values - 表单提交值
 */
async function handleSave(values: Record<string, any>) {
  // 如果没有设置 ID，提示需要先初始化
  if (!settingsId.value) {
    ElMessage.warning($t('page.setting.noSettingsId'));
    return;
  }

  saving.value = true;
  try {
    // 构建更新参数
    const params = {
      site_name: values.site_name,
      site_logo: values.site_logo,
      allow_register: values.allow_register,
      default_model: values.default_model,
      announcement: values.announcement,
    };

    // 调用 API 更新
    await updateSettings(settingsId.value, params);

    // 更新本地缓存
    originalData.value = {
      ...originalData.value,
      ...params,
      updated_at: new Date().toISOString(),
    };

    ElMessage.success($t('page.setting.saveSuccess'));
  } catch (error) {
    console.error($t('page.setting.saveFailed'), error);
    ElMessage.error($t('page.setting.saveFailed'));
  } finally {
    saving.value = false;
  }
}

/**
 * 重置表单为初始状态
 * 重新从数据库加载数据
 */
function handleReset() {
  loadSettings();
}

/**
 * 测试模型连接
 */
async function handleTestConnection() {
  testing.value = true;
  modelStatus.value = 'testing';
  try {
    const result = await testModelConnection();
    if (result.status === 'success') {
      modelStatus.value = 'success';
      ElMessage.success(result.message);
    } else {
      modelStatus.value = 'fail';
      ElMessage.error(result.message);
    }
  } catch {
    modelStatus.value = 'fail';
    ElMessage.error($t('page.setting.testConnectionFailed'));
  } finally {
    testing.value = false;
  }
}

/**
 * 切换左侧菜单面板
 *
 * @param key - 菜单项标识
 */
function handleMenuChange(key: string) {
  activeMenu.value = key;
}

// 组件挂载时加载设置数据
onMounted(() => {
  loadSettings();
});
</script>

<template>
  <Page :title="$t('page.setting.title')">
    <ElRow :gutter="24" v-loading="loading">
      <!-- 左侧：设置导航菜单 -->
      <ElCol :span="6">
        <ElCard shadow="never" class="menu-card">
          <!-- 设置标题 -->
          <div class="settings-header">
            <span class="i-carbon-settings text-xl"></span>
            <span class="text-lg font-semibold">{{
              $t('page.setting.title')
            }}</span>
          </div>

          <!-- 导航菜单列表 -->
          <div class="menu-list">
            <div
              v-for="item in menuItems"
              :key="item.key"
              class="menu-item"
              :class="{ active: activeMenu === item.key }"
              @click="handleMenuChange(item.key)"
            >
              <span :class="`i-${item.icon}`"></span>
              <span>{{ item.label }}</span>
            </div>
          </div>
        </ElCard>
      </ElCol>

      <!-- 右侧：设置内容区域 -->
      <ElCol :span="18">
        <!-- ====== 基础设置面板 ====== -->
        <ElCard v-show="activeMenu === 'basic'" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="i-carbon-application text-lg mr-2"></span>
              {{ $t('page.setting.basicSetting') }}
            </div>
          </template>

          <ElAlert
            :title="$t('page.setting.basicTip')"
            type="info"
            :closable="false"
            show-icon
            class="mb-6"
          />

          <!-- Vben Form 基础设置表单 -->
          <BasicForm />

          <!-- Logo 预览：有链接显示图片，无链接显示提示 -->
          <div class="mt-4 text-center">
            <!-- 有 Logo URL 时渲染图片 -->
            <ElImage
              v-if="logoPreviewUrl"
              :src="logoPreviewUrl"
              fit="contain"
              style="max-width: 200px; max-height: 80px"
              :preview-src-list="[logoPreviewUrl]"
            />
            <!-- 无 Logo URL 时提示添加 -->
            <p v-else class="text-sm text-gray-400">
              {{ $t('page.setting.logoEmptyTip') }}
            </p>
          </div>

          <!-- 底部操作按钮栏 -->
          <div class="action-bar mt-6 pt-5 border-t border-gray-200">
            <ElSpace>
              <ElButton
                type="primary"
                :loading="saving"
                @click="basicFormApi.submitForm()"
              >
                <span class="i-carbon-save mr-1"></span>
                {{ $t('page.setting.saveBtn') }}
              </ElButton>
              <ElButton @click="handleReset">
                <span class="i-carbon-reset mr-1"></span>
                {{ $t('page.setting.resetBtn') }}
              </ElButton>
            </ElSpace>
          </div>
        </ElCard>

        <!-- ====== AI 模型配置面板 ====== -->
        <ElCard v-show="activeMenu === 'aimodel'" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="i-carbon-machine-learning-model text-lg mr-2"></span>
              {{ $t('page.setting.aiModelConfig') }}
            </div>
          </template>

          <ElAlert
            :title="$t('page.setting.aiTip')"
            type="warning"
            :closable="false"
            show-icon
            class="mb-6"
          />

          <!-- 当前默认模型信息卡片 -->
          <div
            class="model-info-card rounded-xl p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 mb-6"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-gray-500 mb-1">
                  {{ $t('page.setting.currentModel') }}
                </p>
                <p class="text-2xl font-bold text-gray-900">
                  {{ originalData.default_model || '-' }}
                </p>
              </div>
              <!-- 模型状态标签 -->
              <div class="text-right">
                <p class="text-sm text-gray-500 mb-2">
                  {{ $t('page.setting.modelStatus') }}
                </p>
                <ElTag
                  :type="
                    modelStatus === 'success'
                      ? 'success'
                      : modelStatus === 'fail'
                        ? 'danger'
                        : modelStatus === 'testing'
                          ? 'warning'
                          : 'info'
                  "
                >
                  {{
                    modelStatus === 'success'
                      ? $t('page.setting.statusOnline')
                      : modelStatus === 'fail'
                        ? $t('page.setting.statusOffline')
                        : modelStatus === 'testing'
                          ? $t('page.setting.statusTesting')
                          : $t('page.setting.statusUnknown')
                  }}
                </ElTag>
              </div>
            </div>
          </div>

          <!-- 测试连接按钮 -->
          <div class="flex items-center gap-4">
            <ElButton
              type="primary"
              :loading="testing"
              @click="handleTestConnection"
            >
              <span class="i-carbon-link mr-1"></span>
              {{
                testing
                  ? $t('page.setting.testing')
                  : $t('page.setting.testConnection')
              }}
            </ElButton>
            <span class="text-sm text-gray-500">{{
              $t('page.setting.testDesc')
            }}</span>
          </div>
        </ElCard>

        <!-- ====== 系统信息面板（只读） ====== -->
        <ElCard v-show="activeMenu === 'system'" shadow="never">
          <template #header>
            <div class="card-header">
              <span class="i-carbon-information text-lg mr-2"></span>
              {{ $t('page.setting.systemInfo') }}
            </div>
          </template>

          <ElAlert
            :title="$t('page.setting.systemTip')"
            type="info"
            :closable="false"
            show-icon
            class="mb-6"
          />

          <ElDescriptions
            :column="1"
            border
            size="large"
            class="rounded-lg overflow-hidden"
          >
            <ElDescriptionsItem :label="$t('page.setting.projectVersion')">
              <ElTag>v{{ envInfo.version }}</ElTag>
            </ElDescriptionsItem>
            <ElDescriptionsItem :label="$t('page.setting.database')">
              <code class="bg-gray-100 px-2 py-1 rounded text-sm">{{
                envInfo.database
              }}</code>
            </ElDescriptionsItem>
            <ElDescriptionsItem :label="$t('page.setting.frontendFramework')">
              <code class="bg-gray-100 px-2 py-1 rounded text-sm">{{
                envInfo.framework
              }}</code>
            </ElDescriptionsItem>
            <ElDescriptionsItem :label="$t('page.setting.backendService')">
              <code class="bg-gray-100 px-2 py-1 rounded text-sm">{{
                envInfo.backend
              }}</code>
            </ElDescriptionsItem>
            <ElDescriptionsItem :label="$t('page.setting.lastUpdateTime')">
              <span>{{ envInfo.lastUpdate }}</span>
            </ElDescriptionsItem>
          </ElDescriptions>
        </ElCard>
      </ElCol>
    </ElRow>
  </Page>
</template>

<style scoped>
/* ====== 左侧菜单卡片 ====== */
.menu-card {
  position: sticky;
  top: 20px;
}

/* 设置标题区域 */
.settings-header {
  display: flex;
  gap: 8px;
  align-items: center;
  padding-bottom: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

/* 菜单列表容器 */
.menu-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 菜单项样式 */
.menu-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 12px 16px;
  font-size: 14px;
  color: #606266;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.25s ease;
}

/* 菜单项悬停效果 */
.menu-item:hover {
  color: #409eff;
  background-color: #f0f7ff;
}

/* 菜单项激活状态 */
.menu-item.active {
  font-weight: 600;
  color: #409eff;
  background-color: #ecf5ff;
  border-left: 3px solid #409eff;
}

/* 卡片头部样式 */
.card-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
</style>
