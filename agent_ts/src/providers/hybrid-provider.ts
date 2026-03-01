import { RuleProvider } from './rule-provider';
import { AgentDecision, AgentProvider, AgentProviderInput } from './types';

export class HybridProvider implements AgentProvider {
  public readonly name = 'hybrid';

  constructor(
    private readonly fastPath: RuleProvider,
    private readonly llmProvider: AgentProvider,
  ) {}

  public async handleMessage(input: AgentProviderInput): Promise<AgentDecision> {
    const fastPathDecision = this.fastPath.tryHandleMessage(input);
    if (fastPathDecision) {
      return fastPathDecision;
    }

    return await this.llmProvider.handleMessage(input);
  }

  public async warmup(): Promise<void> {
    await this.llmProvider.warmup?.();
  }
}
