import { AgentDecision, AgentProvider, AgentProviderInput } from './types';

export class RuleProvider implements AgentProvider {
  public readonly name = 'rule';

  public async handleMessage(input: AgentProviderInput): Promise<AgentDecision> {
    const text = input.text.trim();
    const lower = text.toLowerCase();

    if (this.isHello(lower)) {
      return {
        reply: `Hello ${input.user}.`,
        actions: [],
      };
    }

    if (this.isStop(lower)) {
      return {
        actions: [{ name: 'action_stop', args: {} }],
      };
    }

    if (this.isJump(lower)) {
      return {
        actions: [{ name: 'action_jump', args: {} }],
      };
    }

    if (this.isComeToMe(lower)) {
      const location = input.worldState.playerLocation;
      if (!location) {
        return {
          reply: `I could not find your location, ${input.user}.`,
          actions: [],
        };
      }

      return {
        actions: [
          {
            name: 'action_move_to_location',
            args: {
              location_x: Math.floor(location.x),
              location_y: Math.floor(location.y),
              location_z: Math.floor(location.z),
            },
          },
        ],
      };
    }

    const digMatch = lower.match(/dig(?:\s+a)?\s+(\d+)\s*(?:x|by)\s*(\d+)(?:\s+hole)?/);
    if (digMatch) {
      const depth = Number(digMatch[1]);
      const width = Number(digMatch[2]);
      return {
        actions: [
          {
            name: 'action_dig',
            args: { depth, width },
          },
        ],
      };
    }

    const findMatch = lower.match(/^find\s+([a-z0-9_\- ]+)$/);
    if (findMatch) {
      return {
        actions: [
          {
            name: 'action_find_entity',
            args: { entity_name: findMatch[1].trim() },
          },
        ],
      };
    }

    const attackMatch = lower.match(/^attack\s+([a-z0-9_\- ]+)$/);
    if (attackMatch) {
      return {
        actions: [
          {
            name: 'action_attack_nearest_entity',
            args: { entity_name: attackMatch[1].trim() },
          },
        ],
      };
    }

    return {
      reply: 'I can currently handle: hello, come to me, jump, dig <depth>x<width>, find <entity>, attack <entity>, stop.',
      actions: [],
    };
  }

  private isHello(text: string): boolean {
    return /^hello\b/.test(text) || /^hi\b/.test(text) || /^hey\b/.test(text);
  }

  private isComeToMe(text: string): boolean {
    return text.includes('come to me');
  }

  private isJump(text: string): boolean {
    return /^jump\b/.test(text);
  }

  private isStop(text: string): boolean {
    return text === 'stop';
  }
}
