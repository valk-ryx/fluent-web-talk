/**
 * OpenRouter API Service
 * This service handles communication with the OpenRouter API for AI chat functionality
 */

// API key should be stored securely
// For this demo, we'll use local storage, but in production consider more secure methods
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const LOCAL_STORAGE_KEY = 'openrouter_api_key';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatCompletionOptions {
  model: string;
  messages: Message[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
}

// Define models
export const models = [
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B' },
  { id: 'google/gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro Preview' },
  { id: 'google/gemini-2.5-flash-preview', name: 'Gemini 2.5 Flash Preview' },
];

/**
 * Save API key to local storage
 */
export const saveApiKey = (apiKey: string): void => {
  localStorage.setItem(LOCAL_STORAGE_KEY, apiKey);
};

/**
 * Get API key from local storage
 */
export const getApiKey = (): string | null => {
  return localStorage.getItem(LOCAL_STORAGE_KEY);
};

/**
 * Check if API key exists
 */
export const hasApiKey = (): boolean => {
  return !!getApiKey();
};

/**
 * Clear API key from local storage
 */
export const clearApiKey = (): void => {
  localStorage.removeItem(LOCAL_STORAGE_KEY);
};

/**
 * Send a chat completion request (non-streaming)
 */
export const sendChatCompletion = async (options: ChatCompletionOptions): Promise<Message> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('API key not found');
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Chat App'
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.95,
        max_tokens: options.max_tokens ?? 1000,
        stream: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Error communicating with OpenRouter API');
    }

    const data = await response.json();
    return {
      role: 'assistant',
      content: data.choices[0].message.content
    };
  } catch (error) {
    console.error('Error in sendChatCompletion:', error);
    throw error;
  }
};

/**
 * Stream a chat completion request with SSE
 */
export const streamChatCompletion = async (
  options: ChatCompletionOptions,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void,
  onError: (error: Error) => void
): Promise<void> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    onError(new Error('API key not found'));
    return;
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'AI Chat App'
      },
      body: JSON.stringify({
        model: options.model,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        top_p: options.top_p ?? 0.95,
        max_tokens: options.max_tokens ?? 1000,
        stream: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream not supported');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim() !== '');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const parsedData = JSON.parse(data);
            const content = parsedData.choices[0]?.delta?.content;
            
            if (content) {
              fullText += content;
              onChunk(content);
            }
          } catch (err) {
            console.error('Error parsing chunk:', err);
          }
        }
      }
    }

    onComplete(fullText);
  } catch (error) {
    console.error('Error in streamChatCompletion:', error);
    onError(error instanceof Error ? error : new Error(String(error)));
  }
};
