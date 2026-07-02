import { supabase } from '#/lib/supabase';

/**
 * 仪表盘统计概览数据接口
 */
export interface DashboardStats {
  /** 总用户数 */
  totalUsers: number;
  /** 总对话数 */
  totalConversations: number;
  /** 总消息数 */
  totalMessages: number;
  /** 总 Token 消耗量 */
  totalTokens: number;
  /** 总费用（美元） */
  totalCost: string;
  /** 近 7 天活跃用户数 */
  activeUsers: number;
}

/**
 * 趋势数据项（按天聚合）
 */
export interface TrendItem {
  /** 日期 */
  date: string;
  /** Token 总量 */
  tokens: number;
  /** 费用 */
  cost: number;
}

/**
 * 模型使用统计数据
 */
export interface ModelUsage {
  /** 模型 ID */
  modelId: string;
  /** 模型名称 */
  modelName: string;
  /** 使用次数 */
  usageCount: number;
  /** Token 总量 */
  totalTokens: number;
}

/**
 * 用户排行数据
 */
export interface UserRanking {
  /** 用户 ID */
  userId: string;
  /** 用户昵称 */
  nickname: string;
  /** 头像 */
  avatar: null | string;
  /** 请求数量 */
  requests: number;
  /** Token 消耗总量 */
  totalTokens: number;
  /** 总费用 */
  totalCost: string;
  /** 最后活跃时间 */
  lastActiveTime: string;
}

/**
 * 最近活动记录
 */
export interface Activity {
  /** 活动唯一标识 */
  id: string;
  /** 用户名称 */
  userName: string;
  /** 用户头像 */
  userAvatar: null | string;
  /** 活动描述文本 */
  description: string;
  /** 活动类型：model_usage | conversation | token_consumption */
  type: 'conversation' | 'model_usage' | 'token_consumption';
  /** 活动发生时间 */
  timestamp: string;
}

/** Supabase RPC 返回的原始 Stats 类型（snake_case） */
type RawDashboardStats = {
  active_users: number;
  total_conversations: number;
  total_cost: number;
  total_messages: number;
  total_tokens: number;
  total_users: number;
};

/** Supabase RPC 返回的原始 ModelUsage（snake_case） */
type RawModelUsage = {
  model_id: string;
  model_name: string;
  total_tokens: number;
  usage_count: number;
};

/**
 * 将 snake_case 的原始 Stats 映射为 camelCase
 *
 * @param raw - 原始数据
 * @returns 映射后的 DashboardStats
 */
function mapStats(raw: RawDashboardStats): DashboardStats {
  return {
    totalUsers: Number(raw.total_users) || 0,
    totalConversations: Number(raw.total_conversations) || 0,
    totalMessages: Number(raw.total_messages) || 0,
    totalTokens: Number(raw.total_tokens) || 0,
    totalCost: String(raw.total_cost ?? 0),
    activeUsers: Number(raw.active_users) || 0,
  };
}

/**
 * 将 snake_case 的原始 ModelUsage 映射为 camelCase
 *
 * @param raw - 原始数据
 * @returns 映射后的 ModelUsage
 */
function mapModelUsage(raw: RawModelUsage): ModelUsage {
  return {
    modelId: String(raw.model_id ?? ''),
    modelName: raw.model_name ?? '',
    usageCount: Number(raw.usage_count) || 0,
    totalTokens: Number(raw.total_tokens) || 0,
  };
}

/**
 * 获取仪表盘概览统计数据
 *
 * @returns 统计概览数据
 */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  const { data, error } = await supabase.rpc('get_dashboard_stats');
  if (error) {
    throw error;
  }
  const raw = data as unknown as RawDashboardStats[];
  // RPC 返回的是数组，取第一条
  return raw?.[0] ? mapStats(raw[0]) : mapStats({} as RawDashboardStats);
};

/**
 * 获取近 7 天 Token 和费用趋势数据
 *
 * @returns 趋势数据数组
 */
export const getTrendData = async (): Promise<TrendItem[]> => {
  const { data, error } = await supabase.rpc('get_trend_data');
  if (error) {
    throw error;
  }
  const raw = data as unknown as TrendItem[];
  // trend_data 返回的字段名恰好与接口一致（date/tokens/cost）
  return (raw || []).map((item) => ({
    date: String(item.date ?? ''),
    tokens: Number(item.tokens) || 0,
    cost: Number(item.cost) || 0,
  }));
};

/**
 * 获取模型使用统计（用于饼图和柱状图）
 *
 * @returns 模型使用数据数组
 */
export const getModelUsage = async (): Promise<ModelUsage[]> => {
  const { data, error } = await supabase.rpc('get_model_usage');
  if (error) {
    throw error;
  }
  const raw = data as unknown as RawModelUsage[];
  return (raw || []).map((item) => mapModelUsage(item));
};

/**
 * 分页查询结果通用接口
 */
export interface PaginatedResult<T> {
  /** 当前页数据列表 */
  data: T[];
  /** 总记录数（用于分页组件） */
  total: number;
}

/**
 * 获取用户排行数据（后端聚合 + 前端分页）
 * 从 usage_logs 全量拉取后按 user_id 聚合，再按 Token 消耗降序排列
 *
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页条数
 * @returns 分页后的用户排行数据
 */
export const getUserRanking = async (
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedResult<UserRanking>> => {
  // 全量拉取 usage_logs + profiles 关联数据
  const { data, error } = await supabase
    .from('usage_logs')
    .select(
      'user_id, profiles(nickname, avatar), total_tokens, cost, created_at',
    );

  if (error) {
    throw error;
  }

  // 按 user_id 聚合数据
  const grouped = new Map<
    string,
    {
      avatar: null | string;
      lastActiveTime: string;
      nickname: string;
      requests: number;
      totalCost: number;
      totalTokens: number;
    }
  >();

  (data || []).forEach((row) => {
    const uid = row.user_id as string;
    const profile = row.profiles as {
      avatar?: null | string;
      nickname?: string;
    };
    const item = grouped.get(uid);
    if (item) {
      item.requests += 1;
      item.totalTokens += Number(row.total_tokens) || 0;
      item.totalCost += Number(row.cost) || 0;
      if (
        !item.lastActiveTime ||
        new Date(row.created_at).getTime() >
          new Date(item.lastActiveTime).getTime()
      ) {
        item.lastActiveTime = row.created_at;
      }
    } else {
      grouped.set(uid, {
        requests: 1,
        totalTokens: Number(row.total_tokens) || 0,
        totalCost: Number(row.cost) || 0,
        lastActiveTime: row.created_at,
        nickname: profile?.nickname ?? '',
        avatar: profile?.avatar ?? null,
      });
    }
  });

  // 转换为数组并按 Token 降序排序
  const allUsers = [...grouped.entries()]
    .map(([userId, v]) => ({
      userId,
      nickname: v.nickname,
      avatar: v.avatar,
      requests: v.requests,
      totalTokens: v.totalTokens,
      totalCost: String(v.totalCost.toFixed(4)),
      lastActiveTime: v.lastActiveTime,
    }))
    .toSorted((a, b) => b.totalTokens - a.totalTokens);

  // total = 去重后的用户数量（不是 usage_logs 原始行数）
  const total = allUsers.length;

  // 前端分页切片
  const from = (page - 1) * pageSize;
  const result = allUsers.slice(from, from + pageSize);

  return { data: result, total };
};

/**
 * 获取最近活动记录（后端分页）
 * 从 usage_logs 联查 profiles，按时间降序排列
 *
 * @param page - 页码，从 1 开始
 * @param pageSize - 每页条数
 * @returns 分页后的活动记录数据
 */
export const getRecentActivities = async (
  page: number = 1,
  pageSize: number = 10,
): Promise<PaginatedResult<Activity>> => {
  // 先查总数
  const { count: total } = await supabase
    .from('usage_logs')
    .select('*', { count: 'exact', head: true });

  // 计算分页偏移量（0-based）
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // 联表查询：usage_logs + profiles + models
  const { data, error } = await supabase
    .from('usage_logs')
    .select(
      'id, total_tokens, cost, created_at, user_id, profiles(nickname, avatar), models(name)',
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  // 映射为 Activity 格式（从 models 表获取可读的模型名称）
  const result = (data || []).map((row): Activity => {
    const modelName = (row.models as { name?: string })?.name ?? '未知模型';
    const nickname =
      (row.profiles as { nickname?: string })?.nickname ?? '未知用户';
    return {
      id: String(row.id),
      userName: nickname,
      userAvatar: (row.profiles as { avatar?: null | string })?.avatar ?? null,
      description: `${nickname} used ${modelName}`,
      type: 'model_usage' as const,
      timestamp: row.created_at,
    };
  });

  return {
    data: result,
    total: total || 0,
  };
};
