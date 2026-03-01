import { AgentDecision, AgentProvider, AgentProviderInput } from './types';
import { renderToolContractForPrompt, validateActionAgainstToolContract } from '../contracts/action-tools';

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};
type OllamaProviderOptions = {
  keepAlive: string;
  temperature: number;
  numPredict: number;
  timeoutMs: number;
};

type ChatRequestOptions = {
  skipRepair?: boolean;
};
type LogFn = (line: string) => void;

export class OllamaProvider implements AgentProvider {
  public readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly options: OllamaProviderOptions,
    private readonly fetchFn: FetchFn = globalThis.fetch as FetchFn,
    private readonly logFn: LogFn = (line: string) => {
      console.log(line);
    },
  ) {}

  public async handleMessage(input: AgentProviderInput): Promise<AgentDecision> {
    if (!this.fetchFn) {
      throw new Error('global fetch is unavailable for OllamaProvider');
    }

    const baseMessages: ChatMessage[] = [
      {
        role: 'system',
        content: [
          'You translate Minecraft player chat into strict tool invocations.',
          'Return only valid JSON with shape: {"reply"?: string, "actions": [{"name": string, "args": object}]}.',
          'Never invent action names or args. If unsure, return {"actions":[]}.',
          'Allowed tools:',
          renderToolContractForPrompt(),
        ].join('\n'),
      },
      {
        role: 'user',
        content: JSON.stringify({
          user: input.user,
          text: input.text,
          worldState: input.worldState,
        }),
      },
    ];

    const firstResult = await this.requestChatContent(baseMessages);
    const firstContent = firstResult.content;
    this.logTiming('initial', firstResult);

    try {
      return parseDecisionContent(firstContent);
    } catch (firstError) {
      const firstErrorMessage = firstError instanceof Error ? firstError.message : 'invalid decision';
      const repairMessages: ChatMessage[] = [
        ...baseMessages,
        { role: 'assistant', content: firstContent },
        {
          role: 'user',
          content: [
            `Your previous response was invalid: ${firstErrorMessage}.`,
            'Return corrected JSON only and follow the exact tool contract.',
          ].join(' '),
        },
      ];

      const repairResult = await this.requestChatContent(repairMessages, { skipRepair: true });
      const repairedContent = repairResult.content;
      this.logTiming('repair', repairResult);

      try {
        return parseDecisionContent(repairedContent);
      } catch (repairError) {
        const repairMessage = repairError instanceof Error ? repairError.message : 'invalid decision';
        throw new Error(`Ollama decision invalid after repair: ${repairMessage}`);
      }
    }
  }

  public async warmup(): Promise<void> {
    const warmupMessages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Warm the model. Reply with {"actions":[]}.',
      },
      {
        role: 'user',
        content: '{"text":"warmup"}',
      },
    ];
    try {
      await this.requestChatContent(warmupMessages, { skipRepair: true });
      this.logFn(JSON.stringify({
        event: 'provider_warmup',
        provider: this.name,
        status: 'ok',
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown warmup error';
      this.logFn(JSON.stringify({
        event: 'provider_warmup',
        provider: this.name,
        status: 'error',
        error: message,
      }));
    }
  }

  private async requestChatContent(messages: ChatMessage[], requestOptions: ChatRequestOptions = {}): Promise<{ content: string; metrics: OllamaChatResponse }> {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort(new Error(`Ollama request timed out after ${this.options.timeoutMs}ms`));
    }, this.options.timeoutMs);

    let response: Response;
    try {
      response = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        keep_alive: this.options.keepAlive,
        messages,
        options: {
          temperature: this.options.temperature,
          num_predict: this.options.numPredict,
        },
      }),
      signal: controller.signal,
    });
    } catch (error) {
      clearTimeout(timer);
      if (!requestOptions.skipRepair && error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.options.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      throw new Error(`Ollama request failed: HTTP ${response.status}`);
    }

    const payload = await response.json() as OllamaChatResponse;
    const rawContent = payload.message?.content;
    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      throw new Error('Ollama response missing message.content');
    }

    return {
      content: rawContent,
      metrics: payload,
    };
  }

  private logTiming(stage: 'initial' | 'repair', result: { content: string; metrics: OllamaChatResponse }): void {
    const metrics = result.metrics;
    this.logFn(JSON.stringify({
      event: 'provider_timing',
      provider: this.name,
      stage,
      total_ms: toMilliseconds(metrics.total_duration),
      load_ms: toMilliseconds(metrics.load_duration),
      prompt_eval_ms: toMilliseconds(metrics.prompt_eval_duration),
      eval_ms: toMilliseconds(metrics.eval_duration),
      prompt_eval_count: metrics.prompt_eval_count,
      eval_count: metrics.eval_count,
    }));
  }
}

export function parseDecisionContent(rawContent: string): AgentDecision {
  const cleaned = stripMarkdownFence(rawContent);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('Ollama response is not valid JSON');
  }

  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as Record<string, unknown>).actions)) {
    throw new Error('Ollama decision is invalid: missing actions array');
  }

  const decision = parsed as Record<string, unknown>;
  const reply = typeof decision.reply === 'string' ? decision.reply : undefined;
  const actions = decision.actions as unknown[];
  const parsedActions = actions.map(parseAction);
  const validationErrors = parsedActions
    .map((action, index) => {
      const error = validateActionAgainstToolContract(action);
      return error ? `actions[${index}]: ${error}` : null;
    })
    .filter((error): error is string => Boolean(error));

  if (validationErrors.length > 0) {
    throw new Error(`Ollama decision validation failed: ${validationErrors.join('; ')}`);
  }

  return {
    reply,
    actions: parsedActions,
  };
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function parseAction(action: unknown): { name: string; args: Record<string, unknown> } {
  if (!action || typeof action !== 'object') {
    throw new Error('Ollama decision is invalid: each action must be an object');
  }

  const asRecord = action as Record<string, unknown>;
  if (typeof asRecord.name !== 'string' || asRecord.name.length === 0) {
    throw new Error('Ollama decision is invalid: each action requires a string name');
  }
  if (typeof asRecord.args !== 'object' || asRecord.args === null || Array.isArray(asRecord.args)) {
    throw new Error(`Ollama decision is invalid: action ${asRecord.name} requires an args object`);
  }

  return {
    name: asRecord.name,
    args: asRecord.args as Record<string, unknown>,
  };
}

function toMilliseconds(durationNs: number | undefined): number | undefined {
  if (typeof durationNs !== 'number') {
    return undefined;
  }
  return Math.round((durationNs / 1_000_000) * 1000) / 1000;
}
