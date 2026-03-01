import { AgentDecision, AgentProvider, AgentProviderInput } from './types';
import { renderToolContractForPrompt, validateActionAgainstToolContract } from '../contracts/action-tools';

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;
type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export class OllamaProvider implements AgentProvider {
  public readonly name = 'ollama';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly fetchFn: FetchFn = globalThis.fetch as FetchFn,
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

    const firstContent = await this.requestChatContent(baseMessages);

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

      const repairedContent = await this.requestChatContent(repairMessages);

      try {
        return parseDecisionContent(repairedContent);
      } catch (repairError) {
        const repairMessage = repairError instanceof Error ? repairError.message : 'invalid decision';
        throw new Error(`Ollama decision invalid after repair: ${repairMessage}`);
      }
    }
  }

  private async requestChatContent(messages: ChatMessage[]): Promise<string> {
    const response = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: HTTP ${response.status}`);
    }

    const payload = await response.json() as OllamaChatResponse;
    const rawContent = payload.message?.content;
    if (typeof rawContent !== 'string' || rawContent.trim().length === 0) {
      throw new Error('Ollama response missing message.content');
    }

    return rawContent;
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
