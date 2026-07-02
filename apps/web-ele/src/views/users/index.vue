<script lang="ts" setup>
import type { User } from '#/api/core/user';

import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  ElAvatar,
  ElButton,
  ElInput,
  ElMessage,
  ElMessageBox,
  ElOption,
  ElPagination,
  ElPopconfirm,
  ElSelect,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
} from 'element-plus';

import {
  AdminCreateUser,
  batchDeleteUsers,
  deleteUser,
  getUserList,
  toggleUserStatus,
  updateUser,
} from '#/api/core/user';

import UserFormDialog from './user-form-dialog.vue';

/**
 * 用户列表数据
 */
const userList = ref<User[]>([]);

/**
 * 数据总条数
 */
const total = ref(0);

/**
 * 当前页码
 */
const currentPage = ref(1);

/**
 * 每页显示条数
 */
const pageSize = ref(10);

/**
 * 邮箱搜索关键词
 */
const emailKeyword = ref('');

/**
 * 昵称搜索关键词
 */
const nicknameKeyword = ref('');

/**
 * 选中的角色筛选
 */
const selectedRole = ref('');

/**
 * 加载状态
 */
const loading = ref(false);

/**
 * 表格多选选中的用户 ID 列表
 */
const selectedUserIds = ref<string[]>([]);

/**
 * 是否显示编辑弹窗
 */
const showEditDialog = ref(false);

/**
 * 当前编辑的用户数据
 */
const currentUser = ref<null | User>(null);

/**
 * 是否为编辑模式
 */
const isEdit = ref(false);

/**
 * 角色选项列表
 */
const roleOptions = [
  { label: '全部角色', value: '' },
  { label: '管理员', value: 'admin' },
  { label: '普通用户', value: 'user' },
];

/**
 * 获取用户列表数据
 * 支持分页、搜索、角色筛选
 */
async function fetchUserList() {
  loading.value = true;

  try {
    // 构建搜索关键词（邮箱或昵称）
    let search = '';
    if (emailKeyword.value || nicknameKeyword.value) {
      const parts = [];
      if (emailKeyword.value) parts.push(`email.ilike.%${emailKeyword.value}%`);
      if (nicknameKeyword.value)
        parts.push(`nickname.ilike.%${nicknameKeyword.value}%`);
      search = parts.join(',');
    }

    // 调用 API 获取用户列表
    const result = await getUserList({
      page: currentPage.value,
      pageSize: pageSize.value,
      search: search || undefined,
      role: selectedRole.value || undefined,
    });

    // 更新列表数据和总数
    userList.value = result.list;
    total.value = result.total;
  } catch (error) {
    console.error('获取用户列表失败:', error);
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
}

/**
 * 处理搜索操作
 * 重置到第一页并重新查询
 */
function handleSearch() {
  currentPage.value = 1;
  fetchUserList();
}

/**
 * 重置搜索条件
 * 清空所有筛选项并重新查询
 */
function handleReset() {
  emailKeyword.value = '';
  nicknameKeyword.value = '';
  selectedRole.value = '';
  currentPage.value = 1;
  fetchUserList();
}

/**
 * 打开新增用户弹窗
 */
function handleAdd() {
  isEdit.value = false;
  currentUser.value = null;
  showEditDialog.value = true;
}

/**
 * 打开编辑用户弹窗
 * @param row 要编辑的用户对象
 */
function handleEdit(row: User) {
  isEdit.value = true;
  currentUser.value = { ...row };
  showEditDialog.value = true;
}

/**
 * 处理单个用户删除
 * @param user_id 要删除的用户 ID
 */
async function handleDelete(user_id: string) {
  try {
    await deleteUser(user_id);
    ElMessage.success('删除成功');

    // 如果当前页没有数据了，回到上一页
    if (userList.value.length === 1 && currentPage.value > 1) {
      currentPage.value -= 1;
    }

    await fetchUserList();
  } catch (error) {
    console.error('删除失败:', error);
    ElMessage.error('删除失败，请重试');
  }
}

/**
 * 处理切换用户启用/禁用状态
 * @param user 要操作的用户对象
 */
async function handleToggleStatus(user: User) {
  const originalStatus = user.status;

  try {
    // 乐观更新 UI：立即切换状态显示
    user.status = originalStatus === 'active' ? 'disabled' : 'active';

    // 调用 API 更新数据库
    await toggleUserStatus(user.user_id);

    ElMessage.success(
      originalStatus === 'active' ? '用户已禁用' : '用户已启用',
    );
  } catch (error) {
    // 失败时回滚状态
    user.status = originalStatus;
    console.error('切换状态失败:', error);
    ElMessage.error('操作失败，请重试');
  }
}

/**
 * 处理批量删除
 * 删除所有选中的用户
 */
async function handleBatchDelete() {
  if (selectedUserIds.value.length === 0) {
    ElMessage.warning('请先选择要删除的用户');
    return;
  }

  try {
    // 弹出确认框
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedUserIds.value.length} 个用户吗？此操作不可恢复。`,
      '批量删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    );

    // 调用批量删除 API
    await batchDeleteUsers(selectedUserIds.value);
    ElMessage.success(`成功删除 ${selectedUserIds.value.length} 个用户`);

    // 清空选中状态
    selectedUserIds.value = [];

    // 如果当前页没有数据了，回到上一页
    if (
      userList.value.length === selectedUserIds.value.length &&
      currentPage.value > 1
    ) {
      currentPage.value -= 1;
    }

    await fetchUserList();
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error);
      ElMessage.error('批量删除失败，请重试');
    }
  }
}

/**
 * 处理表格选择变化
 * 当用户勾选/取消勾选时更新选中列表
 * @param selection 当前选中的行数据数组
 */
function handleSelectionChange(selection: User[]) {
  selectedUserIds.value = selection.map((item) => item.user_id);
}

/**
 * 处理表单提交（创建或更新）
 * @param formData 表单提交的数据
 */
async function handleSubmit(formData: {
  avatar: string;
  email: string;
  nickname: string;
  password?: string;
  role: string;
}) {
  try {
    if (isEdit.value && currentUser.value) {
      // 编辑模式：调用更新 API
      if (!currentUser.value.user_id) {
        throw new Error('用户 ID 无效，无法执行更新操作');
      }

      await updateUser(currentUser.value.user_id, formData);
      ElMessage.success('更新成功');
    } else {
      // 新增模式：调用创建 API
      await AdminCreateUser({
        avatar: formData.avatar,
        email: formData.email,
        nickname: formData.nickname,
        password: formData.password || '',
        role: formData.role,
      });
      ElMessage.success('创建成功');
    }

    // 关闭弹窗并刷新列表
    showEditDialog.value = false;
    await fetchUserList();
  } catch (error) {
    console.error('操作失败:', error);

    let errorMessage = '操作失败';
    if (error instanceof Error) {
      errorMessage = error.message;

      if (errorMessage.includes('duplicate key')) {
        errorMessage = '该邮箱已被注册，请使用其他邮箱';
      } else if (errorMessage.includes('already registered')) {
        errorMessage = '该邮箱已被注册';
      } else if (errorMessage.includes('password')) {
        errorMessage = '密码不符合要求';
      }
    }

    ElMessage.error(
      isEdit.value ? `更新失败：${errorMessage}` : `创建失败：${errorMessage}`,
    );
  }
}

/**
 * 关闭编辑弹窗
 */
function handleCloseDialog() {
  showEditDialog.value = false;
  currentUser.value = null;
}

/**
 * 处理每页条数变化
 * @param val 新的每页条数
 */
function handleSizeChange(val: number) {
  pageSize.value = val;
  currentPage.value = 1;
  fetchUserList();
}

/**
 * 处理页码变化
 * @param val 新的页码
 */
function handlePageChange(val: number) {
  currentPage.value = val;
  fetchUserList();
}

/**
 * 获取角色对应的 Tag 类型
 * 不同角色显示不同颜色
 * @param role 角色标识
 */
function getRoleType(
  role: string,
): 'danger' | 'info' | 'primary' | 'success' | 'warning' {
  const roleMap: Record<
    string,
    'danger' | 'info' | 'primary' | 'success' | 'warning'
  > = {
    admin: 'danger',
    user: 'primary',
  };
  return roleMap[role] || 'info';
}

/**
 * 获取角色显示文本
 * @param role 角色标识
 */
function getRoleLabel(role: string): string {
  const labelMap: Record<string, string> = {
    admin: '管理员',
    user: '普通用户',
  };
  return labelMap[role] || role;
}

/**
 * 格式化日期时间
 * 将 ISO 格式转换为易读格式
 * @param dateString ISO 日期字符串
 */
function formatDateTime(dateString: string): string {
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
 * 组件挂载时加载数据
 */
onMounted(() => {
  fetchUserList();
});
</script>

<template>
  <Page title="用户管理">
    <!-- 顶部操作栏 -->
    <div class="mb-4 flex items-center justify-between">
      <!-- 左侧：统计信息 -->
      <div class="text-sm text-gray-600">
        共 <span class="font-semibold text-blue-600">{{ total }}</span> 个用户
        <span v-if="selectedUserIds.length > 0" class="ml-3 text-orange-500">
          已选择 {{ selectedUserIds.length }} 项
        </span>
      </div>

      <!-- 右侧：操作按钮组 -->
      <div class="flex items-center gap-2">
        <!-- 批量删除按钮（有选中项时才可用） -->
        <ElPopconfirm
          title="确定要删除选中的用户吗？"
          confirm-button-text="确定"
          cancel-button-text="取消"
          :disabled="selectedUserIds.length === 0"
          @confirm="handleBatchDelete"
        >
          <template #reference>
            <ElButton
              type="danger"
              plain
              :disabled="selectedUserIds.length === 0"
            >
              批量删除 ({{ selectedUserIds.length }})
            </ElButton>
          </template>
        </ElPopconfirm>

        <!-- 新增用户按钮 -->
        <ElButton type="primary" @click="handleAdd"> + 新增用户 </ElButton>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="mb-4 rounded-lg border bg-gray-50 p-4">
      <div class="flex flex-wrap items-center gap-3">
        <!-- 邮箱搜索 -->
        <ElInput
          v-model="emailKeyword"
          placeholder="搜索邮箱..."
          clearable
          style="width: 220px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <span class="i-carbon-email text-gray-400"></span>
          </template>
        </ElInput>

        <!-- 昵称搜索 -->
        <ElInput
          v-model="nicknameKeyword"
          placeholder="搜索昵称..."
          clearable
          style="width: 200px"
          @keyup.enter="handleSearch"
        >
          <template #prefix>
            <span class="i-carbon-user text-gray-400"></span>
          </template>
        </ElInput>

        <!-- 角色筛选 -->
        <ElSelect
          v-model="selectedRole"
          placeholder="选择角色"
          clearable
          style="width: 150px"
          @change="handleSearch"
        >
          <ElOption
            v-for="option in roleOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          />
        </ElSelect>

        <!-- 操作按钮 -->
        <ElButton type="primary" @click="handleSearch">搜索</ElButton>
        <ElButton @click="handleReset">重置</ElButton>
      </div>
    </div>

    <!-- 用户列表表格 -->
    <ElTable
      v-loading="loading"
      :data="userList"
      border
      stripe
      style="width: 100%"
      @selection-change="handleSelectionChange"
    >
      <!-- 多选列 -->
      <ElTableColumn type="selection" width="50" align="center" />

      <!-- 头像列 -->
      <ElTableColumn label="头像" width="80" align="center">
        <template #default="{ row }">
          <ElAvatar
            :size="40"
            :src="row.avatar || undefined"
            :style="{ backgroundColor: '#409eff' }"
          >
            {{ row.nickname?.charAt(0)?.toUpperCase() || 'U' }}
          </ElAvatar>
        </template>
      </ElTableColumn>

      <!-- 邮箱列 -->
      <ElTableColumn prop="email" label="邮箱" min-width="220">
        <template #default="{ row }">
          <span class="text-blue-600">{{ row.email }}</span>
        </template>
      </ElTableColumn>

      <!-- 昵称列 -->
      <ElTableColumn prop="nickname" label="昵称" min-width="120">
        <template #default="{ row }">
          <span class="font-medium">{{ row.nickname }}</span>
        </template>
      </ElTableColumn>

      <!-- 角色列 -->
      <ElTableColumn prop="role" label="角色" width="100" align="center">
        <template #default="{ row }">
          <ElTag :type="getRoleType(row.role)" effect="dark" size="small">
            {{ getRoleLabel(row.role) }}
          </ElTag>
        </template>
      </ElTableColumn>

      <!-- 状态列（启用/禁用开关） -->
      <ElTableColumn label="状态" width="140" align="center">
        <template #default="{ row }">
          <ElSwitch
            :model-value="(row.status || 'active') === 'active'"
            active-text="启用"
            inactive-text="禁用"
            :active-value="true"
            :inactive-value="false"
            inline-prompt
            @change="handleToggleStatus(row)"
          />
        </template>
      </ElTableColumn>

      <!-- 注册时间列 -->
      <ElTableColumn label="注册时间" width="180" align="center">
        <template #default="{ row }">
          <span class="text-gray-500">{{
            formatDateTime(row.created_at)
          }}</span>
        </template>
      </ElTableColumn>

      <!-- 操作列 -->
      <ElTableColumn label="操作" width="180" align="center" fixed="right">
        <template #default="{ row }">
          <div class="flex items-center justify-center gap-2">
            <!-- 编辑按钮 -->
            <ElButton link type="primary" size="small" @click="handleEdit(row)">
              编辑
            </ElButton>

            <!-- 删除按钮（带确认框） -->
            <ElPopconfirm
              title="确定要删除该用户吗？"
              confirm-button-text="确定"
              cancel-button-text="取消"
              @confirm="handleDelete(row.user_id)"
            >
              <template #reference>
                <ElButton link type="danger" size="small">删除</ElButton>
              </template>
            </ElPopconfirm>
          </div>
        </template>
      </ElTableColumn>
    </ElTable>

    <!-- 分页器 -->
    <div class="mt-4 flex justify-end">
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

    <!-- 新增/编辑用户弹窗 -->
    <UserFormDialog
      v-if="showEditDialog"
      :initial-data="currentUser"
      :is-edit="isEdit"
      @submit="handleSubmit"
      @cancel="handleCloseDialog"
    />
  </Page>
</template>
