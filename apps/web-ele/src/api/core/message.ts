import { supabase } from "#/lib/supabase";

/**
 * 消息数据类型定义
 */
export interface Message {
  /** 消息 ID */
  id: string;
  /** 关联的会话 ID */
  chat_id: string;
  /** 消息角色：user 或 assistant */
  role: "assistant" | "user";
  /** 消息内容（可能为长文本） */
  content: string;
  /** 创建时间 */
  created_at: string;
}

/**
 * 获取消息列表（分页、角色筛选）
 * 支持按角色筛选、分页查询、排序
 *
 * @param params - 查询参数
 * @returns 分页后的消息列表数据
 */
export async function getMessageList(params?: {
  /** 当前页码，默认第 1 页 */
  page?: number;
  /** 每页条数，默认 20 条 */
  pageSize?: number;
  /** 角色筛选：user 或 assistant */
  role?: string;
}) {
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 20;
  const role = params?.role;

  // 构建基础查询：获取所有消息并统计总数
  let query = supabase
    .from("messages")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // 如果有角色筛选条件
  if (role && (role === "user" || role === "assistant")) {
    query = query.eq("role", role);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("❌ 获取消息列表失败:", error);
    throw new Error(`获取消息列表失败: ${error.message}`);
  }

  return {
    list: (data || []) as Message[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

/**
 * 根据会话 ID 获取消息列表
 * 获取某个特定会话的所有消息记录
 *
 * @param chatId - 会话 ID
 * @returns 该会话的消息数组
 */
export async function getMessagesByChatId(chatId: string) {
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("chat_id", chatId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ 获取聊天消息失败:", error);
    throw new Error(`获取聊天消息失败: ${error.message}`);
  }

  return (data || []) as Message[];
}

/**
 * 删除单条消息
 * 根据 ID 删除指定的消息记录
 *
 * @param messageId - 消息 ID
 * @returns 被删除的数据
 */
export async function deleteMessage(messageId: string) {
  const { data, error } = await supabase.from("messages").delete().eq("id", messageId).select();

  if (error) {
    console.error("❌ 删除聊天消息失败:", error);
    throw new Error(`删除聊天消息失败: ${error.message}`);
  }

  return data;
}
