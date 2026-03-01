import { AgentDecision, AgentProvider, AgentProviderInput, ProviderSelectionResult } from './types';

export class ProviderRouter {
  constructor(
    private readonly primary: AgentProvider,
    private readonly fallback: AgentProvider | undefined,
    private readonly enableFallback: boolean,
  ) {}

  public async handleMessage(input: AgentProviderInput): Promise<ProviderSelectionResult> {
    try {
      const decision = this.assertDecision(await this.primary.handleMessage(input));
      return {
        providerName: this.primary.name,
        decision,
      };
    } catch (error) {
      if (!this.enableFallback || !this.fallback) {
        throw error;
      }

      const fallbackReason = error instanceof Error ? error.message : 'primary provider failed';
      const decision = this.assertDecision(await this.fallback.handleMessage(input));

      return {
        providerName: this.fallback.name,
        decision,
        fallbackReason,
      };
    }
  }

  private assertDecision(decision: AgentDecision): AgentDecision {
    if (!decision || !Array.isArray(decision.actions)) {
      throw new Error('Provider decision is invalid: missing actions array');
    }

    return {
      reply: typeof decision.reply === 'string' ? decision.reply : undefined,
      actions: decision.actions
        .filter((action) => action && typeof action.name === 'string')
        .map((action) => ({
          name: action.name,
          args: action.args && typeof action.args === 'object' ? action.args : {},
        })),
    };
  }
}
