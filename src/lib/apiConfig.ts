import { Preferences } from '@capacitor/preferences';
import type { ApiConfig, ApiProvider } from '../types';

const API_CONFIG_KEY = 'api_config';

export const defaultApiConfig: ApiConfig = {
  provider: 'openai',
  apiKey: '',
  baseUrl: '',
  model: 'gpt-4o',
};

export async function loadApiConfig(): Promise<ApiConfig> {
  try {
    const { value } = await Preferences.get({ key: API_CONFIG_KEY });
    if (value) {
      const parsed = JSON.parse(value) as Partial<ApiConfig>;
      return { ...defaultApiConfig, ...parsed };
    }
  } catch {
    // ignore parse errors
  }
  return { ...defaultApiConfig };
}

export async function saveApiConfig(config: ApiConfig): Promise<void> {
  await Preferences.set({
    key: API_CONFIG_KEY,
    value: JSON.stringify(config),
  });
}

export const providerOptions: { value: ApiProvider; label: string; defaultModel: string; defaultBaseUrl: string }[] = [
  { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o', defaultBaseUrl: 'https://api.openai.com/v1' },
  { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022', defaultBaseUrl: 'https://api.anthropic.com/v1' },
  { value: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-1.5-pro', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
  { value: 'openrouter', label: 'OpenRouter', defaultModel: 'openai/gpt-4o', defaultBaseUrl: 'https://openrouter.ai/api/v1' },
  { value: 'custom', label: 'Custom / Local', defaultModel: '', defaultBaseUrl: '' },
];

export async function callLLM(
  config: ApiConfig,
  prompt: string
): Promise<{ content: string; reasoning?: string }> {
  const url = config.baseUrl.trim()
    ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    throw new Error(errorMessage);
  }

  const data = await response.json();
  const message = data.choices?.[0]?.message;
  return {
    content: message?.content || '',
    reasoning: message?.reasoning_content,
  };
}

export interface StreamCallbacks {
  onReasoningChunk?: (chunk: string) => void;
  onContentChunk?: (chunk: string) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export async function streamLLM(
  config: ApiConfig,
  prompt: string,
  callbacks: StreamCallbacks
): Promise<void> {
  const url = config.baseUrl.trim()
    ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
      throw new Error(errorMessage);
    }

    if (!response.body) {
      throw new Error('No response body');
    }

    reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          callbacks.onDone?.();
          return;
        }

        try {
          const chunk = JSON.parse(data);
          const delta = chunk.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.reasoning_content) {
            callbacks.onReasoningChunk?.(delta.reasoning_content);
          }
          if (delta.content) {
            callbacks.onContentChunk?.(delta.content);
          }

          if (chunk.choices?.[0]?.finish_reason) {
            callbacks.onDone?.();
            return;
          }
        } catch {
          // ignore malformed JSON chunks
        }
      }
    }

    callbacks.onDone?.();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    callbacks.onError?.(error);
  } finally {
    reader?.cancel().catch(() => {});
  }
}

const NEWSDATA_API_KEY = 'newsdata_api_key';

export async function loadNewsApiKey(): Promise<string> {
  try {
    const { value } = await Preferences.get({ key: NEWSDATA_API_KEY });
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveNewsApiKey(key: string): Promise<void> {
  await Preferences.set({ key: NEWSDATA_API_KEY, value: key });
}

export async function testNewsApiKey(key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!key.trim()) {
      return { success: false, message: 'NewsData.io API key is required' };
    }
    const response = await fetch(`https://newsdata.io/api/1/sources?apikey=${key.trim()}&country=us`, {
      method: 'GET',
    });
    if (response.ok) {
      return { success: true, message: 'NewsData.io connection successful!' };
    }
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.results?.message || errorData.message || `HTTP ${response.status}`;
    return { success: false, message: `Connection failed: ${errorMessage}` };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}

export async function testApiConnection(config: ApiConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.apiKey.trim()) {
      return { success: false, message: 'API key is required' };
    }

    const url = config.baseUrl.trim()
      ? `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
      : 'https://api.openai.com/v1/chat/completions';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || 'gpt-4o',
        messages: [{ role: 'user', content: 'Say "OK" and nothing else.' }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      return { success: true, message: 'Connection successful!' };
    }

    const errorData = await response.json().catch(() => ({}));
    const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
    return { success: false, message: `Connection failed: ${errorMessage}` };
  } catch (err) {
    return { success: false, message: `Connection failed: ${err instanceof Error ? err.message : String(err)}` };
  }
}
