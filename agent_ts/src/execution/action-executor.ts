import { Config } from '../config';
import { FunctionHandler } from '../action-handler';
import { AgentAction } from '../providers/types';
import { ALLOWED_ACTIONS, validateActionArgs } from './safety-policy';

type EventName =
  | 'action_start'
  | 'action_result'
  | 'action_error';

type EventLogger = (event: EventName, payload: Record<string, unknown>) => void;

export interface ActionExecutionResult {
  action: AgentAction;
  ok: boolean;
  response?: unknown;
  error?: string;
}

export class ActionExecutor {
  private readonly lastActionAt = new Map<string, number>();

  constructor(
    private readonly functionHandler: FunctionHandler,
    private readonly config: Config,
    private readonly logEvent: EventLogger,
  ) {}

  public async execute(user: string, actions: AgentAction[]): Promise<ActionExecutionResult[]> {
    const results: ActionExecutionResult[] = [];

    for (let index = 0; index < actions.length; index += 1) {
      const action = actions[index];

      const preflightError = this.validatePreflight(user, action, index, actions.length);
      if (preflightError) {
        this.logEvent('action_error', {
          user,
          action: action.name,
          error: preflightError,
        });

        results.push({
          action,
          ok: false,
          error: preflightError,
        });

        continue;
      }

      const cooldownKey = `${user}:${action.name}`;

      this.logEvent('action_start', {
        user,
        action: action.name,
        args: action.args,
      });

      try {
        const [responseBody] = await this.withTimeout(
          this.functionHandler.callFunction(action.name, action.args),
          this.config.actionTimeoutMs,
        );

        this.lastActionAt.set(cooldownKey, Date.now());

        this.logEvent('action_result', {
          user,
          action: action.name,
          response: responseBody,
        });

        results.push({
          action,
          ok: true,
          response: responseBody,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown action execution error';

        this.logEvent('action_error', {
          user,
          action: action.name,
          error: errorMessage,
        });

        results.push({
          action,
          ok: false,
          error: errorMessage,
        });
      }
    }

    return results;
  }

  private validatePreflight(user: string, action: AgentAction, index: number, totalActions: number): string | null {
    if (!this.config.enableSafety) {
      return null;
    }

    if (totalActions > this.config.maxActionsPerMessage && index >= this.config.maxActionsPerMessage) {
      return `Max actions exceeded (${this.config.maxActionsPerMessage})`;
    }

    if (action.name === 'action_build' && this.config.disableActionBuild) {
      return 'action_build is disabled by policy';
    }

    if (!ALLOWED_ACTIONS.has(action.name)) {
      return `Action is not allowlisted: ${action.name}`;
    }

    const argError = validateActionArgs(action);
    if (argError) {
      return argError;
    }

    const cooldownKey = `${user}:${action.name}`;
    const lastActionTs = this.lastActionAt.get(cooldownKey);
    if (lastActionTs && Date.now() - lastActionTs < this.config.actionCooldownMs) {
      return `Action cooldown active for ${action.name}`;
    }

    return null;
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return await new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Action timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}
