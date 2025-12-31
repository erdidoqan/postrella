/**
 * Cloudinary Image Service
 * URL-based image transformation for featured images
 */

export interface CloudinaryConfig {
  cloudName: string;
}

export interface ImageOverlayOptions {
  text: string;
  gradientType: GradientType;
  width?: number;
  height?: number;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
}

export type GradientType = 'purple' | 'blue' | 'green' | 'orange' | 'dark';

// Gradient definitions with start and end colors
const GRADIENTS: Record<GradientType, { start: string; end: string }> = {
  purple: { start: '667eea', end: '764ba2' },
  blue: { start: '4facfe', end: '00f2fe' },
  green: { start: '11998e', end: '38ef7d' },
  orange: { start: 'f093fb', end: 'f5576c' },
  dark: { start: '434343', end: '000000' },
};

// Keyword to gradient mapping
const KEYWORD_GRADIENT_MAP: Record<string, GradientType> = {
  // Celebrations
  wishes: 'purple',
  birthday: 'purple',
  celebration: 'purple',
  party: 'purple',
  anniversary: 'purple',
  wedding: 'purple',
  christmas: 'purple',
  'new year': 'purple',
  valentine: 'purple',
  
  // Technology
  tech: 'blue',
  ai: 'blue',
  software: 'blue',
  coding: 'blue',
  programming: 'blue',
  digital: 'blue',
  computer: 'blue',
  internet: 'blue',
  
  // Nature/Health
  health: 'green',
  nature: 'green',
  eco: 'green',
  fitness: 'green',
  wellness: 'green',
  organic: 'green',
  sustainable: 'green',
  
  // Business/Finance
  business: 'orange',
  money: 'orange',
  finance: 'orange',
  investment: 'orange',
  startup: 'orange',
  entrepreneur: 'orange',
  success: 'orange',
};

/**
 * Determine gradient type based on keyword
 */
export function getGradientForKeyword(keyword: string): GradientType {
  const lowerKeyword = keyword.toLowerCase();
  
  for (const [key, gradient] of Object.entries(KEYWORD_GRADIENT_MAP)) {
    if (lowerKeyword.includes(key)) {
      return gradient;
    }
  }
  
  return 'dark'; // Default
}

/**
 * Encode text for Cloudinary URL
 * Cloudinary uses special encoding for text overlays
 */
function encodeCloudinaryText(text: string): string {
  // Remove problematic characters first
  let cleaned = text
    .replace(/[?!.,:;()[\]{}]/g, '') // Remove punctuation that breaks URLs
    .replace(/[^\w\s'-]/g, '') // Keep only word chars, spaces, hyphens, apostrophes
    .trim();
  
  // Limit length to prevent URL issues
  const words = cleaned.split(/\s+/);
  if (words.length > 8) {
    cleaned = words.slice(0, 8).join(' ');
  }
  
  // Encode for URL
  return cleaned
    .replace(/ /g, '%20')
    .replace(/'/g, '%27');
}

/**
 * Build Cloudinary URL with gradient background and text overlay
 */
export function buildFeaturedImageUrl(
  config: CloudinaryConfig,
  options: ImageOverlayOptions
): string {
  const {
    text,
    gradientType,
    width = 1200,
    height = 630,
    fontSize = 48,
    fontFamily = 'Montserrat',
    textColor = 'white',
  } = options;

  const gradient = GRADIENTS[gradientType];
  const encodedText = encodeCloudinaryText(text);
  
  // Build transformation chain
  const transformations = [
    // Base gradient background using Cloudinary's color overlay
    `w_${width}`,
    `h_${height}`,
    `c_fill`,
    `b_rgb:${gradient.start}`,
    // Add gradient effect
    `e_gradient_fade`,
    `e_tint:100:${gradient.start}:0p:${gradient.end}:100p`,
  ].join(',');

  // Text overlay transformation
  const textOverlay = [
    `l_text:${fontFamily}_${fontSize}_bold_center:${encodedText}`,
    `co_${textColor}`,
    `g_center`,
    `w_${Math.floor(width * 0.8)}`, // 80% of width for text wrapping
    `c_fit`,
  ].join(',');

  // Use a placeholder image as base (1x1 pixel)
  // Cloudinary will apply transformations on top
  const baseImage = 'sample'; // Cloudinary's sample image

  return `https://res.cloudinary.com/${config.cloudName}/image/upload/${transformations}/${textOverlay}/${baseImage}`;
}

/**
 * Alternative: Build URL using uploaded gradient images
 * This requires gradient images to be pre-uploaded to Cloudinary
 */
export function buildFeaturedImageUrlWithUploadedGradient(
  config: CloudinaryConfig,
  gradientPublicId: string,
  text: string,
  options: Partial<ImageOverlayOptions> = {}
): string {
  const {
    width = 1200,
    height = 630,
    fontSize = 48,
    fontFamily = 'Montserrat',
    textColor = 'white',
  } = options;

  const encodedText = encodeCloudinaryText(text);

  // Transformations
  const transformations = [
    `w_${width}`,
    `h_${height}`,
    `c_fill`,
  ].join(',');

  // Text overlay
  const textOverlay = [
    `l_text:${fontFamily}_${fontSize}_bold_center:${encodedText}`,
    `co_${textColor}`,
    `g_center`,
    `w_${Math.floor(width * 0.8)}`,
    `c_fit`,
  ].join(',');

  return `https://res.cloudinary.com/${config.cloudName}/image/upload/${transformations}/${textOverlay}/${gradientPublicId}`;
}

/**
 * Simple gradient image URL builder
 * Creates a solid gradient background with text
 */
export function buildSimpleGradientImageUrl(
  cloudName: string,
  text: string,
  keyword: string
): string {
  const gradientType = getGradientForKeyword(keyword);
  const gradient = GRADIENTS[gradientType];
  const encodedText = encodeCloudinaryText(text);

  // Use overlay approach with sample image
  const url = [
    `https://res.cloudinary.com/${cloudName}/image/upload`,
    // Base dimensions and background
    `w_1200,h_630,c_fill,b_rgb:${gradient.start}`,
    // Gradient tint effect
    `e_tint:100:${gradient.start}:0p:${gradient.end}:100p`,
    // Text overlay
    `l_text:Montserrat_52_bold_center:${encodedText},co_white,g_center,w_960,c_fit`,
    // Shadow for better readability
    `e_shadow:40`,
    // Base image
    'sample',
  ].join('/');

  return url;
}

export class CloudinaryService {
  private cloudName: string;

  constructor(config: CloudinaryConfig) {
    this.cloudName = config.cloudName;
  }

  /**
   * Generate featured image URL for a keyword and quote
   */
  generateFeaturedImage(keyword: string, quote: string): string {
    return buildSimpleGradientImageUrl(this.cloudName, quote, keyword);
  }

  /**
   * Get gradient type for a keyword
   */
  getGradientType(keyword: string): GradientType {
    return getGradientForKeyword(keyword);
  }
}

