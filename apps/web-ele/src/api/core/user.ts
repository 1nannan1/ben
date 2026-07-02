import { supabase, supabaseAdmin } from '#/lib/supabase';

/**
 * 用户数据类型定义
 */
export interface User {
  /** 主键：用户 ID */
  user_id: string;
  /** 邮箱地址 */
  email: string;
  /** 昵称 */
  nickname: string;
  /** 头像 URL */
  avatar: string;
  /** 角色：user / admin */
  role: string;
  /** 用户状态：active(启用) / disabled(禁用) */
  status: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * 获取用户列表
 * 支持分页、搜索、角色筛选功能
 * @param params - 查询参数（可选）
 * @returns 用户列表数据
 */
export async function getUserList(params?: {
  /** 当前页码，默认第 1 页 */
  page?: number;
  /** 每页条数，默认 10 条 */
  pageSize?: number;
  /** 角色筛选 */
  role?: string;
  /** 搜索关键词（按邮箱或昵称模糊匹配，支持 or 条件） */
  search?: string;
}) {
  // 获取当前登录用户信息（确保已认证）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('用户未登录，无法获取用户列表');
  }

  // 设置默认分页参数
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const search = params?.search;
  const role = params?.role;

  // 构建基础查询：查询所有用户并获取总数
  let query = supabase
    .from('profiles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // 如果有搜索关键词，按邮箱或昵称进行模糊匹配
  if (search && search.trim()) {
    query = query.or(search.trim());
  }

  // 如果有角色筛选条件
  if (role && role.trim()) {
    query = query.eq('role', role.trim());
  }

  // 执行查询
  const { data, error, count } = await query;

  // 错误处理
  if (error) {
    throw error;
  }

  // 返回格式化的列表数据
  return {
    list: (data as User[]) || [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/**
 * 创建新用户
 * 使用 Supabase Admin API（service_role key）创建用户
 * 不会切换当前管理员的登录状态
 *
 * @param params - 用户信息参数（包含密码）
 * @returns 创建成功后的用户数据
 */
export async function createUser(params: {
  /** 头像 URL */
  avatar: string;
  /** 邮箱地址 */
  email: string;
  /** 昵称 */
  nickname: string;
  /** 初始密码（必填，用于创建 Auth 用户） */
  password: string;
  /** 角色 */
  role: string;
}) {
  // 获取当前操作者信息（验证管理员权限）
  const {
    data: { user: adminUser },
    error: authCheckError,
  } = await supabase.auth.getUser();

  if (authCheckError || !adminUser) {
    console.error('❌ 管理员验证失败:', authCheckError);
    throw new Error('用户未登录，无法创建用户');
  }

  /**
   * 使用 Admin API 创建 Auth 用户（不会切换当前登录状态）
   * supabaseAdmin 使用 service_role key，绕过 RLS
   */
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        nickname: params.nickname,
        role: params.role || 'user',
      },
    });

  if (authError) {
    console.error('❌ 创建认证用户失败:', authError);

    let errorMsg = `创建认证用户失败：${authError.message}`;
    if (authError.message.includes('already registered')) {
      errorMsg = '该邮箱已被注册，请使用其他邮箱';
    } else if (authError.message.includes('password')) {
      errorMsg = '密码不符合要求：至少6位字符';
    }

    throw new Error(errorMsg);
  }

  const newUserId = authData.user?.id;

  if (!newUserId) {
    console.error('❌ 无法获取新用户的 ID', { authData });
    throw new Error('创建认证用户成功，但无法获取用户 ID。');
  }

  const profileData = {
    avatar: params.avatar || '',
    email: params.email,
    nickname: params.nickname,
    role: params.role || 'user',
    user_id: newUserId,
  };

  /** 在 profiles 表中创建用户资料 */
  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select();

  if (error) {
    console.error('❌ 创建 profile 失败详情:', error);

    if (error.code === '23503') {
      throw new Error(
        '外键约束错误：无法创建用户资料。' +
          '可能原因：Auth 用户创建失败或 ID 不匹配。' +
          `技术细节：${error.message}`,
      );
    }

    throw new Error(`创建用户资料失败：${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ Profile 创建成功但未返回数据');
  } else {
    console.warn('✅ 用户创建完成！', data[0]);
  }

  return data as User[];
}

export async function AdminCreateUser(params: {
  /** 头像 URL */
  avatar: string;
  /** 邮箱地址 */
  email: string;
  /** 昵称 */
  nickname: string;
  /** 初始密码（必填，用于创建 Auth 用户） */
  password: string;
  /** 角色 */
  role: string;
}) {
  /**
   * 使用 Admin API 创建 Auth 用户（不会切换当前登录状态）
   * supabaseAdmin 使用 service_role key，绕过 RLS
   */
  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email: params.email,
      password: params.password,
      email_confirm: true,
      user_metadata: {
        nickname: params.nickname,
        role: params.role,
      },
    });

  if (authError) {
    if (authError.message.includes('email rate limit exceeded')) {
      throw new Error('邮箱发送频率过高，请稍后再试');
    }

    throw authError;
  }

  // 获取新创建的用户 ID
  const newUserId = authData.user?.id;

  if (!newUserId) {
    console.error('❌ 无法获取新用户的 ID', { authData });
    throw new Error('创建认证用户成功，但无法获取用户 ID。');
  }

  // 在 profiles 表中插入用户资料记录
  const profileData = {
    avatar: params.avatar || '',
    email: params.email,
    nickname: params.nickname,
    role: params.role || 'user',
    user_id: newUserId,
  };

  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select();

  if (error) {
    console.error('❌ 创建 profile 失败:', error);

    if (error.code === '23503') {
      throw new Error(
        '外键约束错误：无法创建用户资料。可能原因：Auth 用户创建失败或 ID 不匹配。',
      );
    }

    throw new Error(`创建用户资料失败：${error.message}`);
  }

  if (!data || data.length === 0) {
    console.warn('⚠️ Profile 创建成功但未返回数据');
  } else {
    console.warn('✅ 管理员创建用户完成！', data[0]);
  }

  return data;
}

/**
 * 更新用户信息
 * @param user_id - 用户 ID（主键）
 * @param params - 要更新的字段（可选部分字段）
 * @returns 更新后的用户数据
 */
export async function updateUser(
  user_id: string,
  params: {
    /** 头像 URL（可选） */
    avatar?: string;
    /** 邮箱（可选） */
    email?: string;
    /** 昵称（可选） */
    nickname?: string;
    /** 角色（可选） */
    role?: string;
    /** 用户状态：active / disabled（可选） */
    status?: string;
  },
) {
  // ✅ 过滤掉 undefined 字段，只更新实际传入的字段
  const updateData: Record<string, unknown> = {};

  if (params.avatar !== undefined) {
    updateData.avatar = params.avatar;
  }
  if (params.email !== undefined) {
    updateData.email = params.email;
  }
  if (params.nickname !== undefined) {
    updateData.nickname = params.nickname;
  }
  if (params.role !== undefined) {
    updateData.role = params.role;
  }
  if (params.status !== undefined) {
    updateData.status = params.status;
  }

  // 检查是否有需要更新的字段
  if (Object.keys(updateData).length === 0) {
    console.warn('updateUser: 没有提供任何要更新的字段');
    throw new Error('没有提供任何要更新的字段');
  }

  console.warn('📝 更新用户信息:', {
    user_id,
    updateData,
  });

  // 执行更新操作（使用 user_id 作为主键）
  const { data, error, count } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('user_id', user_id)
    .select();

  // 详细日志输出
  console.warn('📊 更新结果:', { data, error, count });

  // 错误处理
  if (error) {
    console.error('❌ 更新失败详情:', error);
    throw new Error(`更新用户失败：${error.message}`);
  }

  // 检查是否真的更新了数据
  if (!data || data.length === 0) {
    console.warn('⚠️ 更新成功但未返回数据（可能 RLS 策略阻止了 select）');
  } else {
    console.warn('✅ 更新成功，返回数据:', data[0]);
  }

  return data as User[];
}

/**
 * 删除用户
 * @param user_id - 要删除的用户 ID（主键）
 */
export async function deleteUser(user_id: string) {
  // 根据 user_id 删除用户记录
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('user_id', user_id);

  // 错误处理
  if (error) {
    throw error;
  }
}

/**
 * 批量删除用户
 * 根据用户 ID 数组批量删除多个用户
 * @param user_ids - 要删除的用户 ID 数组
 * @returns 删除结果
 */
export async function batchDeleteUsers(user_ids: string[]) {
  // 验证参数有效性
  if (!user_ids || user_ids.length === 0) {
    throw new Error('请提供要删除的用户 ID 列表');
  }

  // 使用 in 操作符批量删除并返回被删除的数据
  const { data, error } = await supabase
    .from('profiles')
    .delete()
    .in('user_id', user_ids)
    .select('*');

  // 错误处理
  if (error) {
    console.error('批量删除失败:', error);
    throw new Error(`批量删除失败：${error.message}`);
  }

  // 计算实际删除数量（通过返回数据的长度）
  const deletedCount = Array.isArray(data) ? data.length : user_ids.length;

  console.warn(`✅ 批量删除完成，共删除 ${deletedCount} 个用户`);

  return {
    success: true,
    deletedCount,
  };
}

/**
 * 切换用户启用/禁用状态
 * active → disabled（禁用）或 disabled → active（启用）
 *
 * @param user_id - 用户 ID
 * @returns 更新后的状态
 */
export async function toggleUserStatus(user_id: string) {
  // 先查询当前状态
  const { data: current, error: fetchError } = await supabase
    .from('profiles')
    .select('status')
    .eq('user_id', user_id)
    .single();

  if (fetchError) {
    throw fetchError;
  }

  // 切换状态：active ↔ disabled
  const newStatus = current?.status === 'active' ? 'disabled' : 'active';

  // 执行更新
  const { data, error } = await supabase
    .from('profiles')
    .update({ status: newStatus })
    .eq('user_id', user_id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as User;
}
