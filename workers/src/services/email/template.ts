/**
 * Email Template Service
 * Newsletter email template oluşturma servisi
 */

export interface PostData {
  title: string;
  url: string;
  published_at: number;
  featured_image_url?: string | null;
}

export interface NewsletterTemplateData {
  firstName?: string | null;
  posts: PostData[];
  unsubscribeUrl: string;
  siteName?: string;
}

/**
 * Unix timestamp'i okunabilir tarihe çevirir (English format)
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

/**
 * Newsletter HTML template'i oluşturur
 */
export function generateNewsletterTemplate(data: NewsletterTemplateData): string {
  const { firstName, posts, unsubscribeUrl, siteName = 'Wishesbirds' } = data;

  const greeting = firstName ? `Hello ${firstName}` : 'Hello';

  const postsHtml = posts.length > 0
    ? posts
        .map(
          (post, index) => {
            const imageHtml = post.featured_image_url
              ? `<td style="width: 200px; padding-right: 0; vertical-align: top;">
                  <a href="${post.url}" style="display: block; text-decoration: none;">
                    <img src="${post.featured_image_url}" alt="${escapeHtml(post.title)}" style="width: 100%; max-width: 200px; height: 140px; object-fit: cover; border-radius: 8px; display: block; border: 1px solid #e5e7eb;" />
                  </a>
                </td>`
              : '';
            
            const hasImage = !!post.featured_image_url;
            const contentWidth = hasImage ? 'calc(100% - 220px)' : '100%';
            
            return `
      <tr>
        <td style="padding: ${index === 0 ? '0' : '32px'} 0 ${index === posts.length - 1 ? '0' : '32px'}; border-bottom: ${index === posts.length - 1 ? 'none' : '1px solid #f0f0f0'};">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              ${imageHtml}
              <td style="vertical-align: top; padding-left: ${hasImage ? '24px' : '0'}; width: ${contentWidth};">
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding-bottom: 8px;">
                      <a href="${post.url}" style="color: #1a1a1a; text-decoration: none; font-weight: 600; font-size: 20px; line-height: 1.3; display: block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                        ${escapeHtml(post.title)}
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-bottom: 16px;">
                      <span style="color: #6b7280; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                        ${formatDate(post.published_at)}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <a href="${post.url}" style="display: inline-block; padding: 10px 20px; background-color: #1a1a1a; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 14px; font-weight: 500; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                        Read Article →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    `;
          }
        )
        .join('')
    : `
      <tr>
        <td style="padding: 48px 0; text-align: center;">
          <p style="color: #6b7280; font-size: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">No published content available yet.</p>
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${siteName} - Latest Updates</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td, a { font-family: Arial, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
  <!-- Preheader Text -->
  <div style="display: none; font-size: 1px; color: #f5f5f5; line-height: 1px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${siteName} - Your weekly newsletter with the latest articles
  </div>
  
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <!-- Main Container -->
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);">
          
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 32px; text-align: center; background-color: #ffffff; border-bottom: 1px solid #f0f0f0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #1a1a1a; letter-spacing: -0.5px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                ${escapeHtml(siteName)}
              </h1>
              <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280; font-weight: 400; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                Weekly Newsletter
              </p>
            </td>
          </tr>
          
          <!-- Greeting Section -->
          <tr>
            <td style="padding: 40px 40px 24px; background-color: #ffffff;">
              <h2 style="margin: 0; font-size: 24px; font-weight: 600; color: #1a1a1a; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                ${escapeHtml(greeting)},
              </h2>
              <p style="margin: 16px 0 0; font-size: 16px; color: #4b5563; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                We've curated our latest articles just for you. Enjoy reading!
              </p>
            </td>
          </tr>
          
          <!-- Posts List -->
          <tr>
            <td style="padding: 0 40px 40px; background-color: #ffffff;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                ${postsHtml}
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px; background-color: #fafafa; border-top: 1px solid #f0f0f0;">
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding-bottom: 20px; text-align: center;">
                    <p style="margin: 0; font-size: 14px; color: #6b7280; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      You're receiving this email because you subscribed to our newsletter.
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom: 20px; text-align: center;">
                    <a href="${unsubscribeUrl}" style="color: #6b7280; text-decoration: underline; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      Unsubscribe
                    </a>
                    <span style="color: #d1d5db; margin: 0 12px;">•</span>
                    <a href="${posts[0]?.url?.split('/').slice(0, 3).join('/') || '#'}" style="color: #6b7280; text-decoration: underline; font-size: 14px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      Visit Website
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top: 20px; border-top: 1px solid #f0f0f0; text-align: center;">
                    <p style="margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                      © ${new Date().getFullYear()} ${escapeHtml(siteName)}. All rights reserved.<br>
                      <span style="color: #d1d5db;">This email was sent to you from ${escapeHtml(siteName)}</span>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * HTML özel karakterlerini escape eder
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Plain text versiyonu oluşturur (fallback için)
 */
export function generateNewsletterText(data: NewsletterTemplateData): string {
  const { firstName, posts, unsubscribeUrl, siteName = 'Wishesbirds' } = data;

  const greeting = firstName ? `Hello ${firstName}` : 'Hello';

  const postsText = posts.length > 0
    ? posts
        .map((post, index) => `${index + 1}. ${post.title}\n   ${post.url}\n   ${formatDate(post.published_at)}\n`)
        .join('\n')
    : 'No published content available yet.';

  return `${siteName} - Weekly Newsletter

${greeting},

We've curated our latest articles just for you. Enjoy reading!

${postsText}

---
You're receiving this email because you subscribed to our newsletter.

Unsubscribe: ${unsubscribeUrl}
Visit Website: ${posts[0]?.url?.split('/').slice(0, 3).join('/') || '#'}

© ${new Date().getFullYear()} ${siteName}. All rights reserved.
This email was sent to you from ${siteName}
`;
}
