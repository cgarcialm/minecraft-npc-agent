import test from 'node:test';
import assert from 'node:assert/strict';
import { ActionExecutor } from '../execution/action-executor';
import { FunctionHandler } from '../action-handler';
import { Config } from '../config';

const baseConfig: Config = {
  mcHost: '127.0.0.1',
  mcUsername: 'Rocky',
  mcAuth: 'offline',
  mcPort: 25565,
  mcVersion: '1.20.1',
  aiProvider: 'rule',
  enableRuleFallback: true,
  enableSafety: true,
  maxActionsPerMessage: 1,
  disableActionBuild: true,
  actionTimeoutMs: 40,
  actionCooldownMs: 100,
};

class FakeFunctionHandler implements FunctionHandler {
  constructor(private readonly fn: (functionName: string, parameters: any) => Promise<[any, any]>) {}

  async callFunction(functionName: string, parameters: any): Promise<[any, any]> {
    return await this.fn(functionName, parameters);
  }
}

function createExecutor(handler: FunctionHandler, configOverrides?: Partial<Config>): ActionExecutor {
  return new ActionExecutor(
    handler,
    {
      ...baseConfig,
      ...configOverrides,
    },
    () => {
      // no-op logger for tests
    },
  );
}

test('rejects non-allowlisted actions', async () => {
  const handler = new FakeFunctionHandler(async () => [{ message: 'ok' }, 'REPROMPT']);
  const executor = createExecutor(handler);

  const results = await executor.execute('Alex', [{ name: 'action_build', args: {} }]);

  assert.equal(results[0].ok, false);
  assert.match(results[0].error ?? '', /disabled by policy/);
});

test('enforces max actions per message', async () => {
  const handler = new FakeFunctionHandler(async () => [{ message: 'ok' }, 'REPROMPT']);
  const executor = createExecutor(handler);

  const results = await executor.execute('Alex', [
    { name: 'action_jump', args: {} },
    { name: 'action_stop', args: {} },
  ]);

  assert.equal(results.length, 2);
  assert.equal(results[0].ok, true);
  assert.equal(results[1].ok, false);
  assert.match(results[1].error ?? '', /Max actions exceeded/);
});

test('enforces cooldown per user/action', async () => {
  const handler = new FakeFunctionHandler(async () => [{ message: 'ok' }, 'REPROMPT']);
  const executor = createExecutor(handler, { maxActionsPerMessage: 3 });

  const first = await executor.execute('Alex', [{ name: 'action_jump', args: {} }]);
  const second = await executor.execute('Alex', [{ name: 'action_jump', args: {} }]);

  assert.equal(first[0].ok, true);
  assert.equal(second[0].ok, false);
  assert.match(second[0].error ?? '', /cooldown/i);
});

test('enforces action timeout', async () => {
  const handler = new FakeFunctionHandler(async () => {
    return await new Promise<[any, any]>(() => {
      // never resolves
    });
  });
  const executor = createExecutor(handler, { maxActionsPerMessage: 3, actionTimeoutMs: 10 });

  const results = await executor.execute('Alex', [{ name: 'action_jump', args: {} }]);

  assert.equal(results[0].ok, false);
  assert.match(results[0].error ?? '', /timed out/i);
});
