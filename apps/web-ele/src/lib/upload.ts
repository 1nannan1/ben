/**
 * 图床上传工具模块
 * 基于 img.scdn.io 免费图床 API
 *
 * 文档地址: https://img.scdn.io/api_docs.php
 */

/**
 * 图床上传响应数据类型
 */
export interface ImageUploadResult {
  /** 是否上传成功 */
  success: boolean;
  /** 图片公开访问 URL */
  url: string;
  /** 详细数据（可选） */
  data?: {
    /** 压缩后文件大小（字节） */
    compressed_size: number;
    /** 压缩率百分比 */
    compression_ratio: number;
    /** 服务端文件名 */
    filename: string;
    /** 原始文件大小（字节） */
    original_size: number;
  };
  /** 错误信息或提示消息 */
  message?: string;
}

/** API 端点地址 */
const UPLOAD_API_URL = 'https://img.scdn.io/api/v1.php';

/** 支持的图片 MIME 类型（使用 Set 提升查找性能） */
const ALLOWED_IMAGE_TYPES = new Set([
  'image/bmp',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
]);

/** 最大文件大小: 10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * 上传图片到免费图床 (img.scdn.io)
 *
 * @param file - 要上传的图片 File 对象
 * @param options - 可选配置项
 * @param options.cdnDomain - CDN 域名，默认系统选择
 * @param options.outputFormat - 输出格式，默认 auto（推荐 webp）
 * @returns 上传结果，包含图片 URL
 * @throws 上传失败时抛出错误
 *
 * @example
 * // 基本用法
 * const result = await uploadImage(file);
 * console.log(result.url); // https://img.scdn.io/i/xxx.webp
 *
 * @example
 * // 指定输出格式为 WebP
 * const result = await uploadImage(file, { outputFormat: 'webp' });
 */
export async function uploadImage(
  file: File,
  options?: {
    /** CDN 域名 */
    cdnDomain?: string;
    /** 输出格式：auto / gif / jpeg / png / webp / webp_animated */
    outputFormat?: 'auto' | 'gif' | 'jpeg' | 'png' | 'webp' | 'webp_animated';
  },
): Promise<ImageUploadResult> {
  // 校验文件类型
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error(
      `不支持的图片格式: ${file.type}，仅支持 JPG/PNG/WebP/BMP/TIFF/GIF`,
    );
  }

  // 校验文件大小
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `图片大小超出限制 (${(file.size / 1024 / 1024).toFixed(2)}MB > 10MB)`,
    );
  }

  // 构建 FormData
  const formData = new FormData();
  formData.append('image', file);

  // 可选参数
  if (options?.cdnDomain) {
    formData.append('cdn_domain', options.cdnDomain);
  }
  if (options?.outputFormat) {
    formData.append('outputFormat', options.outputFormat);
  }

  // 发送 POST 请求
  const response = await fetch(UPLOAD_API_URL, {
    method: 'POST',
    body: formData,
  });

  // 解析响应
  const result: ImageUploadResult = await response.json();

  if (!result.success) {
    throw new Error(result.message || `上传失败 (HTTP ${response.status})`);
  }

  return result;
}
