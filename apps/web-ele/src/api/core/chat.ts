import { supabase } from '#/lib/supabase';

/**
 * Chat 数据类型定义
 */
export interface Chat {
  /** 主键 ID */
  id: string;
  /** 用户 ID */
  user_id: string;
  /** 聊天标题 */
  title: string;
  /** 模型名称 */
  model: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * 获取当前用户的 Chat 列表
 * 支持分页、搜索、模型筛选、排序
 *
 * @param params - 查询参数（可选）
 * @returns 分页后的 Chat 列表数据
 */
export async function getChatList(params?: {
  /** 模型筛选 */
  model?: string;
  /** 当前页码，默认第 1 页 */
  page?: number;
  /** 每页条数，默认 10 条 */
  pageSize?: number;
  /** 搜索关键词（按标题模糊匹配） */
  search?: string;
}) {
  // 获取当前登录用户信息
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('用户未登录，无法获取 Chat 列表');
  }

  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 10;
  const search = params?.search;
  const model = params?.model;

  // 构建基础查询：查询所有用户并获取总数
  let query = supabase
    .from('chats')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // 如果有搜索关键词，按标题进行模糊匹配
  if (search && search.trim()) {
    query = query.ilike('title', `%${search.trim()}%`);
  }

  // 如果有模型筛选条件
  if (model && model.trim()) {
    query = query.eq('model', model.trim());
  }

  const { data, error, count } = await query;

  if (error) {
    throw error;
  }

  return {
    list: data || [],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/**
 * 创建 Chat
 * 自动关联当前登录用户的 user_id
 */
export async function createChat(params: { model: string; title: string }) {
  // 获取当前登录用户信息
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('用户未登录，无法创建 Chat');
  }

  // 插入数据时自动添加 user_id 和默认 tokens
  // 不指定 id 字段，让数据库自动生成 UUID
  const { data, error } = await supabase
    .from('chats')
    .insert({
      model: params.model,
      title: params.title,
      user_id: user.id,
    })
    .select();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 更新 Chat
 * 只允许修改 title 和 model 字段
 */
export async function updateChat(
  id: string,
  params: {
    model?: string;
    title?: string;
  },
) {
  const { data, error } = await supabase
    .from('chats')
    .update(params)
    .eq('id', id)
    .select();

  if (error) {
    throw error;
  }

  return data;
}

/**
 * 删除 Chat
 */
export async function deleteChat(id: string) {
  const { error } = await supabase.from('chats').delete().eq('id', id);

  if (error) {
    throw error;
  }
}

/**
 * Get chat statistics (full count, not affected by pagination)
 * Used for dashboard: total chats, today new, active models
 *
 * @returns stats object
 */
export async function getChatStats() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('用户未登录，无法获取 Chat 统计信息');
  }

  // Today's date string YYYY-MM-DD
  const today = new Date().toISOString().slice(0, 10);

  // Query 3 stats in parallel
  const [totalRes, todayRes, modelsRes] = await Promise.all([
    // Total count
    supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id),
    // Today new (created_at >= today)
    supabase
      .from('chats')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', today),
    // All models for dedup
    supabase.from('chats').select('model').eq('user_id', user.id),
  ]);

  if (totalRes.error) throw totalRes.error;
  if (todayRes.error) throw todayRes.error;
  if (modelsRes.error) throw modelsRes.error;

  // Deduplicate models
  const activeModels = new Set(
    (modelsRes.data || []).map((item) => item.model).filter(Boolean),
  );

  return {
    total: totalRes.count ?? 0,
    todayNew: todayRes.count ?? 0,
    activeModels: activeModels.size,
  };
}

/**
 * Get Chat detail with related messages
 * Uses Supabase nested query to fetch related messages
 *
 * @param id - Chat ID
 * @returns Chat object with messages array
 */
export async function getChatDetail(id: string) {
  const { data, error } = await supabase
    .from('chats')
    .select(`
      *,
      messages (*)
    `)
    .eq('id', id)
    .single();

  if (error) {
    console.error('[getChatDetail] Failed:', error);
    throw new Error(`Get chat detail failed: ${error.message}`);
  }

  return data;
}
