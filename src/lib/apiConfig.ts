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

  const isKimi = /kimi/i.test(config.model);
  const requestBody: Record<string, unknown> = {
    model: config.model || 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  };
  if (isKimi) {
    requestBody.thinking = { type: 'enabled' };
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
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
          const choice = chunk.choices?.[0];
          const delta = choice?.delta;
          if (!delta) continue;

          // Reasoning tokens: check multiple field names used by different providers
          const reasoning = delta.reasoning_content || delta.reasoning || delta.thinking;
          if (reasoning) {
            callbacks.onReasoningChunk?.(reasoning);
          }

          // Content tokens: emit even empty strings (some APIs use them as keep-alives)
          if (delta.content !== undefined && delta.content !== null) {
            callbacks.onContentChunk?.(delta.content);
          }

          // Only finish if there's no more content/reasoning in this chunk
          if (choice?.finish_reason && !reasoning && !delta.content) {
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

const BRAVE_API_KEY = 'brave_api_key';

export async function loadBraveApiKey(): Promise<string> {
  try {
    const { value } = await Preferences.get({ key: BRAVE_API_KEY });
    return value ?? '';
  } catch {
    return '';
  }
}

export async function saveBraveApiKey(key: string): Promise<void> {
  await Preferences.set({ key: BRAVE_API_KEY, value: key });
}

export async function testBraveApiKey(key: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!key.trim()) {
      return { success: false, message: 'Brave Search API key is required' };
    }
    const { CapacitorHttp } = await import('@capacitor/core');
    const response = await CapacitorHttp.request({
      url: 'https://api.search.brave.com/res/v1/web/search',
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Subscription-Token': key.trim(),
      },
      params: { q: 'test', count: '1' },
      responseType: 'json',
    });
    if (response.status >= 200 && response.status < 300) {
      return { success: true, message: 'Brave Search connection successful!' };
    }
    const errorText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
    return { success: false, message: `Connection failed: HTTP ${response.status} ${errorText}` };
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
