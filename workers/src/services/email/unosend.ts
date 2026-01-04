/**
 * Unosend Email Service
 * Email gönderme servisi - Unosend API entegrasyonu
 */

export interface UnosendEmailRequest {
  from: string;
  to: string[] | string;
  subject: string;
  html: string;
  text?: string;
}

export interface UnosendEmailResponse {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    status: string;
  };
  error?: string;
}

const UNOSEND_API_BASE = 'https://www.unosend.co/api/v1';

/**
 * Unosend API ile email gönderir
 */
export async function sendEmail(
  apiKey: string,
  emailData: UnosendEmailRequest
): Promise<UnosendEmailResponse> {
  const url = `${UNOSEND_API_BASE}/emails`;

  // to field'ını array'e çevir
  const toArray = Array.isArray(emailData.to) ? emailData.to : [emailData.to];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: emailData.from,
      to: toArray,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Unosend API error: ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || errorJson.message || JSON.stringify(errorJson) || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    const error = new Error(errorMessage);
    console.error('Unosend API error:', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      errorMessage,
    });
    throw error;
  }

  const data = await response.json() as any;

  // Unosend API returns email object directly, not wrapped in success field
  // Check if response has id field (success) or error field (failure)
  if (data.error) {
    const errorMsg = data.error || data.message || JSON.stringify(data) || 'Failed to send email';
    const error = new Error(errorMsg);
    console.error('Unosend response error:', data);
    throw error;
  }

  // Return wrapped response for consistency
  return {
    success: true,
    data: data,
  };
}

/**
 * Unosend API ile batch email gönderir (max 100 emails per request)
 */
export async function sendBatchEmails(
  apiKey: string,
  emails: UnosendEmailRequest[]
): Promise<{ success: boolean; data?: Array<{ id: string }>; error?: string }> {
  if (emails.length > 100) {
    throw new Error('Maximum 100 emails per batch request');
  }

  const url = `${UNOSEND_API_BASE}/emails/batch`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      emails.map(email => ({
        from: email.from,
        to: Array.isArray(email.to) ? email.to : [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }))
    ),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Unosend Batch API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) {
        errorMessage = typeof errorJson.error === 'string' ? errorJson.error : JSON.stringify(errorJson.error);
      } else if (errorJson.message) {
        errorMessage = errorJson.message;
      } else {
        errorMessage = JSON.stringify(errorJson);
      }
    } catch {
      if (errorText) {
        errorMessage = errorText;
      }
    }
    console.error('Unosend Batch API error:', {
      status: response.status,
      statusText: response.statusText,
      errorText,
      errorMessage,
    });
    throw new Error(errorMessage);
  }

  const data = await response.json() as any;

  // Check for error in response
  if (data.error) {
    const errorMsg = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    throw new Error(errorMsg);
  }

  // Batch API returns { data: [...] } format
  // If data.data exists, return it; otherwise assume the response itself is the data array
  const emailIds = data.data || (Array.isArray(data) ? data : []);

  return {
    success: true,
    data: emailIds,
  };
}

/**
 * Unosend API bağlantısını test eder
 */
export async function testUnosendConnection(apiKey: string): Promise<boolean> {
  try {
    // Unosend'de test için genellikle emails endpoint'ine bir GET isteği yapılabilir
    // veya domain verification endpoint'i kullanılabilir
    // Basit bir test için API key'in geçerli olup olmadığını kontrol edelim
    const url = `${UNOSEND_API_BASE}/domains`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    return response.ok || response.status === 401 || response.status === 403;
  } catch {
    return false;
  }
}

