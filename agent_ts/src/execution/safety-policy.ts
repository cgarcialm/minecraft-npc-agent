import { TOOL_NAMES, validateActionAgainstToolContract } from '../contracts/action-tools';
import { AgentAction } from '../providers/types';

export const ALLOWED_ACTIONS = TOOL_NAMES;

export function validateActionArgs(action: AgentAction): string | null {
  return validateActionAgainstToolContract(action);
}
