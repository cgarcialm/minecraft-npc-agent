export interface AgentAction {
  name: string;
  args: Record<string, unknown>;
}

export interface AgentDecision {
  reply?: string;
  actions: AgentAction[];
}

export interface AgentProviderInput {
  user: string;
  text: string;
  worldState: {
    playerLocation?: {
      x: number;
      y: number;
      z: number;
    };
  };
  memory: Record<string, unknown>;
}

export interface AgentProvider {
  readonly name: string;
  handleMessage(input: AgentProviderInput): Promise<AgentDecision>;
  warmup?(): Promise<void>;
}

export interface ProviderSelectionResult {
  providerName: string;
  decision: AgentDecision;
  fallbackReason?: string;
}
