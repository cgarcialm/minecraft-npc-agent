import test from 'node:test';
import assert from 'node:assert/strict';
import { OllamaProvider, parseDecisionContent } from '../providers/ollama-provider';
import { AgentProviderInput } from '../providers/types';

const providerInput: AgentProviderInput = {
  user: 'Alex',
  text: 'jump once please',
  worldState: {},
  memory: {},
};

const ollamaOptions = {
  keepAlive: '30m',
  temperature: 0,
  numPredict: 64,
  timeoutMs: 2000,
};

test('parseDecisionContent accepts strict JSON with markdown fence and sanitizes actions', () => {
  const decision = parseDecisionContent(`\`\`\`json
{"reply":"ok","actions":[{"name":"action_jump","args":{}},{"name":"action_stop","args":{}}]}
\`\`\``);

  assert.equal(decision.reply, 'ok');
  assert.deepEqual(decision.actions, [
    { name: 'action_jump', args: {} },
    { name: 'action_stop', args: {} },
  ]);
});

test('parseDecisionContent rejects invalid JSON', () => {
  assert.throws(() => {
    parseDecisionContent('not-json');
  }, /not valid JSON/);
});

test('parseDecisionContent rejects unknown tool names', () => {
  assert.throws(() => {
    parseDecisionContent('{"actions":[{"name":"dance","args":{}}]}');
  }, /Unknown action: dance/);
});

test('parseDecisionContent rejects invalid args for known tools', () => {
  assert.throws(() => {
    parseDecisionContent('{"actions":[{"name":"action_find_entity","args":{"targetType":"Zombie"}}]}');
  }, /requires entity_name/);
});

test('ollama provider maps valid response content to AgentDecision', async () => {
  const provider = new OllamaProvider(
    'http://localhost:11434',
    'llama3.1:8b',
    ollamaOptions,
    async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            content: '{"reply":"Working on it.","actions":[{"name":"action_jump","args":{}}]}',
          },
        }),
      } as Response;
    },
    () => {},
  );

  const decision = await provider.handleMessage(providerInput);
  assert.equal(decision.reply, 'Working on it.');
  assert.deepEqual(decision.actions, [{ name: 'action_jump', args: {} }]);
});

test('ollama provider retries once when first decision is invalid and accepts repaired decision', async () => {
  let callCount = 0;
  const provider = new OllamaProvider(
    'http://localhost:11434',
    'llama3.1:8b',
    ollamaOptions,
    async () => {
      callCount += 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            content: callCount === 1
              ? '{"actions":[{"name":"say","args":{"text":"hi"}}]}'
              : '{"actions":[{"name":"action_jump","args":{}}]}',
          },
        }),
      } as Response;
    },
    () => {},
  );

  const decision = await provider.handleMessage(providerInput);
  assert.equal(callCount, 2);
  assert.deepEqual(decision.actions, [{ name: 'action_jump', args: {} }]);
});

test('ollama provider throws when decision remains invalid after repair retry', async () => {
  const provider = new OllamaProvider(
    'http://localhost:11434',
    'llama3.1:8b',
    ollamaOptions,
    async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            content: '{"actions":[{"name":"say","args":{"text":"hello"}}]}',
          },
        }),
      } as Response;
    },
    () => {},
  );

  await assert.rejects(async () => {
    await provider.handleMessage(providerInput);
  }, /invalid after repair/);
});
