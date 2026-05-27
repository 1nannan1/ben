# Vue Vben Admin - Supabase 登录注册功能实现文档

## 📋 目录

- [1. 功能概述](#1-功能概述)
- [2. 技术架构](#2-技术架构)
- [3. 环境配置](#3-环境配置)
- [4. 核心模块说明](#4-核心模块说明)
- [5. 登录流程详解](#5-登录流程详解)
- [6. 注册流程详解](#6-注册流程详解)
- [7. 权限与路由守卫](#7-权限与路由守卫)
- [8. API 接口列表](#8-api-接口列表)
- [9. 数据流图](#9-数据流图)
- [10. 错误处理机制](#10-错误处理机制)
- [11. 使用示例](#11-使用示例)
- [12. 常见问题与解决方案](#12-常见问题与解决方案)

---

## 1. 功能概述

### 1.1 功能特性

本项目的登录注册系统基于 **Supabase** 认证服务实现，具备以下特性：

- ✅ **邮箱+密码登录** - 支持邮箱和用户名两种登录方式
- ✅ **用户注册** - 支持新用户注册并自动发送验证邮件
- ✅ **Token 管理** - 自动处理 access_token 的存储、刷新和过期
- ✅ **会话保持** - 基于 Supabase Session 的持久化登录状态
- ✅ **路由守卫** - 自动拦截未登录用户，保护需要认证的页面
- ✅ **权限控制** - 基于角色的动态菜单和路由生成
- ✅ **错误处理** - 友好的中文错误提示，完善的异常捕获
- ✅ **安全性** - 密码加密传输、Token 过期自动刷新、CSRF 防护

### 1.2 系统流程概览

```
用户访问 → 路由守卫检查 → 未登录？→ 跳转登录页
                              ↓ 已登录
                    检查 Token 有效性 → 有效？→ 正常访问页面
                                          ↓ 无效
                                    刷新 Token 或重新登录
```

---

## 2. 技术架构

### 2.1 技术栈

| 技术         | 版本     | 用途                        |
| ------------ | -------- | --------------------------- |
| Vue.js       | 3.x      | 前端框架（Composition API） |
| TypeScript   | 5.x      | 类型安全                    |
| Pinia        | 最新版   | 状态管理                    |
| Vue Router   | 4.x      | 路由管理                    |
| Element Plus | 最新版   | UI 组件库                   |
| Supabase JS  | ^2.106.2 | 后端认证服务                |
| Zod          | 最新版   | 表单验证                    |
| Vite         | 5.x      | 构建工具                    |

### 2.2 项目结构（认证相关）

```
apps/web-ele/src/
├── api/
│   └── core/
│       ├── auth.ts              # ⭐ 核心认证API（登录、注册、Token等）
│       ├── user.ts              # 用户信息API（导出至auth.ts）
│       ├── menu.ts              # 菜单权限API
│       └── index.ts             # 统一导出
│   ├── request.ts               # HTTP请求客户端配置
│   └── index.ts                 # API入口
├── lib/
│   └── supabase.ts              # ⭐ Supabase客户端初始化
├── store/
│   └── auth.ts                  # ⭐ 认证状态管理（Pinia Store）
├── views/_core/authentication/
│   ├── login.vue                # ⭐ 登录页面组件
│   ├── register.vue             # 注册页面组件
│   └── ...                      # 其他认证相关页面
├── router/
│   ├── guard.ts                 # ⭐ 路由守卫（权限检查）
│   └── routes/                  # 路由配置
├── preferences.ts               # 应用偏好设置
└── locales/                     # 国际化语言包
```

---

## 3. 环境配置

### 3.1 Supabase 配置

在 `.env.development` 或 `.env.production` 文件中添加：

```bash
# Supabase 配置
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

**获取方式**：

1. 登录 [Supabase Dashboard](https://supabase.com/dashboard)
2. 创建或选择项目
3. 进入 **Settings** → **API**
4. 复制 **Project URL** 和 **anon public** key

### 3.2 Supabase 客户端初始化

**文件位置**: `src/lib/supabase.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

**配置说明**：

- 使用环境变量确保安全性
- `createClient` 创建全局唯一的 Supabase 实例
- 支持 Cookie 和 localStorage 双重存储策略

### 3.3 应用偏好设置

**文件位置**: `src/preferences.ts`

```typescript
import { defineOverridesPreferences } from '@vben/preferences';

export const overridesPreferences = defineOverridesPreferences({
  app: {
    name: import.meta.env.VITE_APP_TITLE,
    // 默认首页路径（登录成功后跳转的页面）
    defaultHomePath: '/dashboard/analytics',
  },
});
```

---

## 4. 核心模块说明

### 4.1 认证 API 模块 (`api/core/auth.ts`)

这是整个认证系统的核心，包含所有与 Supabase 交互的函数。

#### 4.1.1 类型定义

```typescript
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

  /** 登录接口返回值 */
  export interface LoginResult {
    accessToken: string;
  }

  /** 刷新token返回值 */
  export interface RefreshTokenResult {
    data: string;
    status: number;
  }
}
```

#### 4.1.2 核心函数清单

| 函数名 | 功能 | 返回类型 | Supabase API |
| --- | --- | --- | --- |
| `loginApi()` | 用户登录 | `Promise<LoginResult>` | `signInWithPassword()` |
| `authLoginApi()` | 直接登录 | `Promise<{user, session, error}>` | `signInWithPassword()` |
| `authRegisterApi()` | 用户注册 | `Promise<{user, session, error}>` | `signUp()` |
| `refreshTokenApi()` | 刷新Token | `Promise<RefreshTokenResult>` | `getSession()` |
| `logoutApi()` | 退出登录 | `Promise<void>` | `signOut()` |
| `getUserInfoApi()` | 获取用户信息 | `Promise<UserInfo \| null>` | `getUser()` + `getSession()` |
| `getAccessCodesApi()` | 获取权限码 | `Promise<string[]>` | 从 metadata 读取 |

---

## 5. 登录流程详解

### 5.1 完整登录时序图

```
用户                Login.vue         authStore          loginApi()        Supabase
 │                   │                  │                   │                 │
 │  输入账号密码      │                  │                   │                 │
 │─────────────────>│                  │                   │                 │
 │                   │  @submit事件     │                   │                 │
 │                   │────────────────>│                   │                 │
 │                   │                  │  loginApi(params) │                 │
 │                   │                  │─────────────────>│                 │
 │                   │                  │                   │ 提取email/username
 │                   │                  │                   │────────────────>│
 │                   │                  │                   │ signInWithPassword()
 │                   │                  │                   │<────────────────│
 │                   │                  │                   │ session/token   │
 │                   │                  │<─────────────────│                 │
 │                   │                  │ accessToken       │                 │
 │                   │<─────────────────│                   │                 │
 │                   │ setAccessToken() │                   │                 │
 │                   │ fetchUserInfo()  │                   │                 │
 │                   │ getAccessCodes() │                   │                 │
 │                   │                  │                   │ getUser()       │
 │                   │                  │─────────────────>│                 │
 │                   │                  │<─────────────────│ user info        │
 │                   │                  │ router.push(homePath)              │
 │                   │<─────────────────│                   │                 │
 │  显示仪表盘页面   │                  │                   │                 │
 │<──────────────────│                  │                   │                 │
```

### 5.2 登录表单组件

**文件位置**: `src/views/_core/authentication/login.vue`

**表单字段配置**：

```typescript
const formSchema = computed((): VbenFormSchema[] => [
  // 1. 账号选择器（可选预填）
  {
    component: 'VbenSelect',
    fieldName: 'selectAccount',
    label: '选择账号',
    options: [
      { label: 'Super', value: '3212278838@qq.com' },
      { label: 'Admin', value: 'admin' },
      { label: 'User', value: 'jack' },
    ],
  },

  // 2. 用户名输入框
  {
    component: 'VbenInput',
    fieldName: 'username', // ⚠️ 注意：字段名为 username
    label: '用户名',
    rules: z.string().min(1), // 必填验证
  },

  // 3. 密码输入框
  {
    component: 'VbenInputPassword',
    fieldName: 'password',
    label: '密码',
    rules: z.string().min(1),
  },

  // 4. 滑块验证码
  {
    component: markRaw(SliderCaptcha),
    fieldName: 'captcha',
    rules: z.boolean().refine((v) => v), // 必须通过验证
  },
]);
```

**提交处理**：

```vue
<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    @submit="authStore.authLogin"  <!-- 绑定到 authStore.authLogin -->
  />
</template>
```

### 5.3 登录核心逻辑

**文件位置**: `src/store/auth.ts` - `authLogin()` 函数

```typescript
async function authLogin(
  params: AuthApi.LoginParams | Recordable<any>,
  onSuccess?: () => Promise<void> | void,
) {
  let userInfo: null | UserInfo = null;

  try {
    loginLoading.value = true; // 显示加载状态

    // 步骤1：调用登录API
    const { accessToken } = await loginApi(params as AuthApi.LoginParams);

    if (accessToken) {
      // 步骤2：存储Token到全局状态
      accessStore.setAccessToken(accessToken);

      // 步骤3：并行获取用户信息和权限
      const [fetchUserInfoResult, accessCodes] = await Promise.all([
        fetchUserInfo(),
        getAccessCodesApi(),
      ]);

      userInfo = fetchUserInfoResult;

      // 步骤4：更新Store
      userStore.setUserInfo(userInfo);
      accessStore.setAccessCodes(accessCodes);

      // 步骤5：跳转到首页
      const homePath = userInfo?.homePath || preferences.app.defaultHomePath;
      onSuccess ? await onSuccess?.() : await router.push(homePath);

      // 步骤6：显示成功通知
      if (userInfo?.realName) {
        ElNotification({
          message: `欢迎回来：${userInfo.realName}`,
          title: '登录成功',
          type: 'success',
        });
      }
    }
  } finally {
    loginLoading.value = false; // 关闭加载状态
  }

  return { userInfo };
}
```

### 5.4 loginApi() 详细实现

```typescript
export async function loginApi(params: AuthApi.LoginParams) {
  // 1. 提取邮箱地址（支持 email 或 username 字段）
  const email = params.email || params.username;

  // 2. 参数验证
  if (!email) {
    throw new Error('请输入邮箱地址或用户名');
  }

  // 3. 智能转换：如果不含@，自动添加域名后缀
  const loginEmail = email.includes('@') ? email : `${email}@example.com`;

  console.warn('尝试登录:', { email: loginEmail, password: '***' });

  // 4. 调用Supabase登录接口
  const { data, error } = await supabase.auth.signInWithPassword({
    email: loginEmail,
    password: params.password,
  });

  // 5. 错误处理（中文友好提示）
  if (error) {
    let errorMessage = error.message;

    if (error.message?.includes('Invalid login credentials')) {
      errorMessage = '邮箱或密码错误';
    } else if (error.message?.includes('Email not confirmed')) {
      errorMessage = '请先验证您的邮箱';
    } else if (error.message?.includes('missing email or phone')) {
      errorMessage = '请输入有效的邮箱地址';
    }

    throw new Error(errorMessage);
  }

  // 6. 返回accessToken
  return {
    accessToken: data.session?.access_token ?? '',
  };
}
```

**关键特性**：

- ✅ 兼容 `username` 和 `email` 两种字段名
- ✅ 自动将用户名转换为邮箱格式
- ✅ 详细的日志输出便于调试
- ✅ 中文化的错误提示

---

## 6. 注册流程详解

### 6.1 注册时序图

```
用户                Register页        authRegisterApi()     Supabase
 │                   │                  │                    │
 │  输入邮箱密码      │                  │                    │
 │─────────────────>│                  │                    │
 │                   │  点击注册按钮    │                    │
 │                   │────────────────>│                    │
 │                   │                  │ signUp(email, pwd) │
 │                   │                  │───────────────────>│
 │                   │                  │                    │ 创建用户
 │                   │                  │                    │ 发送验证邮件
 │                   │                  │<───────────────────│
 │                   │                  │ user/session/error │
 │                   │<─────────────────│                    │
 │  显示结果         │                  │                    │
 │<──────────────────│                  │                    │
```

### 6.2 注册接口实现

```typescript
/**
 * 用户注册接口
 * @param email - 用户邮箱
 * @param password - 用户密码（至少6位）
 * @returns 注册结果（包含用户信息、会话和错误信息）
 */
export const authRegisterApi = async (email: string, password: string) => {
  // 使用 signUp 方法进行用户注册
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // 注册后自动发送邮箱验证链接
      emailRedirectTo: `${window.location.origin}/auth/login`,
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
  };
};
```

**重要说明**：

- ⚠️ Supabase **没有** `register()` 方法，必须使用 `signUp()`
- 🔒 密码要求至少 6 位字符
- 📧 默认会发送邮箱验证链接（可在 Supabase Dashboard 关闭）
- 👤 如果开启了邮箱验证，`session` 可能为 `null`，需等待用户点击邮件链接

### 6.3 调用示例

```typescript
import { authRegisterApi } from '#/api/core/auth';

// 在注册组件中使用
const handleRegister = async () => {
  try {
    const result = await authRegisterApi('newuser@example.com', 'password123');

    if (result.error) {
      // 处理错误
      console.error('注册失败:', result.error.message);

      if (result.error.message.includes('already registered')) {
        alert('该邮箱已被注册');
      } else {
        alert(`注册失败：${result.error.message}`);
      }
    } else {
      // 注册成功
      console.log('注册成功！', result.user);

      if (result.session) {
        // 自动登录（未开启邮箱验证时）
        alert('注册成功，正在跳转...');
        router.push('/dashboard/analytics');
      } else {
        // 需要邮箱验证
        alert('注册成功！请查收验证邮件并点击链接激活账户');
        router.push('/auth/login');
      }
    }
  } catch (error) {
    console.error('注册过程出错:', error);
    alert('注册失败，请稍后重试');
  }
};
```

---

## 7. 权限与路由守卫

### 7.1 路由守卫工作原理

**文件位置**: `src/router/guard.ts`

路由守卫在每次导航前执行，负责：

1. 检查用户是否已登录
2. 验证 Token 有效性
3. 加载用户信息和权限
4. 动态生成可访问的路由和菜单
5. 重定向未授权用户

### 7.2 守卫逻辑流程

```typescript
router.beforeEach(async (to, from) => {
  const accessStore = useAccessStore();
  const authStore = useAuthStore();

  // 1. 白名单检查：基本路由（登录页、404等）直接放行
  if (coreRouteNames.includes(to.name)) {
    return true; // 允许访问
  }

  // 2. Token 检查
  if (!accessStore.accessToken) {
    // 无Token且非公开页面 → 跳转登录页
    if (!to.meta.ignoreAccess) {
      return {
        path: LOGIN_PATH,
        query: { redirect: encodeURIComponent(to.fullPath) },
        replace: true,
      };
    }
    return to; // 公开页面允许访问
  }

  // 3. 权限检查（仅首次访问时执行）
  if (!accessStore.isAccessChecked) {
    try {
      // 获取用户信息
      const userInfo = await authStore.fetchUserInfo();

      if (!userInfo) {
        // 获取失败 → 跳转登录页
        return { path: LOGIN_PATH, replace: true };
      }

      // 根据角色生成动态路由
      const { accessibleMenus, accessibleRoutes } = await generateAccess({
        roles: userInfo.roles ?? [],
        router,
        routes: accessRoutes,
      });

      // 保存到Store
      accessStore.setAccessMenus(accessibleMenus);
      accessStore.setAccessRoutes(accessibleRoutes);
      accessStore.setIsAccessChecked(true);

      // 重定向到目标页面
      return { ...router.resolve(targetPath), replace: true };
    } catch (error) {
      // 出错时清除Token并跳转登录页
      accessStore.setAccessToken(null);
      return { path: LOGIN_PATH, replace: true };
    }
  }

  // 4. 已通过权限检查 → 直接放行
  return true;
});
```

### 7.3 权限数据流

```
Supabase User Metadata
    ↓
getUserInfoApi()
    ↓
userInfo.roles (数组)
    ↓
generateAccess({ roles })
    ↓
根据角色过滤路由配置
    ↓
accessibleMenus (侧边栏菜单)
accessibleRoutes (可访问路由)
    ↓
渲染UI + 路由守卫
```

---

## 8. API 接口列表

### 8.1 认证相关 API

#### `loginApi(params)`

**功能**: 用户登录

**参数**:

```typescript
interface LoginParams {
  email?: string; // 邮箱（可选）
  username?: string; // 用户名（可选，优先级低于email）
  password: string; // 密码（必填）
}
```

**返回值**:

```typescript
{
  accessToken: string; // 访问令牌
}
```

**使用示例**:

```typescript
const result = await loginApi({
  username: 'admin',
  password: '123456',
});
console.log(result.accessToken); // eyJhbGciOiJIUzI1NiIs...
```

---

#### `authRegisterApi(email, password)`

**功能**: 用户注册

**参数**:

- `email`: string - 用户邮箱
- `password`: string - 密码（≥6位）

**返回值**:

```typescript
{
  user: User | null; // 用户对象
  session: Session | null; // 会话对象（可能为null）
  error: ApiError | null; // 错误信息
}
```

---

#### `refreshTokenApi()`

**功能**: 刷新访问令牌

**返回值**:

```typescript
{
  data: string; // 新的access_token
  status: number; // HTTP状态码（200=成功）
}
```

**触发时机**:

- Access Token 即将过期时
- 由 `request.ts` 中的拦截器自动调用

---

#### `logoutApi()`

**功能**: 退出登录

**行为**:

1. 调用 Supabase `signOut()` 清除服务端会话
2. 清除本地所有 Store 状态
3. 清除 localStorage/cookie 中的 token
4. 跳转到登录页

**参数**:

- `redirect`: boolean - 是否携带当前页面路径（默认true）

---

#### `getUserInfoApi()`

**功能**: 获取当前登录用户信息

**返回值**:

```typescript
// 成功时
{
  userId: string;        // Supabase UUID
  username: string;      // 用户名
  realName: string;      // 显示名称
  avatar: string;        // 头像URL
  desc: string;          // 个人简介
  homePath: string;      // 默认首页路径
  token: string;         // 当前access_token
  roles: string[];       // 角色权限列表
}

// 失败时（未登录/会话过期）
null
```

**特性**:

- ✅ 不会抛出异常（返回null）
- ✅ 自动检测未登录状态
- ✅ 从 Supabase User + Session 组装数据

---

#### `getAccessCodesApi()`

**功能**: 获取用户权限码列表

**返回值**: `string[]` - 权限码数组

**数据来源**:

1. `user.app_metadata.roles` （应用级别元数据）
2. `user.user_metadata.roles` （用户自定义元数据）
3. 空数组（无权限时）

---

## 9. 数据流图

### 9.1 完整认证数据流

```
┌─────────────────────────────────────────────────────────────┐
│                        用户界面层                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Login.vue   │  │ Register.vue │  │   其他受保护页面   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
└─────────┼─────────────────┼────────────────────┼────────────┘
          │                 │                    │
          ▼                 ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                      State管理层                            │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              authStore (Pinia)                       │    │
│  │  • authLogin()      • logout()                      │    │
│  │  • fetchUserInfo()  • loginLoading                  │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │              accessStore (Pinia)                     │    │
│  │  • accessToken     • accessCodes                    │    │
│  │  • accessMenus     • accessRoutes                   │    │
│  │  • isAccessChecked • loginExpired                   │    │
│  └────────────────────┬────────────────────────────────┘    │
│                       │                                     │
│  ┌────────────────────▼────────────────────────────────┐    │
│  │               userStore (Pinia)                     │    │
│  │  • userInfo        • permissions                   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                       API 层                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              api/core/auth.ts                        │    │
│  │  • loginApi()        • authLoginApi()               │    │
│  │  • authRegisterApi()• refreshTokenApi()             │    │
│  │  • logoutApi()       • getUserInfoApi()             │    │
│  │  • getAccessCodesApi()                               │    │
│  └────────────────────┬────────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Client                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              lib/supabase.ts                         │    │
│  │  createClient(url, key) → supabase 实例             │    │
│  └────────────────────┬────────────────────────────────┘    │
└─────────────────────────┼───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  Supabase Cloud (BaaS)                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐    │
│  │  Auth 服务   │  │  Database   │  │   Storage        │    │
│  │  • 登录/注册 │  │  • 用户表   │  │   • 头像上传     │    │
│  │  • Token管理 │  │  • 角色表   │  │   • 文件存储     │    │
│  │  • 会话管理  │  │  • 权限表   │  │                  │    │
│  └─────────────┘  └─────────────┘  └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 9.2 Token 生命周期

```
登录成功
    ↓
获取 access_token + refresh_token
    ↓
存储到 accessStore.accessToken
    ↓
每次API请求自动附加到 Header (Bearer Token)
    ↓
┌─────────────────────────────────────┐
│         Token 有效期检查             │
│  ┌──────────────┬──────────────┐    │
│  │   有效       │    即将过期   │    │
│  │              │              │    │
│  ▼              ▼              │    │
│ 正常使用      自动刷新Token     │    │
│              refreshTokenApi() │    │
│              更新accessToken   │    │
│              继续使用           │    │
│                                 │    │
│  ┌──────────┴──────────────┐    │    │
│  │        已过期            │    │    │
│  │                         │    │    │
│  ▼                         │    │    │
│ 清除Token                  │    │    │
│ 跳转登录页                 │    │    │
│ 要求重新登录               │    │    │
└─────────────────────────────┘    │    │
                                   │    │
└───────────────────────────────────┘────┘
```

---

## 10. 错误处理机制

### 10.1 分层错误处理策略

本项目采用**三层错误处理**机制：

#### 第一层：API 层（auth.ts）

```typescript
// 示例：登录错误处理
if (error) {
  let errorMessage = error.message;

  // 映射为友好提示
  if (error.message?.includes('Invalid login credentials')) {
    errorMessage = '邮箱或密码错误';
  } else if (error.message?.includes('Email not confirmed')) {
    errorMessage = '请先验证您的邮箱';
  }

  throw new Error(errorMessage); // 向上抛出
}
```

**特点**：

- 将英文技术错误转为中文用户友好提示
- 不直接显示给用户，而是向上抛出

#### 第二层：Store 层（auth.ts store）

```typescript
try {
  const { accessToken } = await loginApi(params);
  // ... 业务逻辑
} finally {
  loginLoading.value = false; // 确保关闭加载状态
}
```

**特点**：

- 使用 try-finally 确保资源释放
- 不在此层处理具体错误（交给UI层）

#### 第三层：UI 层（组件/全局拦截器）

```typescript
// request.ts 中的响应拦截器
client.addResponseInterceptor(
  errorMessageResponseInterceptor((msg: string, error) => {
    ElMessage.error(msg); // Element Plus 全局提示
  }),
);
```

**特点**：

- 统一的错误展示方式
- 用户看到的是友好的中文提示

### 10.2 常见错误及解决方案

| 错误信息                    | 原因           | 解决方案                     |
| --------------------------- | -------------- | ---------------------------- |
| `Invalid login credentials` | 邮箱或密码错误 | 检查输入是否正确，区分大小写 |
| `Email not confirmed`       | 未验证邮箱     | 查收验证邮件并点击链接       |
| `missing email or phone`    | 缺少邮箱参数   | 检查表单字段映射             |
| `Auth session missing!`     | 会话过期或无效 | 重新登录                     |
| `400 Bad Request`           | 参数格式错误   | 检查字段类型和必填项         |
| `User already registered`   | 邮箱已存在     | 提示用户直接登录             |

### 10.3 特殊场景处理

#### 场景1：用户未登录但访问受保护页面

```typescript
// guard.ts 中的处理
if (!accessStore.accessToken) {
  return {
    path: LOGIN_PATH,
    query: { redirect: encodeURIComponent(to.fullPath) }, // 保存原始路径
    replace: true,
  };
}

// 登录后自动跳回
await router.push(decodeURIComponent(redirect));
```

#### 场景2：Token 过期但用户还在操作

```typescript
// request.ts 中的拦截器
async function doReAuthenticate() {
  const accessStore = useAccessStore();
  const authStore = useAuthStore();

  accessStore.setAccessToken(null);

  if (preferences.app.loginExpiredMode === 'modal') {
    // 弹窗模式：显示登录弹窗
    accessStore.setLoginExpired(true);
  } else {
    // 页面模式：跳转到登录页
    await authStore.logout();
  }
}
```

#### 场景3：网络中断导致请求失败

```typescript
// 所有API调用都包裹在 try-catch 中
try {
  const result = await someApi();
} catch (error) {
  console.error('操作失败:', error);
  // 显示重试按钮或友好的离线提示
}
```

---

## 11. 使用示例

### 11.1 基础登录示例

```vue
<script setup lang="ts">
import { useAuthStore } from '#/store';

const authStore = useAuthStore();

const handleLogin = async () => {
  try {
    const { userInfo } = await authStore.authLogin({
      username: 'admin',
      password: '123456',
    });

    if (userInfo) {
      console.log('登录成功！欢迎', userInfo.realName);
    }
  } catch (error) {
    console.error('登录失败:', error);
    alert(error.message); // 已经是中文提示
  }
};
</script>

<template>
  <button @click="handleLogin">登录</button>
</template>
```

### 11.2 注册示例

```vue
<script setup lang="ts">
import { authRegisterApi } from '#/api/core/auth';

const handleRegister = async () => {
  const email = 'test@example.com';
  const password = 'securepassword123';

  const result = await authRegisterApi(email, password);

  if (result.error) {
    alert(`注册失败：${result.error.message}`);
    return;
  }

  if (result.session) {
    alert('注册并自动登录成功！');
    // 可以直接跳转到首页
  } else {
    alert('注册成功！请查收验证邮件。');
  }
};
</script>
```

### 11.3 获取当前用户信息

```typescript
import { getUserInfoApi } from '#/api/core/auth';

// 在任何组件或函数中使用
const userInfo = await getUserInfoApi();

if (userInfo) {
  console.log('当前用户:', {
    id: userInfo.userId,
    name: userInfo.realName,
    email: userInfo.username,
    roles: userInfo.roles,
    avatar: userInfo.avatar,
  });
} else {
  console.log('用户未登录');
}
```

### 11.4 检查登录状态

```typescript
import { useAccessStore } from '@vben/stores';

const accessStore = useAccessStore();

if (accessStore.accessToken) {
  console.log('用户已登录');
  console.log('Token:', accessStore.accessToken);
} else {
  console.log('用户未登录');
}
```

### 11.5 手动登出

```typescript
import { useAuthStore } from '#/store';

const authStore = useAuthStore();

// 方式1：登出并跳转到登录页（默认）
await authStore.logout(); // redirect=true

// 方式2：静默登出（不跳转）
await authStore.logout(false);
```

### 11.6 编程式导航（需登录）

```typescript
import { useRouter } from 'vue-router';

const router = useRouter();

// 导航到需要登录的页面
// 如果未登录，会被自动拦截到登录页，并在登录后跳回这里
router.push('/settings/profile');

// URL 会变成：/auth/login?redirect=/settings/profile
```

---

## 12. 常见问题与解决方案

### Q1: 如何切换到手机号登录？

**A**: 当前版本只支持邮箱登录。如需手机号登录：

```typescript
// 修改 loginApi 函数
export async function loginApi(params: LoginParams) {
  let result;

  if (params.phone) {
    // 手机号登录
    ({ data: result, error } = await supabase.auth.signInWithOtp({
      phone: params.phone,
    }));
  } else {
    // 邮箱登录（现有逻辑）
    ({ data: result, error } = await supabase.auth.signInWithPassword({
      email: params.email || params.username,
      password: params.password,
    }));
  }

  // ...
}
```

⚠️ **注意**：需要在 Supabase Dashboard 开启 Phone Auth 提供商。

---

### Q2: 如何实现"记住我"功能？

**A**: Supabase 默认会持久化 Session，但你可以显式控制：

```typescript
// lib/supabase.ts
export const supabase = createClient(url, key, {
  auth: {
    storage: localStorage, // 使用localStorage持久化
    autoRefreshToken: true, // 自动刷新token
    persistSession: true, // 持久化session
    detectSessionInUrl: true, // 支持URL中的session（用于邮箱验证回调）
  },
});
```

**前端表单添加复选框**：

```vue
<VbenCheckbox v-model="rememberMe">记住我</VbenCheckbox>

<script setup>
const rememberMe = ref(true);

const handleLogin = async () => {
  await authStore.authLogin(formData);

  if (!rememberMe.value) {
    // 不记住我：浏览器关闭后清除
    window.addEventListener(
      'beforeunload',
      () => {
        authStore.logout(false);
      },
      { once: true },
    );
  }
};
</script>
```

---

### Q3: 如何对接第三方登录（Google/GitHub）？

**A**: 在 Supabase Dashboard 配置后，前端只需几行代码：

```typescript
// Google 登录示例
const handleGoogleLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard/analytics`,
    },
  });

  if (error) {
    console.error('OAuth登录失败:', error);
  }
};

// GitHub 登录
const handleGithubLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
  });
};

// 微信登录（需要额外配置）
const handleWechatLogin = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'wechat', // 需要在Dashboard配置
  });
};
```

**配置步骤**：

1. Supabase Dashboard → Authentication → Providers
2. 启用对应的 Provider 并填写 Client ID/Secret
3. 设置 Redirect URL 为你的应用地址

---

### Q4: 如何修改密码或找回密码？

**A**: 使用 Supabase 的内置方法：

```typescript
// 找回密码（发送重置邮件）
const handleForgotPassword = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) {
    alert(`发送失败：${error.message}`);
  } else {
    alert('密码重置邮件已发送，请查收！');
  }
};

// 修改密码（需要已登录）
const handleChangePassword = async (
  currentPassword: string,
  newPassword: string,
) => {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    alert(`修改失败：${error.message}`);
  } else {
    alert('密码修改成功！');
  }
};
```

---

### Q5: 如何实现多租户或组织隔离？

**A**: 利用 Supabase 的 Row Level Security (RLS)：

```typescript
// 1. 注册时记录组织ID
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      organization_id: 'org_123', // 自定义metadata
      role: 'member',
    },
  },
});

// 2. 查询时自动过滤
const { data: projects } = await supabase
  .from('projects')
  .select('*')
  .eq('organization_id', user.user_metadata.organization_id);
// RLS策略会自动确保只能看到自己组织的数据
```

**Supabase SQL 策略示例**：

```sql
-- 启用RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 创建策略：用户只能查看自己组织的数据
CREATE POLICY "Users can view own organization projects"
ON projects FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM auth.users
    WHERE user_metadata->>'organization_id' = projects.organization_id
  )
);
```

---

### Q6: 如何优化首屏加载速度？

**A**: 采用渐进式加载策略：

```typescript
// 1. 路由懒加载（已默认启用）
const Analytics = () => import('#/views/dashboard/analytics/index.vue');

// 2. 用户信息按需加载
// 不要在App.vue中立即获取用户信息
// 而是在路由守卫中按需获取（当前实现）

// 3. Token本地缓存
// Supabase客户端默认会缓存session到localStorage
// 下次打开应用无需网络请求即可读取

// 4. 预加载关键资源
// 在登录成功后预加载下一页需要的资源
const prefetchResources = async () => {
  // 预加载用户头像
  new Image().src = userInfo.avatar;

  // 预加载菜单图标
  import('#/icons'); // 触发webpack chunk加载
};

// 5. Service Worker离线缓存（PWA）
// 可考虑添加Workbox进行静态资源缓存
```

---

### Q7: 如何处理并发登录限制？

**A**: 使用 Supabase 的 Session 管理：

```typescript
// 方案1：单设备登录（后端强制踢出旧session）
// 在Supabase Database Trigger中实现：
//
// CREATE OR REPLACE FUNCTION handle_new_session()
// RETURNS TRIGGER AS $$
// BEGIN
//   -- 删除该用户的所有其他session
//   DELETE FROM auth.sessions
//   WHERE user_id = NEW.user_id
//     AND id != NEW.id;
//   RETURN NEW;
// END;
// $$ LANGUAGE plpgsql;
//
// CREATE TRIGGER on_auth_session_created
// AFTER INSERT ON auth.sessions
// FOR EACH ROW EXECUTE FUNCTION handle_new_session();

// 方案2：前端检测被踢出
// 监听auth状态变化
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && !manualLogout) {
    alert('您的账号在其他设备登录，您已被强制下线');
    router.push('/auth/login');
  }
});

// 方案3：多设备在线列表（高级）
// 维护一个sessions表记录活跃设备
```

---

### Q8: 如何添加登录日志和审计？

**A**: 结合 Supabase Database + Edge Functions：

```typescript
// 方法1：前端简单日志
const logLoginAttempt = async (success: boolean, reason?: string) => {
  await supabase.from('login_logs').insert({
    user_id: userId,
    success,
    ip_address: await getClientIP(),  // 需要后端配合
    user_agent: navigator.userAgent,
    timestamp: new Date().toISOString(),
    reason,
  });
};

// 在loginApi中调用
try {
  const result = await supabase.auth.signInWithPassword({...});
  await logLoginAttempt(true);
  return result;
} catch (error) {
  await logLoginAttempt(false, error.message);
  throw error;
}

// 方法2：使用Supabase Edge Functions（推荐用于生产环境）
// 在Edge Function中记录详细日志
```

---

## 📚 扩展阅读

- [Supabase Auth 文档](https://supabase.com/docs/guides/auth)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
- [Pinia 状态管理](https://pinia.vuejs.org/)
- [Vue Router 导航守卫](https://router.vuejs.org/zh/guide/advanced/navigation-guards.html)
- [Element Plus 表单验证](https://element-plus.org/zh/component/form.html)

---

## 🎯 总结

本文档详细介绍了基于 **Vue 3 + Supabase** 的完整登录注册系统实现，包括：

✅ **完整的代码示例** - 可直接复制使用  
✅ **清晰的架构图** - 理解数据流向  
✅ **详细的错误处理** - 生产级别的健壮性  
✅ **丰富的扩展指南** - 满足业务定制需求

### 核心优势

1. **安全性** - Supabase 企业级安全保障
2. **开发效率** - 开箱即用的认证功能
3. **用户体验** - 流畅的交互和友好的提示
4. **可维护性** - 清晰的分层架构
5. **可扩展性** - 易于集成第三方服务和自定义逻辑

---

**文档版本**: v1.0  
**最后更新**: 2026-05-26  
**适用项目**: Vue Vben Admin (web-ele)  
**作者**: AI Assistant

---

💡 **提示**: 如有疑问或建议，欢迎查阅源码或提出 Issue！
