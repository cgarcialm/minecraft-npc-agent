import test from 'node:test';
import assert from 'node:assert/strict';
import { RuleProvider } from '../providers/rule-provider';

const provider = new RuleProvider();

const defaultInput = {
  user: 'Alex',
  worldState: {},
  memory: {},
};

test('parses hello', async () => {
  const decision = await provider.handleMessage({
    ...defaultInput,
    text: 'hello bot',
  });

  assert.equal(decision.actions.length, 0);
  assert.equal(decision.reply, 'Hello Alex.');
});

test('parses jump', async () => {
  const decision = await provider.handleMessage({
    ...defaultInput,
    text: 'jump',
  });

  assert.deepEqual(decision.actions, [{ name: 'action_jump', args: {} }]);
});

test('parses dig variants', async () => {
  const variants = ['dig 3x2', 'dig 3 by 2', 'dig a 3 by 2 hole'];

  for (const variant of variants) {
    const decision = await provider.handleMessage({
      ...defaultInput,
      text: variant,
    });

    assert.equal(decision.actions[0].name, 'action_dig');
    assert.deepEqual(decision.actions[0].args, { depth: 3, width: 2 });
  }
});

test('parses find and attack/hit with plan steps', async () => {
  const findDecision = await provider.handleMessage({
    ...defaultInput,
    text: 'find zombie',
  });

  assert.deepEqual(findDecision.actions, [
    {
      name: 'action_find_entity',
      args: { entity_name: 'zombie' },
    },
  ]);

  const attackDecision = await provider.handleMessage({
    ...defaultInput,
    text: 'attack zombie',
  });

  assert.deepEqual(attackDecision.actions, [
    {
      name: 'action_find_entity',
      args: { entity_name: 'zombie' },
    },
    {
      name: 'action_attack_nearest_entity',
      args: { entity_name: 'zombie' },
    },
  ]);

  const hitDecision = await provider.handleMessage({
    ...defaultInput,
    text: 'hit pig',
  });

  assert.deepEqual(hitDecision.actions, [
    {
      name: 'action_find_entity',
      args: { entity_name: 'pig' },
    },
    {
      name: 'action_attack_nearest_entity',
      args: { entity_name: 'pig' },
    },
  ]);
});

test('parses stop', async () => {
  const decision = await provider.handleMessage({
    ...defaultInput,
    text: 'stop',
  });

  assert.deepEqual(decision.actions, [{ name: 'action_stop', args: {} }]);
});

test('parses weather and time queries', async () => {
  const weatherDecision = await provider.handleMessage({
    ...defaultInput,
    text: 'is it raining?',
  });

  assert.deepEqual(weatherDecision.actions, [{ name: 'action_is_raining', args: {} }]);

  const timeDecision = await provider.handleMessage({
    ...defaultInput,
    text: 'what time is it',
  });

  assert.deepEqual(timeDecision.actions, [{ name: 'action_get_time', args: {} }]);
});

test('parses come to me when player location exists', async () => {
  const decision = await provider.handleMessage({
    ...defaultInput,
    text: 'come to me',
    worldState: {
      playerLocation: {
        x: 10.9,
        y: 70.4,
        z: -3.2,
      },
    },
  });

  assert.deepEqual(decision.actions, [
    {
      name: 'action_move_to_location',
      args: {
        location_x: 10,
        location_y: 70,
        location_z: -4,
      },
    },
  ]);
});
