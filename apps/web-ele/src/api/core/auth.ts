import type { UserInfo } from '@vben/types';

import { supabase } from '#/lib/supabase';

/**
 * 用户认证相关接口类型定义
 */
export namespace AuthApi {
  /** 登录/注册接口参数 */
  export interface LoginParams {
    /** 邮箱地址或用户名 */
    email?: string;
    /** 用户名（兼容旧版表单） */
    username?: string;
    /** 密码 */
    password: string;
  }

  /** 登录接口返回值（兼容原有格式） */
  export interface LoginResult {
    accessToken: string;
  }

  /** 刷新token返回值 */
  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}

/**
 * 登录接口
 * 使用 Supabase 的 signInWithPassword 方法进行密码登录
 * 支持邮箱或用户名登录（会自动转换为邮箱格式）
 * @param params - 登录参数（email/username 和 password）
 * @returns 返回包含 accessToken 的结果
 *
 * @example
 * // 使用邮箱登录
 * const result = await loginApi({ email: 'user@example.com', password: '123456' });
 *
 * // 使用用户名登录（自动转换）
 * const result = await loginApi({ username: 'admin', password: '123456' });
 */
export async function loginApi(params: AuthApi.LoginParams) {
  // 提取邮箱地址：优先使用 email 字段，否则使用 username
  const email = params.email || params.username;

  // 验证必须提供邮箱或用户名
  if (!email) {
    throw new Error('请输入邮箱地址或用户名');
  }

  // 如果传入的不是邮箱格式，尝试将其作为邮箱处理
  // Supabase 只支持邮箱+密码登录，不支持纯用户名登录
  const loginEmail = email.includes('@') ? email : `${email}@example.com`;

  console.warn('尝试登录:', { email: loginEmail, password: '***' });

  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: params.password,
  });

  // 如果登录失败，抛出带有详细信息的错误
  if (error) {
    // 根据错误类型提供更友好的错误提示
    let errorMessage = error.message;

    if (error.message?.includes('Invalid login credentials')) {
      errorMessage = '邮箱或密码错误';
    } else if (error.message?.includes('Email not confirmed')) {
      errorMessage = '请先验证您的邮箱';
    } else if (error.message?.includes('missing email or phone')) {
      errorMessage = '请输入有效的邮箱地址';
    }

    console.error('登录失败:', error);
    throw new Error(errorMessage);
  }

  // 返回兼容原有格式的 accessToken
  return {
    accessToken: data.session?.access_token ?? '',
  } as AuthApi.LoginResult;
}

/**
 * 刷新accessToken
 * 使用 Supabase 的 getSession 方法刷新会话token
 * @returns 返回新的 token 数据
 */
export async function refreshTokenApi() {
  // 使用 Supabase 的 refresh session 功能
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (!session) {
    throw new Error('No active session');
  }

  return {
    data: session.access_token,
    status: 200,
  } as AuthApi.RefreshTokenResult;
}

/**
 * 退出登录
 * 使用 Supabase 的 signOut 方法登出用户
 */
export async function logoutApi() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

/**
 * 获取用户信息
 * 从当前 Supabase 会话中获取用户信息
 * @returns 返回符合项目规范的 UserInfo 对象，如果用户未登录则返回 null
 */
export async function getUserInfoApi(): Promise<null | UserInfo> {
  try {
    // 获取当前用户信息
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // 如果用户未登录或会话无效，返回 null（不抛出错误）
    if (error || !user) {
      console.warn('用户未登录或会话已过期:', error?.message);
      return null;
    }

    // 获取当前会话以获取 token
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // 如果没有有效会话，返回 null
    if (!session) {
      console.warn('没有有效的认证会话');
      return null;
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    console.warn('profile=', profile);
    console.warn('profileError=', profileError);
    if (profileError) {
      throw profileError;
    }

    if (!profile) {
      throw new Error(`找不到profile: ${user.id}`);
    }
    // 将 Supabase 用户信息转换为项目所需的格式（符合 UserInfo 接口）
    return {
      userId: profile.user_id,
      username: profile.nickname,
      realName: profile.nickname,
      avatar: profile.avatar,
      desc: profile.desc,
      token: session.access_token,
      roles: [profile.role],
      homePath: '/dashboard/analytics',
    } as UserInfo;
  } catch (error) {
    // 捕获任何异常并返回 null，避免路由导航失败
    console.error('获取用户信息时出错:', error);
    return null;
  }
}

/**
 * 获取用户权限码
 * 从用户的 metadata 或自定义表中获取权限列表
 * 目前返回默认权限，后续可对接后端权限系统
 * @returns 权限码数组
 */
export async function getAccessCodesApi(): Promise<string[]> {
  try {
    // 获取当前用户
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return [];
    }

    // 从用户元数据中获取角色或权限
    const roles = user.app_metadata?.roles ?? user.user_metadata?.roles ?? [];

    // 如果是数组则直接返回，否则包装成数组
    return Array.isArray(roles) ? roles : [String(roles)];
  } catch {
    // 出错时返回空数组
    return [];
  }
}

/**
 * 用户登录接口（新版本 - 直接使用）
 * @param email - 用户邮箱
 * @param password - 用户密码
 * @returns 登录结果（包含用户信息、会话和错误信息）
 */
export const authLoginApi = async (email: string, password: string) => {
  // 使用 signInWithPassword 方法进行密码登录
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    user: data.user,
    session: data.session,
    error,
  };
};

/**
 * 用户注册接口
 * 使用 Supabase 的 signUp 方法创建新用户
 * @param email - 用户邮箱
 * @param password - 用户密码（至少6位）
 * @returns 注册结果（包含用户信息、会话和错误信息）
 */
export const authRegisterApi = async (email: string, password: string) => {
  // 使用 signUp 方法进行用户注册（注意：Supabase 没有 register 方法！）
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 注册后自动发送邮箱验证链接（可选配置）
      emailRedirectTo: `${window.location.origin}/auth/login`,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  // 2. 创建业务用户
  await supabase.from('profiles').insert({
    user_id: data.user?.id,
    email: data.user?.email,
    nickname: '新用户',
    role: 'user',
  });
  return {
    user: data.user,
    session: data.session,
    error,
  };
};
