import { ActionExecutionResult } from '../execution/action-executor';

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

export interface ResponseSynthesisInput {
  user: string;
  message: string;
  providerReply?: string;
  actions: Array<{ name: string; args: Record<string, unknown> }>;
  actionResults: ActionExecutionResult[];
}

export class OllamaResponseSynthesizer {
  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly timeoutMs: number,
    private readonly fetchFn: FetchFn = globalThis.fetch as FetchFn,
  ) {}

  public async synthesize(input: ResponseSynthesisInput): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Synthesis timed out after ${this.timeoutMs}ms`));
    }, this.timeoutMs);

    try {
      const response = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, '')}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.model,
          stream: false,
          keep_alive: '30m',
          messages: [
            {
              role: 'system',
              content: [
                'You are a concise Minecraft bot narrator.',
                'Write one short player-facing sentence.',
                'Do not invent facts. Use only provided results.',
              ].join(' '),
            },
            {
              role: 'user',
              content: JSON.stringify(input),
            },
          ],
          options: {
            temperature: 0.2,
            num_predict: 64,
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Synthesis request failed: HTTP ${response.status}`);
      }

      const payload = await response.json() as OllamaChatResponse;
      const content = payload.message?.content;
      if (typeof content !== 'string' || content.trim().length === 0) {
        throw new Error('Synthesis response missing content');
      }

      return content.trim().replace(/\s+/g, ' ');
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Synthesis timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
