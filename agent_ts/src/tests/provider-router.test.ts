import test from 'node:test';
import assert from 'node:assert/strict';
import { ProviderRouter } from '../providers/provider-router';
import { AgentProvider, AgentProviderInput } from '../providers/types';

class StaticProvider implements AgentProvider {
  constructor(
    public readonly name: string,
    private readonly fn: (input: AgentProviderInput) => Promise<any>,
  ) {}

  async handleMessage(input: AgentProviderInput): Promise<any> {
    return await this.fn(input);
  }
}

const input: AgentProviderInput = {
  user: 'Steve',
  text: 'jump',
  worldState: {},
  memory: {},
};

test('falls back when primary provider throws and fallback enabled', async () => {
  const primary = new StaticProvider('primary', async () => {
    throw new Error('primary unavailable');
  });

  const fallback = new StaticProvider('rule', async () => ({
    actions: [{ name: 'action_jump', args: {} }],
  }));

  const router = new ProviderRouter(primary, fallback, true);
  const result = await router.handleMessage(input);

  assert.equal(result.providerName, 'rule');
  assert.equal(result.fallbackReason, 'primary unavailable');
  assert.equal(result.decision.actions[0].name, 'action_jump');
});

test('throws when primary provider fails and fallback disabled', async () => {
  const primary = new StaticProvider('primary', async () => {
    throw new Error('primary unavailable');
  });

  const router = new ProviderRouter(primary, undefined, false);

  await assert.rejects(async () => {
    await router.handleMessage(input);
  }, /primary unavailable/);
});

test('falls back when primary returns malformed decision', async () => {
  const primary = new StaticProvider('primary', async () => ({
    message: 'wrong shape',
  }));

  const fallback = new StaticProvider('rule', async () => ({
    actions: [{ name: 'action_stop', args: {} }],
  }));

  const router = new ProviderRouter(primary, fallback, true);
  const result = await router.handleMessage(input);

  assert.equal(result.providerName, 'rule');
  assert.match(result.fallbackReason ?? '', /missing actions array/);
});
