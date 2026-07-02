import { supabase } from "#/lib/supabase";

/**
 * 模型接口定义
 * 对应数据库 models 表
 */
export interface Model {
  /** 模型 ID (UUID) */
  id: string;
  /** 模型名称 */
  name: string;
  /** 服务提供商 */
  provider: string;
  /** API 密钥（加密存储） */
  api_key: null | string;
  /** 基础 URL */
  base_url: null | string;
  /** 是否启用 */
  enabled: boolean;
  /** 创建时间 */
  created_at: null | string;
}

/**
 * 创建模型参数
 */
export interface CreateModelParams {
  /** 模型名称 */
  name: string;
  /** 服务提供商 */
  provider: string;
  /** API 密钥 */
  api_key: string;
  /** 基础 URL */
  base_url: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * 更新模型参数
 */
export interface UpdateModelParams {
  /** 模型名称 */
  name?: string;
  /** 服务提供商 */
  provider?: string;
  /** API 密钥 */
  api_key?: string;
  /** 基础 URL */
  base_url?: string;
  /** 是否启用 */
  enabled?: boolean;
}

/**
 * Provider 选项列表
 */
export const providerOptions = [
  { label: "OpenAI", value: "openai" },
  { label: "DeepSeek", value: "deepseek" },
  { label: "Anthropic", value: "anthropic" },
  { label: "Google", value: "google" },
  { label: "Custom", value: "custom" },
];

/**
 * 获取模型列表
 *
 * @returns 模型列表
 */
export const getModelList = async () => {
  const { data, error } = await supabase
    .from("models")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 根据 ID 获取单个模型
 *
 * @param id - 模型 ID
 * @returns 模型数据
 */
export const getModelById = async (id: string) => {
  const { data, error } = await supabase.from("models").select("*").eq("id", id).single();
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 创建新模型
 *
 * @param params - 创建参数
 * @returns 新创建的模型
 */
export const createModel = async (params: CreateModelParams) => {
  const { data, error } = await supabase.from("models").insert(params).select().single();
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 更新模型信息
 *
 * @param id - 模型 ID
 * @param params - 更新参数
 * @returns 更新后的模型
 */
export const updateModel = async (id: string, params: UpdateModelParams) => {
  const { data, error } = await supabase
    .from("models")
    .update(params)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 删除模型
 *
 * @param id - 模型 ID
 */
export const deleteModel = async (id: string) => {
  const { error } = await supabase.from("models").delete().eq("id", id);
  if (error) {
    throw error;
  }
};

/**
 * 切换模型启用/禁用状态
 *
 * @param id - 模型 ID
 * @param enabled - 目标状态
 * @returns 更新后的模型
 */
export const toggleModelStatus = async (id: string, enabled: boolean) => {
  const { data, error } = await supabase
    .from("models")
    .update({ enabled })
    .eq("id", id)
    .select()
    .single();
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 测试模型连接
 *
 * @param id - 模型 ID
 * @returns 连接测试结果
 */
export const testModelConnection = async (_id: string) => {
  // 模拟 API 调用，实际项目中替换为真实接口
  // 实际实现应该使用模型的 api_key 和 base_url 发送测试请求
  return new Promise<{ message: string; status: string }>((resolve, reject) => {
    setTimeout(() => {
      // 模拟 80% 成功率
      if (Math.random() > 0.2) {
        resolve({ status: "success", message: "连接成功" });
      } else {
        reject(new Error("连接失败，请检查 API Key 和 Base URL"));
      }
    }, 1500);
  });
};
