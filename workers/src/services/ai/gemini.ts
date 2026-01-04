/**
 * Google Gemini AI Service
 */

export interface GeminiConfig {
  apiKey: string;
  model?: string;
}

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiResponse {
  candidates?: {
    content?: {
      parts?: { text?: string }[];
    };
    finishReason?: string;
  }[];
  error?: {
    message: string;
    code: number;
  };
}

export interface ContentGenerationResult {
  title: string;
  body: string;
  metadata: Record<string, string | number[]>;
  suggested_category?: string;
  suggested_tags?: string[];
  selected_author_id?: number;
}

export interface ContentStrategy {
  intent: string;
  angle: string;
  audience: string;
  tone: string;
  seo_keywords: string[];
  seo_title: string;
  seo_description: string;
  suggested_title: string;
  slug: string;
  content_outline: string[];
}

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export class GeminiService {
  private apiKey: string;
  private model: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gemini-2.0-flash';
  }

  async generateContent(prompt: string): Promise<string> {
    const url = `${GEMINI_API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json() as GeminiResponse;

    if (data.error) {
      throw new Error(`Gemini API error: ${data.error.message}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error('No content generated');
    }

    return text;
  }

  async getContentStrategy(keyword: string): Promise<ContentStrategy> {
    const prompt = `You are an SEO content strategist. Analyze the keyword "${keyword}" and provide a content strategy.

Your analysis should be thorough and actionable. Consider:
- What is the user's search intent?
- What angle would make this content stand out?
- Who is the target audience?
- What tone would resonate best?

Output format (use exactly these markers, respond in English only):
---INTENT---
[What is the user looking for when searching this keyword? 1-2 sentences]
---ANGLE---
[What unique approach or perspective should the content take? 1-2 sentences]
---AUDIENCE---
[Who is the target reader? Demographics, interests, needs. 1-2 sentences]
---TONE---
[What tone should the content have? e.g., professional, friendly, authoritative, casual]
---SEO_KEYWORDS---
[Comma-separated list of 5-10 related keywords and long-tail variations]
---SEO_TITLE---
[An optimized meta title for search engines, 50-60 characters max]
---SEO_DESCRIPTION---
[A compelling meta description for search engines, 150-160 characters]
---SUGGESTED_TITLE---
[A short, punchy headline - MAXIMUM 60 characters, 6-10 words. Be concise!]
---SLUG---
[URL-friendly slug - 3-5 words only, lowercase, hyphens between words, max 40 characters]
---CONTENT_OUTLINE---
[Bullet points for the main sections, each on a new line starting with -]`;

    const response = await this.generateContent(prompt);
    return this.parseStrategyResponse(response);
  }

  private parseStrategyResponse(response: string): ContentStrategy {
    const intentMatch = response.match(/---INTENT---\s*([\s\S]*?)(?=---ANGLE---|$)/);
    const angleMatch = response.match(/---ANGLE---\s*([\s\S]*?)(?=---AUDIENCE---|$)/);
    const audienceMatch = response.match(/---AUDIENCE---\s*([\s\S]*?)(?=---TONE---|$)/);
    const toneMatch = response.match(/---TONE---\s*([\s\S]*?)(?=---SEO_KEYWORDS---|$)/);
    const seoKeywordsMatch = response.match(/---SEO_KEYWORDS---\s*([\s\S]*?)(?=---SEO_TITLE---|$)/);
    const seoTitleMatch = response.match(/---SEO_TITLE---\s*([\s\S]*?)(?=---SEO_DESCRIPTION---|$)/);
    const seoDescMatch = response.match(/---SEO_DESCRIPTION---\s*([\s\S]*?)(?=---SUGGESTED_TITLE---|$)/);
    const titleMatch = response.match(/---SUGGESTED_TITLE---\s*([\s\S]*?)(?=---SLUG---|$)/);
    const slugMatch = response.match(/---SLUG---\s*([\s\S]*?)(?=---CONTENT_OUTLINE---|$)/);
    const outlineMatch = response.match(/---CONTENT_OUTLINE---\s*([\s\S]*?)$/);

    const seoKeywords = seoKeywordsMatch?.[1]?.trim().split(',').map(k => k.trim()).filter(k => k) || [];
    const contentOutline = outlineMatch?.[1]?.trim().split('\n')
      .map(line => line.replace(/^[-*]\s*/, '').trim())
      .filter(line => line) || [];

    // Clean and validate slug
    let slug = slugMatch?.[1]?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '';
    if (slug.length > 40) {
      slug = slug.substring(0, 40).replace(/-$/, '');
    }

    return {
      intent: intentMatch?.[1]?.trim() || '',
      angle: angleMatch?.[1]?.trim() || '',
      audience: audienceMatch?.[1]?.trim() || '',
      tone: toneMatch?.[1]?.trim() || '',
      seo_keywords: seoKeywords,
      seo_title: seoTitleMatch?.[1]?.trim() || '',
      seo_description: seoDescMatch?.[1]?.trim() || '',
      suggested_title: titleMatch?.[1]?.trim() || '',
      slug: slug,
      content_outline: contentOutline,
    };
  }

  async generateSiteArticle(
    keyword: string,
    locale: string = 'en',
    strategy?: ContentStrategy,
    existingCategories?: Array<{ id: number; name: string; slug: string }>,
    existingTags?: Array<{ id: number; name: string; slug: string }>,
    authors?: Array<{ id: number; name: string; bio: string | null }>
  ): Promise<ContentGenerationResult> {
    let strategyContext = '';
    if (strategy) {
      strategyContext = `
Use this content strategy:
- Intent: ${strategy.intent}
- Angle: ${strategy.angle}
- Target Audience: ${strategy.audience}
- Tone: ${strategy.tone}
- SEO Keywords to include: ${strategy.seo_keywords.join(', ')}
- Suggested Title: ${strategy.suggested_title}
- Content Outline:
${strategy.content_outline.map(s => `  - ${s}`).join('\n')}
`;
    }

    // Build existing categories and tags context
    // Filter out generic categories like "General", "Uncategorized" etc.
    const specificCategories = existingCategories?.filter(cat => 
      !['general', 'uncategorized', 'misc', 'other'].includes(cat.name.toLowerCase())
    ) || [];

    let categoriesContext = '';
    if (specificCategories.length > 0) {
      categoriesContext = `\n\nExisting specific categories on the site (ONLY use one if it EXACTLY matches the topic, otherwise suggest a NEW specific category):
${specificCategories.map(cat => `- ${cat.name}`).join('\n')}`;
    }

    let tagsContext = '';
    if (existingTags && existingTags.length > 0) {
      tagsContext = `\n\nExisting Tags on the site (use matching ones, and add new specific tags as needed):
${existingTags.map(tag => `- ${tag.name}`).join('\n')}`;
    }

    // Parse author personas
    interface AuthorPersonaData {
      persona?: string;
      expertise?: string[] | string;
      tone?: string;
      style?: string;
    }
    const authorsWithPersonas: Array<{ id: number; name: string; persona: AuthorPersonaData }> = [];
    if (authors && authors.length > 0) {
      for (const author of authors) {
        if (author.bio) {
          try {
            const persona = JSON.parse(author.bio);
            authorsWithPersonas.push({ id: author.id, name: author.name, persona });
          } catch {
            // Skip authors without valid persona JSON
          }
        }
      }
    }

    let authorsContext = '';
    if (authorsWithPersonas.length > 0) {
      const authorList = authorsWithPersonas.map(a => {
        const expertise = a.persona.expertise ? `\n  Expertise: ${Array.isArray(a.persona.expertise) ? a.persona.expertise.join(', ') : a.persona.expertise}` : '';
        const tone = a.persona.tone ? `\n  Tone: ${a.persona.tone}` : '';
        const style = a.persona.style ? `\n  Style: ${a.persona.style}` : '';
        return `- ID ${a.id}: ${a.persona.persona || a.name}${expertise}${tone}${style}`;
      }).join('\n');
      
      authorsContext = `\n\nAvailable Authors (choose ONE that best fits this content topic and write in their style):
${authorList}

IMPORTANT: You MUST select the author whose expertise and tone best matches this content topic. Write the entire article in that author's unique style.`;
    }

    const prompt = `You are an SEO content expert. Create a comprehensive, SEO-optimized blog post about "${keyword}".
${strategyContext}${categoriesContext}${tagsContext}${authorsContext}

Requirements:
- Language: ${locale === 'tr-TR' ? 'Turkish' : 'English'}
- Length: 800-1000 words (comprehensive, detailed content)
- Include the main keyword naturally 4-6 times throughout the content
- Include related keywords and long-tail variations naturally
- Write in the specified tone for the target audience

Content Structure Requirements:

1. INTRODUCTION (1 paragraphs):
   - Comprehensively introduce the topic and explain its importance
   - Hook the reader with engaging opening sentences
   - Provide context and background information
   - Set expectations for what the reader will learn
   - Naturally include the main keyword in the first paragraph

2. MAIN SECTIONS (3-5 H2 headings):
   Each H2 section must explore a different angle, category, or aspect of the topic. Structure each section as follows:
   
   - Section Introduction: 2-3 sentences that explain this specific category/angle and why it matters
   - Content List: 8-10 items with practical examples, tips, messages, quotes, or actionable content
   - Each list item format:
     * Use bullet points (- or *)
     * Include descriptive content, not just titles
     * Each item should have 1-2 sentences of explanation or direct content
     * Make items specific, actionable, and valuable
   
   IMPORTANT: Include at least ONE dedicated section with:
   - **Wishes List**: A collection of 8-10 heartfelt wishes, greetings, or messages related to the topic
   - **Inspirational Quotes/Messages**: A collection of 8-10 inspiring quotes, motivational messages, or meaningful sayings related to the topic
   
   These can be combined in one section (e.g., "Wishes and Inspirational Messages") or separated into two sections. Format them as:
   * "[Wish or quote with brief context or explanation]"
   
   Example section structure:
   ## [Category/Angle Name]
   
   [2-3 sentence introduction explaining this category and its relevance]
   
   * "[Example 1 with brief explanation or direct content]"
   * "[Example 2 with brief explanation or direct content]"
   ... (continue with 8-10 total examples)
   
   ## Wishes and Inspirational Messages
   
   [2-3 sentence introduction about the importance of wishes and inspiration]
   
   * "[Wish 1 with brief explanation]"
   * "[Wish 2 with brief explanation]"
   * "[Inspirational quote 1 with context]"
   * "[Inspirational quote 2 with context]"
   ... (continue with 8-10 total wishes and quotes)
   
   - Use H3 subheadings when needed for more specific sub-categories within a main section
   - Ensure each section provides unique value and doesn't repeat content from other sections

3. CONCLUSION:
   - Summarize the key points covered in the article
   - Reinforce the main message
   - Include a natural call-to-action (e.g., encourage readers to try the examples, explore related topics, or share their experiences)
   - Keep it concise but impactful (2-3 paragraphs)

4. RELATED RESOURCES (Optional):
   - If relevant, add a section with related topics, recommendations, or additional resources
   - Format as a brief list or short paragraphs
   - This helps with internal linking and user engagement

Content Quality Requirements:
- Each section should provide real, actionable value - no filler content
- Examples should be specific, relevant, and immediately usable
- Maintain consistency in tone and style throughout the entire article
- Ensure smooth transitions between sections
- Use descriptive language that engages the reader
- Balance between informative and engaging writing
- Include variety in example types (quotes, tips, step-by-step guides, comparisons, etc.)
- Wishes should be heartfelt, genuine, and appropriate for the topic context
- Inspirational quotes/messages should be meaningful, relevant, and provide value to the reader
- When including quotes, provide brief context or attribution when relevant

IMPORTANT Category Rules:
- DO NOT use generic categories like "General", "Uncategorized", "Misc", or "Other"
- Suggest a SPECIFIC category that describes the content topic (e.g., "Technology", "Travel", "Health & Wellness", "Finance", "Food & Recipes", "Fashion", "Sports", "Entertainment", "Business", "Education", "Lifestyle")
- If an existing category EXACTLY matches the topic, use it. Otherwise, suggest a NEW specific category name.
- The category should help readers find similar content.

IMPORTANT Tag Rules:
- Suggest 3-5 specific, relevant tags
- Tags should be more specific than the category
- Mix existing tags (if they match) with new specific ones
- Examples of good tags: "iPhone 15", "Budget Travel Tips", "Vegan Recipes", "Remote Work"

Output format (use exactly these markers):
---TITLE---
[Your headline - MAXIMUM 60 characters, 6-10 words. Short and punchy! ${strategy?.suggested_title ? `Consider: "${strategy.suggested_title}"` : 'Include the keyword naturally'}]
---SLUG---
[URL slug - 3-5 words only, lowercase, hyphens, max 40 characters. Example: christmas-gift-ideas]
---BODY---
[Your article content in markdown format following the structure above. Use H2 for main sections, H3 for sub-sections, and bullet points for lists. Ensure proper markdown formatting.]
---SEO_TITLE---
[60 character max SEO title - optimize for search engines]
---SEO_DESCRIPTION---
[160 character max meta description - compelling and keyword-rich]
---SEO_KEYWORDS---
[Comma-separated keywords - include main keyword and related variations]
---CATEGORY---
[ONE specific category name - NOT "General" or "Uncategorized". Must be topic-specific!]
---TAGS---
[3-5 comma-separated specific tag names]
---AUTHOR_ID---
[The ID number of the author you selected - MUST match one of the available author IDs above]`;

    const response = await this.generateContent(prompt);
    return this.parseArticleResponse(response);
  }

  async generateXPost(keyword: string, articleUrl?: string): Promise<ContentGenerationResult> {
    const prompt = `Create a Twitter/X post about "${keyword}".

Requirements:
- Maximum 280 characters
- Start with a hook or attention-grabbing statement
- Include value proposition
- ${articleUrl ? `Include this link: ${articleUrl}` : 'Leave space for a link'}
- Add 2-3 relevant hashtags at the end
- Be engaging and shareable

Output format:
---TITLE---
[Empty for tweets]
---BODY---
[Your tweet text]
---HASHTAGS---
[Comma-separated hashtags without #]`;

    const response = await this.generateContent(prompt);
    return this.parseXPostResponse(response);
  }

  async generateRedditPost(keyword: string, subreddit?: string): Promise<ContentGenerationResult> {
    const prompt = `Create a Reddit post about "${keyword}"${subreddit ? ` for r/${subreddit}` : ''}.

Requirements:
- Title: Engaging but not clickbait (max 300 chars)
- Body: 300-500 words
- Self-post format (text post)
- Value-focused content
- Follow Reddit etiquette:
  - No excessive self-promotion
  - Genuine helpful information
  - Conversational tone
- If mentioning a link, place it naturally at the end
- Ask a question or invite discussion at the end

Output format:
---TITLE---
[Reddit post title]
---BODY---
[Post content in markdown]
---SUBREDDIT---
[Suggested subreddit if not specified]`;

    const response = await this.generateContent(prompt);
    return this.parseRedditResponse(response);
  }

  private parseArticleResponse(response: string): ContentGenerationResult {
    const titleMatch = response.match(/---TITLE---\s*([\s\S]*?)(?=---SLUG---|$)/);
    const slugMatch = response.match(/---SLUG---\s*([\s\S]*?)(?=---BODY---|$)/);
    const bodyMatch = response.match(/---BODY---\s*([\s\S]*?)(?=---SEO_TITLE---|$)/);
    const seoTitleMatch = response.match(/---SEO_TITLE---\s*([\s\S]*?)(?=---SEO_DESCRIPTION---|$)/);
    const seoDescMatch = response.match(/---SEO_DESCRIPTION---\s*([\s\S]*?)(?=---SEO_KEYWORDS---|$)/);
    const seoKeywordsMatch = response.match(/---SEO_KEYWORDS---\s*([\s\S]*?)(?=---CATEGORY---|$)/);
    const categoryMatch = response.match(/---CATEGORY---\s*([\s\S]*?)(?=---TAGS---|$)/);
    const tagsMatch = response.match(/---TAGS---\s*([\s\S]*?)(?=---AUTHOR_ID---|$)/);
    const authorIdMatch = response.match(/---AUTHOR_ID---\s*([\s\S]*?)$/);

    // Clean and validate slug
    let slug = slugMatch?.[1]?.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '';
    if (slug.length > 40) {
      slug = slug.substring(0, 40).replace(/-$/, '');
    }

    const category = categoryMatch?.[1]?.trim() || '';
    const tagsStr = tagsMatch?.[1]?.trim() || '';
    const tags = tagsStr.split(',').map(t => t.trim()).filter(t => t);
    const authorIdStr = authorIdMatch?.[1]?.trim() || '';
    const authorId = authorIdStr ? parseInt(authorIdStr, 10) : undefined;
    const selectedAuthorId = isNaN(authorId || NaN) ? undefined : authorId;

    return {
      title: titleMatch?.[1]?.trim() || '',
      body: bodyMatch?.[1]?.trim() || response,
      metadata: {
        seo_title: seoTitleMatch?.[1]?.trim() || '',
        seo_description: seoDescMatch?.[1]?.trim() || '',
        seo_keywords: seoKeywordsMatch?.[1]?.trim() || '',
        slug: slug,
      },
      suggested_category: category,
      suggested_tags: tags,
      selected_author_id: selectedAuthorId,
    };
  }

  private parseXPostResponse(response: string): ContentGenerationResult {
    const bodyMatch = response.match(/---BODY---\s*([\s\S]*?)(?=---HASHTAGS---|$)/);
    const hashtagsMatch = response.match(/---HASHTAGS---\s*([\s\S]*?)$/);

    return {
      title: '',
      body: bodyMatch?.[1]?.trim() || response,
      metadata: {
        hashtags: hashtagsMatch?.[1]?.trim() || '',
      },
    };
  }

  private parseRedditResponse(response: string): ContentGenerationResult {
    const titleMatch = response.match(/---TITLE---\s*([\s\S]*?)(?=---BODY---|$)/);
    const bodyMatch = response.match(/---BODY---\s*([\s\S]*?)(?=---SUBREDDIT---|$)/);
    const subredditMatch = response.match(/---SUBREDDIT---\s*([\s\S]*?)$/);

    return {
      title: titleMatch?.[1]?.trim() || '',
      body: bodyMatch?.[1]?.trim() || response,
      metadata: {
        subreddit: subredditMatch?.[1]?.trim() || '',
      },
    };
  }

  /**
   * Generate a short, catchy quote/slogan for featured image overlay
   * @param keyword - The topic keyword
   * @param context - Optional context from content strategy
   * @returns A short quote (max 8-10 words)
   */
  async generateQuote(keyword: string, context?: { intent?: string; tone?: string }): Promise<string> {
    const contextInfo = context 
      ? `\nContext:\n- Intent: ${context.intent || 'general'}\n- Tone: ${context.tone || 'inspiring'}`
      : '';

    const prompt = `Create a short, catchy quote or slogan for the topic: "${keyword}"
${contextInfo}

Requirements:
- Maximum 8-10 words
- Inspiring, memorable, and shareable
- No quotes or special characters
- Must work as an image overlay text
- In English only
- Should evoke emotion or curiosity

Examples for reference:
- "New Beginnings, Endless Possibilities"
- "Celebrate Every Moment"
- "Dreams Turn Into Reality"
- "Where Innovation Meets Inspiration"

Output only the quote text, nothing else.`;

    const response = await this.generateContent(prompt);
    
    // Clean up the response
    let quote = response
      .trim()
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/[^\w\s,.!?'-]/g, '') // Remove special characters
      .trim();

    // Ensure it's not too long (fallback to first 10 words)
    const words = quote.split(/\s+/);
    if (words.length > 10) {
      quote = words.slice(0, 10).join(' ');
    }

    return quote || `Discover ${keyword}`;
  }
}

