import { Config } from '../config';
import { ProviderRouter } from './provider-router';
import { OllamaProvider } from './ollama-provider';
import { RuleProvider } from './rule-provider';
import { AgentProvider, AgentProviderInput, AgentDecision } from './types';

class UnsupportedPrimaryProvider implements AgentProvider {
  constructor(public readonly name: string) {}

  public async handleMessage(_input: AgentProviderInput): Promise<AgentDecision> {
    throw new Error(`Provider ${this.name} is not implemented in this checkpoint`);
  }
}

export function createProviderRouter(config: Config): ProviderRouter {
  const ruleProvider = new RuleProvider();

  if (config.aiProvider === 'rule') {
    return new ProviderRouter(ruleProvider, undefined, false);
  }

  if (config.aiProvider === 'ollama') {
    const primary = new OllamaProvider(config.ollamaBaseUrl, config.ollamaModel, {
      keepAlive: config.ollamaKeepAlive,
      temperature: config.ollamaTemperature,
      numPredict: config.ollamaNumPredict,
      timeoutMs: config.providerTimeoutMs,
    });
    const fallback = config.enableRuleFallback ? ruleProvider : undefined;
    return new ProviderRouter(primary, fallback, config.enableRuleFallback);
  }

  const primary = new UnsupportedPrimaryProvider(config.aiProvider);
  const fallback = config.enableRuleFallback ? ruleProvider : undefined;

  return new ProviderRouter(primary, fallback, config.enableRuleFallback);
}
