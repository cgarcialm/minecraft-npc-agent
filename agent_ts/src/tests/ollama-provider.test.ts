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

test('parseDecisionContent accepts strict JSON with markdown fence and sanitizes actions', () => {
  const decision = parseDecisionContent(`\`\`\`json
{"reply":"ok","actions":[{"name":"action_jump","args":{}},{"name":42},{"name":"action_stop"}]}
\`\`\``);

  assert.equal(decision.reply, 'ok');
  assert.deepEqual(decision.actions, [
    { name: 'action_jump', args: {} },
    { name: 'action_stop', args: {} },
  ]);
});

test('parseDecisionContent maps say action to reply and move_to_location alias to canonical action', () => {
  const decision = parseDecisionContent(
    '{"actions":[{"name":"say","args":{"text":"hi"}},{"name":"move_to_location","args":{"location":{"x":1,"y":64,"z":2}}}]}',
  );

  assert.equal(decision.reply, 'hi');
  assert.deepEqual(decision.actions, [
    {
      name: 'action_move_to_location',
      args: {
        location_x: 1,
        location_y: 64,
        location_z: 2,
      },
    },
  ]);
});

test('parseDecisionContent remaps action_get_player_location with x/y/z args to move action', () => {
  const decision = parseDecisionContent(
    '{"actions":[{"name":"action_get_player_location","args":{"x":1,"y":64,"z":2}}]}',
  );

  assert.deepEqual(decision.actions, [
    {
      name: 'action_move_to_location',
      args: {
        location_x: 1,
        location_y: 64,
        location_z: 2,
      },
    },
  ]);
});

test('parseDecisionContent rejects invalid JSON', () => {
  assert.throws(() => {
    parseDecisionContent('not-json');
  }, /not valid JSON/);
});

test('parseDecisionContent rejects unsupported-only actions with no reply', () => {
  assert.throws(() => {
    parseDecisionContent('{"actions":[{"name":"dance","args":{}}]}');
  }, /unsupported actions/);
});

test('ollama provider maps valid response content to AgentDecision', async () => {
  const provider = new OllamaProvider(
    'http://localhost:11434',
    'llama3.1:8b',
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
  );

  const decision = await provider.handleMessage(providerInput);
  assert.equal(decision.reply, 'Working on it.');
  assert.deepEqual(decision.actions, [{ name: 'action_jump', args: {} }]);
});

test('ollama provider throws for malformed response content', async () => {
  const provider = new OllamaProvider(
    'http://localhost:11434',
    'llama3.1:8b',
    async () => {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: {
            content: '{"reply":"missing actions"}',
          },
        }),
      } as Response;
    },
  );

  await assert.rejects(async () => {
    await provider.handleMessage(providerInput);
  }, /missing actions array/);
});
