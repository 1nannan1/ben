<script lang="ts" setup>
import type { FormInstance, FormRules } from "element-plus";

import type { Prompt } from "#/api/core/prompt";

import { reactive, ref, watch } from "vue";

import { ElButton, ElForm, ElFormItem, ElInput, ElOption, ElSelect } from "element-plus";

/**
 * 组件 Props 定义
 */
interface Props {
  /** 初始数据（编辑模式时传入） */
  initialData: null | Prompt;
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
  submit: [formData: { category: string; content: string; title: string }];
}>();

/**
 * 表单引用
 */
const formRef = ref<FormInstance>();

/**
 * 表单数据
 */
const formData = reactive({
  category: "",
  content: "",
  title: "",
});

/**
 * 表单验证规则
 */
const formRules: FormRules = {
  category: [{ required: true, message: "请选择分类", trigger: "change" }],
  content: [
    { required: true, message: "请输入内容", trigger: "blur" },
    {
      min: 10,
      max: 5000,
      message: "内容长度在 10 到 5000 个字符",
      trigger: "blur",
    },
  ],
  title: [
    { required: true, message: "请输入标题", trigger: "blur" },
    {
      min: 2,
      max: 100,
      message: "标题长度在 2 到 100 个字符",
      trigger: "blur",
    },
  ],
};

/**
 * 分类选项列表
 */
const categoryOptions = [
  { label: "写作", value: "写作" },
  { label: "翻译", value: "翻译" },
  { label: "编程", value: "编程" },
  { label: "分析", value: "分析" },
  { label: "其他", value: "其他" },
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
      formData.category = newData.category || "";
      formData.content = newData.content || "";
      formData.title = newData.title || "";
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
  formData.category = "";
  formData.content = "";
  formData.title = "";
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

    emit("submit", {
      category: formData.category,
      content: formData.content,
      title: formData.title,
    });
  } catch (error) {
    console.error("表单验证失败:", error);
  } finally {
    submitting.value = false;
  }
}

/**
 * 取消操作
 */
function handleCancel() {
  resetForm();
  emit("cancel");
}
</script>

<template>
  <div class="prompt-form-drawer">
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
      <ElFormItem label="标题" prop="title">
        <ElInput
          v-model="formData.title"
          placeholder="请输入 Prompt 标题"
          maxlength="100"
          show-word-limit
          clearable
        />
      </ElFormItem>

      <!-- 分类字段 -->
      <ElFormItem label="分类" prop="category">
        <ElSelect
          v-model="formData.category"
          placeholder="请选择分类"
          style="width: 100%"
          clearable
        >
          <ElOption
            v-for="option in categoryOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>
      </ElFormItem>

      <!-- 内容字段（使用大文本编辑器） -->
      <ElFormItem label="内容" prop="content">
        <!-- Prompt 内容编辑区域 -->
        <div class="content-editor-wrapper">
          <!-- 工具栏提示 -->
          <div class="editor-toolbar">
            <span class="text-xs text-gray-400">
              💡 提示：支持 Markdown 格式，建议使用清晰的指令结构
            </span>
          </div>

          <!-- 大文本输入框 -->
          <ElInput
            v-model="formData.content"
            type="textarea"
            placeholder="请输入 Prompt 内容...&#10;&#10;示例格式：&#10;## 角色&#10;你是一个专业的...&#10;&#10;## 任务&#10;请帮我完成...&#10;&#10;## 要求&#10;1. ...&#10;2. ..."
            :rows="15"
            :min-rows="10"
            :max-rows="25"
            maxlength="5000"
            show-word-limit
            resize="vertical"
            class="prompt-textarea"
          />
        </div>

        <!-- 字数统计提示 -->
        <div class="text-xs text-gray-400 mt-2 flex items-center justify-between">
          <span>支持 10 - 5000 个字符</span>
          <span v-if="formData.content.length > 0" class="text-blue-500">
            {{ formData.content.length }} / 5000
          </span>
        </div>
      </ElFormItem>
    </ElForm>

    <!-- 操作按钮 -->
    <div class="flex items-center justify-end gap-3 border-t pt-4">
      <ElButton @click="handleCancel">取消</ElButton>
      <ElButton type="primary" :loading="submitting" @click="handleSubmit">
        {{ isEdit ? "更新" : "创建" }}
      </ElButton>
    </div>
  </div>
</template>

<style scoped>
.prompt-form-drawer {
  padding: 20px;
}

.content-editor-wrapper {
  width: 100%;
}

.editor-toolbar {
  padding: 8px 12px;
  margin-bottom: 8px;
  background-color: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
}

.prompt-textarea :deep(.el-textarea__inner) {
  font-family: Monaco, Menlo, "Ubuntu Mono", monospace;
  font-size: 13px;
  line-height: 1.6;
}
</style>
