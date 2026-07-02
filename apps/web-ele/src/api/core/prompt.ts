import { supabase } from '#/lib/supabase';

/**
 * Prompt 数据类型定义
 */
export interface Prompt {
  /** 主键 ID */
  id: string;
  /** 用户 ID */
  user_id: string;
  /** 标题 */
  title: string;
  /** 分类 */
  category: string;
  /** 内容 */
  content: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * 获取当前用户的 Prompt 列表
 * 只返回当前登录用户创建的数据
 */
export async function getPromptList() {
  // 获取当前登录用户信息
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 检查用户是否已登录
  if (!user) {
    throw new Error('用户未登录，无法获取 Prompt 列表');
  }

  // 只查询当前用户自己的数据
  const { data, error } = await supabase
    .from('prompts')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 创建 Prompt
 * 自动关联当前登录用户的 user_id
 */
export async function createPrompt(params: {
  category: string;
  content: string;
  title: string;
}) {
  // 获取当前登录用户信息
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 检查用户是否已登录
  if (!user) {
    throw new Error('用户未登录，无法创建 Prompt');
  }

  // 插入数据时自动添加当前用户的 user_id
  const { data, error } = await supabase
    .from('prompts')
    .insert({
      ...params,
      user_id: user.id,
    })
    .select();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 删除 Prompt
 */
export async function deletePrompt(id: string) {
  const { error } = await supabase.from('prompts').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

/**
 * 更新 Prompt
 */
export async function updatePrompt(
  id: string,
  params: {
    category?: string;
    content?: string;
    title?: string;
  },
) {
  const { data, error } = await supabase
    .from('prompts')
    .update(params)
    .eq('id', id)
    .select();

  if (error) {
    throw error;
  }

  return data;
}
