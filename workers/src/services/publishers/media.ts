/**
 * CMS Media API Service
 * Creates media records in CMS from external URLs (e.g., Cloudinary)
 * Uses POST /api/v1/media?site_id=:site_id endpoint
 */

export interface MediaUploadConfig {
  apiKey: string;
  siteId: string;
}

export interface MediaUploadData {
  url: string; // Required - External image URL (e.g., Cloudinary)
  filename?: string; // Optional - Auto-extracted from URL if not provided
  original_filename?: string; // Optional - Auto-extracted from URL if not provided
  mime_type?: string; // Optional - Auto-detected from URL if not provided
  file_size?: number; // Optional - Default: 0
  alt_text?: string;
  caption?: string;
  width?: number;
  height?: number;
}

export interface MediaUploadResult {
  success: boolean;
  mediaId?: number;
  url?: string;
  error?: string;
}

interface MediaApiResponse {
  success: boolean;
  data?: {
    id: number;
    site_id: number;
    filename: string;
    original_filename: string;
    mime_type: string;
    file_size: number;
    url: string;
    alt_text: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    created_at: number;
    updated_at: number;
  };
  error?: string;
}

const MEDIA_API_BASE = 'https://cms.digitexa.com/api/v1';

/**
 * Create a media record in CMS from an external URL
 * This registers the URL in CMS media library without uploading to R2
 */
export async function uploadMediaToCms(
  config: MediaUploadConfig,
  data: MediaUploadData
): Promise<MediaUploadResult> {
  try {
    const url = `${MEDIA_API_BASE}/media?site_id=${config.siteId}`;

    // Build request body - only url is required, others are optional
    const requestBody: Record<string, any> = {
      url: data.url,
    };

    if (data.filename) requestBody.filename = data.filename;
    if (data.original_filename) requestBody.original_filename = data.original_filename;
    if (data.mime_type) requestBody.mime_type = data.mime_type;
    if (data.file_size !== undefined) requestBody.file_size = data.file_size;
    if (data.alt_text) requestBody.alt_text = data.alt_text;
    if (data.caption) requestBody.caption = data.caption;
    if (data.width) requestBody.width = data.width;
    if (data.height) requestBody.height = data.height;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CMS Media API error: ${response.status} - ${errorText}`);
      return {
        success: false,
        error: `CMS Media API error: ${response.status} - ${errorText}`,
      };
    }

    const result = await response.json() as MediaApiResponse;

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to create media record',
      };
    }

    console.log(`Media record created in CMS: ID ${result.data.id}, URL: ${result.data.url.substring(0, 80)}...`);

    return {
      success: true,
      mediaId: result.data.id,
      url: result.data.url, // Return the URL from CMS response
    };
  } catch (error) {
    console.error('Media upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error uploading media',
    };
  }
}

/**
 * Generate a slug-friendly filename from title
 */
export function generateMediaFilename(title: string, extension: string = 'png'): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
  
  const timestamp = Date.now();
  return `featured-${slug}-${timestamp}.${extension}`;
}

/**
 * Media Service class for easier usage
 */
export class MediaService {
  private config: MediaUploadConfig;

  constructor(config: MediaUploadConfig) {
    this.config = config;
  }

  /**
   * Upload a featured image URL to CMS
   * Creates a media record in CMS from Cloudinary URL
   */
  async uploadFeaturedImage(
    imageUrl: string,
    title: string,
    keyword: string
  ): Promise<MediaUploadResult> {
    const filename = generateMediaFilename(title);

    return uploadMediaToCms(this.config, {
      url: imageUrl, // Required - Cloudinary URL
      filename: filename, // Optional - CMS will auto-extract if not provided
      original_filename: `${title}.png`, // Optional
      mime_type: 'image/png', // Optional - CMS will auto-detect if not provided
      file_size: 0, // Optional - Default: 0 for external URLs
      alt_text: `Featured image for ${keyword}`,
      caption: title,
      width: 1200,
      height: 630,
    });
  }
}

