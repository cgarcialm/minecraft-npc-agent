import { AgentDecision, AgentProvider, AgentProviderInput } from './types';

interface OllamaChatResponse {
  message?: {
    content?: unknown;
  };
}

type FetchFn = (input: string, init?: RequestInit) => Promise<Response>;

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

    const response = await this.fetchFn(`${this.baseUrl.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
        messages: [
          {
            role: 'system',
            content: [
              'You translate Minecraft player chat into JSON.',
              'Return only valid JSON with shape: {"reply"?: string, "actions": [{"name": string, "args": object}]}.',
              'Use only these action names: action_stop, action_jump, action_dig, action_find_entity, action_attack_nearest_entity, action_move_to_location, action_get_player_location, action_get_time, action_is_raining, action_collect_block, action_get_distance_between_to_entities.',
              'Never invent action names.',
              'If no action applies, return {"actions": []}.',
            ].join(' '),
          },
          {
            role: 'user',
            content: JSON.stringify({
              user: input.user,
              text: input.text,
              worldState: input.worldState,
            }),
          },
        ],
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

    return parseDecisionContent(rawContent);
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
  let reply = typeof decision.reply === 'string' ? decision.reply : undefined;
  const actions = decision.actions as unknown[];
  let unsupportedActions = 0;

  const normalizedActions = actions
    .map((action) => normalizeAction(action))
    .filter((action): action is { name: string; args: Record<string, unknown> } => {
      if (!action) {
        unsupportedActions += 1;
        return false;
      }
      return true;
    });

  const sayText = extractSayReply(actions);
  if (!reply && sayText) {
    reply = sayText;
  }

  if (normalizedActions.length === 0 && !reply && actions.length > 0 && unsupportedActions > 0) {
    throw new Error('Ollama decision is invalid: unsupported actions');
  }

  return {
    reply,
    actions: normalizedActions,
  };
}

function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  if (!trimmed.startsWith('```')) {
    return trimmed;
  }

  return trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
}

function normalizeAction(action: unknown): { name: string; args: Record<string, unknown> } | null {
  if (!action || typeof action !== 'object') {
    return null;
  }

  const asRecord = action as Record<string, unknown>;
  const rawName = asRecord.name;
  const args = asRecord.args && typeof asRecord.args === 'object' ? asRecord.args as Record<string, unknown> : {};
  if (typeof rawName !== 'string') {
    return null;
  }

  switch (rawName) {
    case 'action_stop':
    case 'action_jump':
    case 'action_dig':
    case 'action_find_entity':
    case 'action_attack_nearest_entity':
    case 'action_move_to_location':
    case 'action_get_player_location':
      if (hasCoordinateTriplet(args)) {
        return {
          name: 'action_move_to_location',
          args: {
            location_x: args.x,
            location_y: args.y,
            location_z: args.z,
          },
        };
      }
      return { name: rawName, args };
    case 'action_get_time':
    case 'action_is_raining':
    case 'action_collect_block':
    case 'action_get_distance_between_to_entities':
      return { name: rawName, args };

    case 'stop':
      return { name: 'action_stop', args: {} };
    case 'jump':
      return { name: 'action_jump', args: {} };
    case 'dig':
      return { name: 'action_dig', args };
    case 'find':
    case 'find_entity':
      return { name: 'action_find_entity', args };
    case 'attack':
    case 'attack_nearest_entity':
      return { name: 'action_attack_nearest_entity', args };
    case 'move_to_location':
      return {
        name: 'action_move_to_location',
        args: normalizeMoveToLocationArgs(args),
      };
    case 'say':
      return null;
    default:
      return null;
  }
}

function normalizeMoveToLocationArgs(args: Record<string, unknown>): Record<string, unknown> {
  const location = args.location;
  if (location && typeof location === 'object') {
    const asLocation = location as Record<string, unknown>;
    return {
      location_x: asLocation.x,
      location_y: asLocation.y,
      location_z: asLocation.z,
    };
  }

  return args;
}

function extractSayReply(actions: unknown[]): string | undefined {
  for (const action of actions) {
    if (!action || typeof action !== 'object') {
      continue;
    }

    const asRecord = action as Record<string, unknown>;
    if (asRecord.name !== 'say') {
      continue;
    }

    const args = asRecord.args;
    if (!args || typeof args !== 'object') {
      continue;
    }

    const text = (args as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim().length > 0) {
      return text;
    }
  }

  return undefined;
}

function hasCoordinateTriplet(args: Record<string, unknown>): boolean {
  return typeof args.x === 'number' && typeof args.y === 'number' && typeof args.z === 'number';
}
