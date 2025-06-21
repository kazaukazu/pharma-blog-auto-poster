import axios from 'axios';
import { config } from '../config';
import { ClaudeRequestData, ClaudeResponseData } from '../../../shared/types';
import logger from '../utils/logger';

export interface ClaudeArticleGenerationResult {
  success: boolean;
  data?: ClaudeResponseData;
  error?: string;
}

export class ClaudeService {
  private static readonly API_URL = config.claude.apiUrl;
  private static readonly API_KEY = config.claude.apiKey;

  static async generateArticle(requestData: ClaudeRequestData): Promise<ClaudeArticleGenerationResult> {
    try {
      if (!this.API_KEY) {
        throw new Error('Claude API key not configured');
      }

      const prompt = this.buildPrompt(requestData);
      
      logger.info('Sending article generation request to Claude', {
        region: requestData.site_info.region,
        pharmacy: requestData.site_info.pharmacy_name,
        topic: requestData.article_config.topic,
        targetLength: requestData.article_config.target_length,
      });

      const response = await axios.post(
        `${this.API_URL}/v1/messages`,
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 4000,
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`,
            'anthropic-version': '2023-06-01',
          },
          timeout: 60000, // 60 seconds timeout
        }
      );

      const content = response.data.content[0].text;
      const parsedResponse = this.parseResponse(content);

      if (!parsedResponse.title || !parsedResponse.content) {
        throw new Error('Invalid response format from Claude');
      }

      logger.info('Article generated successfully by Claude', {
        title: parsedResponse.title,
        contentLength: parsedResponse.content.length,
        estimatedReadingTime: parsedResponse.estimated_reading_time,
      });

      return {
        success: true,
        data: parsedResponse,
      };
    } catch (error: any) {
      logger.error('Failed to generate article with Claude', {
        error: error.message,
        requestData: {
          region: requestData.site_info.region,
          topic: requestData.article_config.topic,
        },
      });

      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  private static buildPrompt(requestData: ClaudeRequestData): string {
    const { site_info, article_config, template } = requestData;

    return `あなたは薬剤師のブログ記事を作成する専門ライターです。以下の条件に基づいて、SEOに最適化された高品質な記事を作成してください。

## 記事作成条件

### サイト情報
- 地域: ${site_info.region}
- 薬局名: ${site_info.pharmacy_name}
- 薬局の特徴: ${site_info.pharmacy_features || '地域密着の調剤薬局'}

### 記事設定
- トピック: ${article_config.topic}
- トーン: ${article_config.tone === 'professional' ? '専門的で信頼性のある' : article_config.tone === 'friendly' ? '親しみやすく読みやすい' : '中立的で情報提供的な'}
- 目標文字数: ${article_config.target_length}文字
- 必須キーワード: ${article_config.keywords.join(', ')}
- 除外キーワード: ${article_config.exclude_keywords.join(', ')}

### 記事構成
構成テンプレート: ${template.structure}
SEO重視度: ${template.seo_focus ? '高' : '標準'}

## 記事作成指示

1. **タイトル作成**
   - SEOを意識したキーワードを含める
   - 読者の関心を引く魅力的なタイトル
   - 30-40文字程度

2. **本文作成**
   - 指定された構成に従って記事を作成
   - 専門的な情報を正確に記載
   - 地域性を自然に盛り込む
   - 読みやすい段落構成
   - 適切な見出し（H2、H3）を使用

3. **SEO最適化**
   - 必須キーワードを自然に配置
   - メタディスクリプション用の要約を作成
   - 関連するタグキーワードを提案

4. **注意事項**
   - 医療に関する内容は正確性を重視
   - 薬事法に違反しない表現を使用
   - 除外キーワードは使用しない
   - 地域の${site_info.region}に関連する内容を含める

## 出力形式
以下のJSON形式で出力してください：

\`\`\`json
{
  "title": "記事のタイトル",
  "content": "記事の本文（HTML形式）",
  "meta_description": "SEO用のメタディスクリプション（120-160文字）",
  "tags": ["タグ1", "タグ2", "タグ3"],
  "estimated_reading_time": 5
}
\`\`\`

記事を作成してください。`;
  }

  private static parseResponse(content: string): ClaudeResponseData {
    try {
      // Extract JSON from the response
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonContent = jsonMatch[1];
      const parsed = JSON.parse(jsonContent);

      // Validate required fields
      if (!parsed.title || !parsed.content) {
        throw new Error('Missing required fields in response');
      }

      // Calculate reading time if not provided
      if (!parsed.estimated_reading_time) {
        const wordCount = parsed.content.replace(/<[^>]*>/g, '').length;
        parsed.estimated_reading_time = Math.ceil(wordCount / 400); // Assuming 400 chars per minute
      }

      // Ensure tags array
      if (!Array.isArray(parsed.tags)) {
        parsed.tags = [];
      }

      return {
        title: parsed.title,
        content: parsed.content,
        meta_description: parsed.meta_description || '',
        tags: parsed.tags,
        estimated_reading_time: parsed.estimated_reading_time,
      };
    } catch (error: any) {
      logger.error('Failed to parse Claude response', {
        error: error.message,
        content: content.substring(0, 500),
      });

      // Fallback: try to extract title and content manually
      const titleMatch = content.match(/タイトル[：:]\s*(.+)/);
      const contentMatch = content.match(/本文[：:]?\s*([\s\S]+)/);

      if (titleMatch && contentMatch) {
        return {
          title: titleMatch[1].trim(),
          content: contentMatch[1].trim(),
          meta_description: '',
          tags: [],
          estimated_reading_time: Math.ceil(contentMatch[1].length / 400),
        };
      }

      throw new Error('Failed to parse Claude response');
    }
  }

  static async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.API_KEY) {
        return { success: false, error: 'API key not configured' };
      }

      const response = await axios.post(
        `${this.API_URL}/v1/messages`,
        {
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: 'Hello, please respond with "Connection successful"',
            },
          ],
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.API_KEY}`,
            'anthropic-version': '2023-06-01',
          },
          timeout: 10000,
        }
      );

      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}