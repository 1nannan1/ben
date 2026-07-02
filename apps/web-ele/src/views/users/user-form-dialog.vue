<script lang="ts" setup>
import type { FormInstance, FormRules, UploadFile } from 'element-plus';

import type { User } from '#/api/core/user';

import { reactive, ref, watch } from 'vue';

import {
  ElAvatar,
  ElButton,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElMessage,
  ElOption,
  ElSelect,
  ElUpload,
} from 'element-plus';

import { uploadImage } from '#/lib/upload';

/**
 * 组件 Props 定义
 */
interface Props {
  /** 初始数据（编辑模式时传入） */
  initialData: null | User;
  /** 是否为编辑模式 */
  isEdit: boolean;
}

/** 组件属性 */
const props = defineProps<Props>();

/**
 * 组件事件定义
 * - submit: 表单提交事件
 * - cancel: 取消操作事件
 */
const emit = defineEmits<{
  cancel: [];
  submit: [
    formData: {
      avatar: string;
      email: string;
      nickname: string;
      password?: string; // 新增用户时必填
      role: string;
      status?: string; // 用户状态（编辑模式）
    },
  ];
}>();

/** 表单引用（用于验证和重置） */
const formRef = ref<FormInstance>();

/** 表单数据对象 */
const formData = reactive({
  avatar: '',
  email: '',
  nickname: '',
  password: '', // 新增字段：初始密码
  role: 'user',
  status: 'active' as string, // 用户状态：active(启用) / disabled(禁用)
});

/**
 * 表单验证规则
 * 包含必填校验和格式校验
 */
const formRules: FormRules = {
  avatar: [
    { max: 500, message: '头像 URL 不能超过 500 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    {
      type: 'email',
      message: '请输入正确的邮箱格式',
      trigger: ['blur', 'change'],
    },
  ],
  nickname: [
    { required: true, message: '请输入昵称', trigger: 'blur' },
    {
      min: 2,
      max: 50,
      message: '昵称长度在 2 到 50 个字符之间',
      trigger: 'blur',
    },
  ],
  // 密码验证规则（仅在新增模式下生效）
  password: [
    { required: true, message: '请输入初始密码', trigger: 'blur' },
    {
      min: 6,
      max: 20,
      message: '密码长度在 6 到 20 个字符之间',
      trigger: 'blur',
    },
    {
      pattern: /^(?=.*[a-zA-Z])(?=.*\d)/,
      message: '密码必须包含字母和数字',
      trigger: 'blur',
    },
  ],
  role: [{ required: true, message: '请选择角色', trigger: 'change' }],
};

// ==================== 头像上传相关 ====================

/** 上传加载状态 */
const uploadLoading = ref(false);

/** ElUpload 组件引用（用于清空内部文件列表） */
const uploadRef = ref<InstanceType<typeof ElUpload>>();

/**
 * 处理文件选择变化（选择文件后自动校验 + 上传）
 * ElUpload auto-upload=false 时通过 @change 触发
 *
 * @param uploadFile - ElUpload 传递的文件对象
 */
async function handleFileChange(uploadFile: UploadFile) {
  // 跳过删除操作（无 raw 文件）
  if (!uploadFile.raw) {
    return;
  }

  const file = uploadFile.raw;

  // 前端校验：文件类型
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
  ];
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('头像只能是 JPG/PNG/GIF/WebP/BMP 格式！');
    return;
  }

  // 前端校验：文件大小（10MB）
  if (file.size / 1024 / 1024 > 10) {
    ElMessage.error('头像大小不能超过 10MB！');
    return;
  }

  // 开始上传
  uploadLoading.value = true;

  try {
    // 调用图床上传 API，输出格式为 WebP（自动压缩）
    const result = await uploadImage(file, {
      outputFormat: 'webp',
    });

    // 更新表单数据 → 头像预览立即更新
    formData.avatar = result.url;
    ElMessage.success('头像上传成功');
  } catch (error) {
    console.error('头像上传失败:', error);
    ElMessage.error(
      error instanceof Error ? error.message : '头像上传失败，请重试',
    );
  } finally {
    uploadLoading.value = false;
    // 清空 ElUpload 内部文件列表，允许重新选择同一文件
    uploadRef.value?.clearFiles();
  }
}

/**
 * 角色选项列表
 * 用于下拉选择框
 */
const roleOptions = [
  { label: '普通用户', value: 'user' },
  { label: '管理员', value: 'admin' },
];

/**
 * 监听初始数据变化
 * 编辑模式：回显已有数据
 * 新增模式：重置表单
 */
watch(
  () => props.initialData,
  (newData) => {
    if (newData && props.isEdit) {
      // 编辑模式：填充表单数据（不包含密码）
      formData.avatar = newData.avatar || '';
      formData.email = newData.email || '';
      formData.nickname = newData.nickname || '';
      formData.role = newData.role || 'user';
      formData.status = newData.status || 'active';
      formData.password = ''; // 编辑时不显示密码
    } else {
      // 新增模式：重置表单
      resetForm();
    }
  },
  { immediate: true },
);

/**
 * 重置表单
 * 清空所有字段并清除验证状态
 */
function resetForm() {
  formData.avatar = '';
  formData.email = '';
  formData.nickname = '';
  formData.password = '';
  formData.role = 'user';
  formData.status = 'active';
  formRef.value?.resetFields();
}

/**
 * 提交表单
 * 先进行表单验证，验证通过后触发提交事件
 */
async function handleSubmit() {
  // 检查表单引用是否存在
  if (!formRef.value) return;

  try {
    // 执行表单验证
    await formRef.value.validate();

    // 构建提交数据对象
    const submitData: {
      avatar: string;
      email: string;
      nickname: string;
      password?: string;
      role: string;
      status?: string;
    } = {
      avatar: formData.avatar,
      email: formData.email,
      nickname: formData.nickname,
      role: formData.role,
    };

    // 新增模式下，需要提交密码
    if (!props.isEdit) {
      submitData.password = formData.password;
    }

    // 编辑模式下，提交状态
    if (props.isEdit) {
      submitData.status = formData.status;
    }

    // 验证通过，提交表单数据给父组件
    emit('submit', submitData);
  } catch (error) {
    // 验证失败，输出错误信息
    console.error('表单验证失败:', error);
  }
}

/**
 * 取消操作
 * 重置表单并触发取消事件
 */
function handleCancel() {
  resetForm();
  emit('cancel');
}
</script>

<template>
  <ElDialog
    :model-value="true"
    :title="isEdit ? '编辑用户' : '新增用户'"
    width="550px"
    :close-on-click-modal="false"
    @close="handleCancel"
  >
    <!-- 用户信息表单 -->
    <ElForm
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
      size="default"
      class="px-4"
    >
      <!-- 头像上传 -->
      <ElFormItem label="头像">
        <div class="flex items-start gap-4">
          <!-- 头像预览 -->
          <ElAvatar
            :size="64"
            :src="formData.avatar || undefined"
            :style="{ backgroundColor: '#409eff' }"
          >
            {{ formData.nickname?.charAt(0)?.toUpperCase() || 'U' }}
          </ElAvatar>

          <!-- 上传区域 -->
          <div class="flex-1">
            <ElUpload
              ref="uploadRef"
              :auto-upload="false"
              :limit="1"
              :show-file-list="false"
              accept="image/jpeg,image/png,image/gif,image/webp,image/bmp"
              class="avatar-uploader"
              drag
              @change="handleFileChange"
            >
              <div v-if="!uploadLoading" class="flex flex-col items-center">
                <span class="i-carbon-upload text-2xl text-gray-400"></span>
                <div class="text-xs text-gray-500 mt-1">点击或拖拽上传头像</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  支持 JPG/PNG/GIF/WebP/BMP，不超过 10MB
                </div>
              </div>
              <div v-else class="flex flex-col items-center py-4">
                <span
                  class="i-carbon-renew animate-spin text-2xl text-blue-500"
                ></span>
                <div class="text-xs text-gray-500 mt-2">上传中...</div>
              </div>
            </ElUpload>

            <!-- 已有头像时显示 URL 和删除按钮 -->
            <div v-if="formData.avatar" class="mt-2 flex items-center gap-2">
              <span class="flex-1 truncate text-xs text-green-600">
                已上传: {{ formData.avatar.split('/').pop() }}
              </span>
              <ElButton
                link
                type="danger"
                size="small"
                @click="formData.avatar = ''"
              >
                删除
              </ElButton>
            </div>
          </div>
        </div>
      </ElFormItem>

      <!-- 昵称字段 -->
      <ElFormItem label="昵称" prop="nickname">
        <ElInput
          v-model="formData.nickname"
          placeholder="请输入用户昵称"
          maxlength="50"
          show-word-limit
          clearable
        />
      </ElFormItem>

      <!-- 邮箱字段 -->
      <ElFormItem label="邮箱地址" prop="email">
        <ElInput
          v-model="formData.email"
          placeholder="请输入邮箱地址"
          maxlength="100"
          show-word-limit
          clearable
          :disabled="isEdit"
        />
        <div v-if="isEdit" class="text-xs text-gray-400 mt-1">
          邮箱地址不可修改
        </div>
      </ElFormItem>

      <!-- 初始密码字段（仅新增模式显示） -->
      <ElFormItem v-if="!isEdit" label="初始密码" prop="password">
        <ElInput
          v-model="formData.password"
          type="password"
          placeholder="请设置初始密码（6-20位，必须包含字母和数字）"
          show-password
          maxlength="20"
        />
        <div class="text-xs text-gray-400 mt-1">
          提示：新用户将使用此密码登录系统
        </div>
      </ElFormItem>

      <!-- 角色选择字段 -->
      <ElFormItem label="角色" prop="role">
        <ElSelect
          v-model="formData.role"
          placeholder="请选择用户角色"
          style="width: 100%"
        >
          <ElOption
            v-for="option in roleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
        <div class="text-xs text-gray-400 mt-1">管理员拥有系统全部权限</div>
      </ElFormItem>

      <!-- 用户状态开关（仅编辑模式显示） -->
      <ElFormItem v-if="isEdit" label="用户状态">
        <div class="flex items-center gap-3">
          <ElSwitch
            v-model="formData.status"
            active-value="active"
            inactive-value="disabled"
            active-text="启用"
            inactive-text="禁用"
            inline-prompt
          />
          <span
            class="text-sm"
            :class="
              formData.status === 'active' ? 'text-green-600' : 'text-red-500'
            "
          >
            {{ formData.status === 'active' ? '当前：已启用' : '当前：已禁用' }}
          </span>
        </div>
        <div class="text-xs text-gray-400 mt-1">禁用后该用户将无法登录系统</div>
      </ElFormItem>
    </ElForm>

    <!-- 操作按钮区域 -->
    <template #footer>
      <div class="flex justify-end gap-3">
        <!-- 取消按钮 -->
        <ElButton @click="handleCancel">取消</ElButton>
        <!-- 提交按钮：根据模式显示不同文案 -->
        <ElButton type="primary" @click="handleSubmit">
          {{ isEdit ? '更新' : '创建' }}
        </ElButton>
      </div>
    </template>
  </ElDialog>
</template>

<style scoped>
/* 头像上传区域样式 */
.avatar-uploader {
  width: 100%;
}

:deep(.avatar-uploader .el-upload) {
  width: 100%;
  cursor: pointer;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
  transition: border-color 0.2s;
}

:deep(.avatar-uploader .el-upload:hover) {
  border-color: var(--el-color-primary);
}

:deep(.avatar-uploader .el-upload-dragger) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: auto;
  padding: 16px;
}
</style>
