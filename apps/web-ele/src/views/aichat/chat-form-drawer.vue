<script lang="ts" setup>
import type { FormInstance, FormRules } from 'element-plus';

import type { Chat } from '#/api/core/chat';

import { reactive, ref, watch } from 'vue';

import {
  ElButton,
  ElForm,
  ElFormItem,
  ElInput,
  ElOption,
  ElSelect,
} from 'element-plus';

/**
 * 组件 Props 定义
 */
interface Props {
  /** 初始数据（编辑模式时传入） */
  initialData: Chat | null;
  /** 是否为编辑模式 */
  isEdit: boolean;
}

const props = defineProps<Props>();

/**
 * 组件 Emits 定义
 */
const emit = defineEmits<{
  /** 取消事件 */
  cancel: [];
  /** 表单提交事件 */
  submit: [formData: { model: string; title: string }];
}>();

/**
 * 表单引用
 */
const formRef = ref<FormInstance>();

/**
 * 表单数据
 */
const formData = reactive({
  model: '',
  title: '',
});

/**
 * 表单验证规则
 */
const formRules: FormRules = {
  model: [{ required: true, message: '请选择模型', trigger: 'change' }],
  title: [
    { required: true, message: '请输入标题', trigger: 'blur' },
    {
      min: 2,
      max: 200,
      message: '标题长度在 2 到 200 个字符',
      trigger: 'blur',
    },
  ],
};

/**
 * 模型选项列表
 */
const modelOptions = [
  { label: 'GPT-4', value: 'gpt-4' },
  { label: 'DeepSeek', value: 'deepseek' },
  { label: 'Claude', value: 'claude' },
];

/**
 * 提交状态
 */
const submitting = ref(false);

/**
 * 监听初始数据变化，用于编辑模式回显数据
 */
watch(
  () => props.initialData,
  (newData) => {
    if (newData && props.isEdit) {
      formData.model = newData.model || '';
      formData.title = newData.title || '';
    } else {
      resetForm();
    }
  },
  { immediate: true, deep: true },
);

/**
 * 重置表单
 */
function resetForm() {
  formData.model = '';
  formData.title = '';
  formRef.value?.resetFields();
}

/**
 * 提交表单
 */
async function handleSubmit() {
  if (!formRef.value) return;

  try {
    await formRef.value.validate();
    submitting.value = true;

    emit('submit', {
      model: formData.model,
      title: formData.title,
    });
  } catch (error) {
    console.error('表单验证失败:', error);
  } finally {
    submitting.value = false;
  }
}

/**
 * 取消操作
 */
function handleCancel() {
  resetForm();
  emit('cancel');
}
</script>

<template>
  <div class="chat-form-drawer">
    <!-- 表单 -->
    <ElForm
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-position="top"
      label-width="80px"
      size="default"
    >
      <!-- 标题字段 -->
      <ElFormItem label="聊天标题" prop="title">
        <ElInput
          v-model="formData.title"
          placeholder="请输入聊天标题"
          maxlength="200"
          show-word-limit
          clearable
        />
      </ElFormItem>

      <!-- 模型字段 -->
      <ElFormItem label="AI 模型" prop="model">
        <ElSelect
          v-model="formData.model"
          placeholder="请选择 AI 模型"
          style="width: 100%"
          clearable
        >
          <ElOption
            v-for="option in modelOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </ElFormItem>
    </ElForm>

    <!-- 操作按钮 -->
    <div class="flex items-center justify-end gap-3 border-t pt-4">
      <ElButton @click="handleCancel">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? '更新' : '创建' }}
      </ElButton>
    </div>
  </div>
</template>

<style scoped>
.chat-form-drawer {
  padding: 20px;
}
</style>
