import { supabase } from "#/lib/supabase";

/**
 * 系统设置接口定义
 * 对应数据库 settings 表
 */
export interface Settings {
  /** 设置 ID (UUID) */
  id: string;
  /** 站点名称 */
  site_name: null | string;
  /** 站点 Logo URL */
  site_logo: null | string;
  /** 是否允许注册 */
  allow_register: boolean | null;
  /** 默认 AI 模型 */
  default_model: null | string;
  /** 系统公告 */
  announcement: null | string;
  /** 更新时间 */
  updated_at: null | string;
}

/**
 * 获取系统设置
 *
 * @returns 设置列表
 */
export const getSettings = async () => {
  const { data, error } = await supabase.from("settings").select("*");
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 更新系统设置参数接口
 */
export interface UpdateSettingsParams {
  /** 站点名称 */
  site_name?: string;
  /** 站点 Logo URL */
  site_logo?: string;
  /** 是否允许注册 */
  allow_register?: boolean;
  /** 默认 AI 模型 */
  default_model?: string;
  /** 系统公告 */
  announcement?: string;
}

/**
 * 更新系统设置
 *
 * @param id - 设置记录 ID
 * @param params - 更新参数
 * @returns 更新后的数据
 */
export const updateSettings = async (id: string, params: UpdateSettingsParams) => {
  const { data, error } = await supabase.from("settings").update(params).eq("id", id).select();
  if (error) {
    throw error;
  }
  return data;
};

/**
 * 测试模型连接
 *
 * @returns 连接测试结果
 */
export const testModelConnection = async () => {
  // 模拟 API 调用，实际项目中替换为真实接口
  return new Promise<{ message: string; status: string }>((resolve) => {
    setTimeout(() => {
      resolve({ status: "success", message: "连接成功" });
    }, 1000);
  });
};
