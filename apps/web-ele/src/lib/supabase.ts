import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** 普通客户端（使用 anon key，受 RLS 约束） */
export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * 管理员客户端（使用 service_role key，绕过 RLS）
 * 用于管理员操作：创建用户、删除用户等，不会切换当前登录状态
 *
 * ⚠️ service_role 是敏感密钥，仅用于服务端/管理员操作
 * 前端使用时需确保只有管理员可调用相关接口
 */
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    /** 管理员客户端不需要自动刷新 session */
    autoRefreshToken: false,
    /** 不持久化 session，避免污染本地存储 */
    persistSession: false,
  },
});
