import { AgentAction } from '../providers/types';

export interface ToolDefinition {
  name: string;
  description: string;
  argsDescription: string;
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  { name: 'action_stop', description: 'Stop current movement/pathing immediately.', argsDescription: '{}' },
  { name: 'action_jump', description: 'Make the bot jump once.', argsDescription: '{}' },
  { name: 'action_dig', description: 'Dig a rectangular hole with positive integer dimensions.', argsDescription: '{"depth": integer>0, "width": integer>0}' },
  { name: 'action_find_entity', description: 'Locate nearest entity by name.', argsDescription: '{"entity_name": non-empty string}' },
  { name: 'action_attack_nearest_entity', description: 'Attack nearest entity by name.', argsDescription: '{"entity_name": non-empty string}' },
  { name: 'action_move_to_location', description: 'Move to world coordinates.', argsDescription: '{"location_x": number, "location_y": number, "location_z": number}' },
  { name: 'action_get_player_location', description: 'Get a player location by player name.', argsDescription: '{"player_name": non-empty string}' },
  { name: 'action_get_time', description: 'Get world time.', argsDescription: '{}' },
  { name: 'action_is_raining', description: 'Check if it is raining.', argsDescription: '{}' },
  { name: 'action_collect_block', description: 'Collect a block type by count.', argsDescription: '{"block_type": non-empty string, "count": number>0}' },
  {
    name: 'action_get_distance_between_to_entities',
    description: 'Measure distance between two locations encoded as JSON strings.',
    argsDescription: '{"location_1": non-empty string, "location_2": non-empty string}',
  },
];

export const TOOL_NAMES = new Set<string>(TOOL_DEFINITIONS.map((tool) => tool.name));

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateActionAgainstToolContract(action: AgentAction): string | null {
  const args = action.args;

  switch (action.name) {
    case 'action_stop':
    case 'action_jump':
    case 'action_get_time':
    case 'action_is_raining':
      return null;

    case 'action_dig': {
      const depth = args.depth;
      const width = args.width;
      if (!isFiniteNumber(depth) || !Number.isInteger(depth) || depth <= 0) {
        return 'action_dig requires depth as a positive integer';
      }
      if (!isFiniteNumber(width) || !Number.isInteger(width) || width <= 0) {
        return 'action_dig requires width as a positive integer';
      }
      return null;
    }

    case 'action_find_entity':
    case 'action_attack_nearest_entity': {
      if (!isNonEmptyString(args.entity_name)) {
        return `${action.name} requires entity_name as a non-empty string`;
      }
      return null;
    }

    case 'action_move_to_location': {
      if (!isFiniteNumber(args.location_x) || !isFiniteNumber(args.location_y) || !isFiniteNumber(args.location_z)) {
        return 'action_move_to_location requires numeric location_x, location_y, and location_z';
      }
      return null;
    }

    case 'action_get_player_location': {
      if (!isNonEmptyString(args.player_name)) {
        return 'action_get_player_location requires player_name as a non-empty string';
      }
      return null;
    }

    case 'action_collect_block': {
      if (!isNonEmptyString(args.block_type)) {
        return 'action_collect_block requires block_type as a non-empty string';
      }
      const count = args.count;
      if (!isFiniteNumber(count) || count <= 0) {
        return 'action_collect_block requires count as a positive number';
      }
      return null;
    }

    case 'action_get_distance_between_to_entities': {
      if (!isNonEmptyString(args.location_1) || !isNonEmptyString(args.location_2)) {
        return 'action_get_distance_between_to_entities requires location_1 and location_2 JSON strings';
      }
      return null;
    }

    default:
      return `Unknown action: ${action.name}`;
  }
}

export function renderToolContractForPrompt(): string {
  const lines = TOOL_DEFINITIONS.map((tool) => `- ${tool.name}: ${tool.description} Args: ${tool.argsDescription}`);
  return lines.join('\n');
}
