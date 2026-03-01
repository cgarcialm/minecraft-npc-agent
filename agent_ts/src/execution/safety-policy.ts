import { AgentAction } from '../providers/types';

export const ALLOWED_ACTIONS = new Set<string>([
  'action_stop',
  'action_jump',
  'action_dig',
  'action_find_entity',
  'action_attack_nearest_entity',
  'action_move_to_location',
  'action_get_player_location',
  'action_get_time',
  'action_is_raining',
  'action_collect_block',
  'action_get_distance_between_to_entities',
]);

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isNonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateActionArgs(action: AgentAction): string | null {
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
