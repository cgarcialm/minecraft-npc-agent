import { MyFunctionHandler } from './action-handler';
import { loadConfig } from './config';
import { ActionExecutor } from './execution/action-executor';
import { createProviderRouter } from './providers/provider-factory';

import * as dotenv from 'dotenv';
dotenv.config();

const mineflayer = require('mineflayer');
const {
  pathfinder,
  Movements,
} = require('mineflayer-pathfinder');

const collectblock = require('mineflayer-collectblock').plugin;

let mcBot: any;
let providerRouter: ReturnType<typeof createProviderRouter>;
let executor: ActionExecutor;
let messageQueue: Promise<void> = Promise.resolve();

function logEvent(event: string, payload: Record<string, unknown>): void {
  console.log(JSON.stringify({ event, ...payload }));
}

async function startBot() {
  try {
    const config = await loadConfig();

    console.log('Starting bot...', config);

    mcBot = mineflayer.createBot({
      host: config.mcHost,
      username: config.mcUsername,
      auth: config.mcAuth,
      port: config.mcPort,
      version: config.mcVersion,
    });

    const mcData = require('minecraft-data')(config.mcVersion);

    const functionHandler = new MyFunctionHandler(mcBot, mcData);
    providerRouter = createProviderRouter(config);
    executor = new ActionExecutor(functionHandler, config, logEvent, async () => {
      mcBot.clearControlStates();
      if (mcBot.pathfinder?.stop) {
        mcBot.pathfinder.stop();
      }
      if (mcBot.creative?.stopFlying) {
        mcBot.creative.stopFlying();
      }
    });

    mcBot.once('spawn', initializeBot);
    mcBot.on('chat', handleChatCommands);
  } catch (error) {
    console.error('Error starting the bot:', error);
  }
}

startBot();

function initializeBot() {
  mcBot.loadPlugin(pathfinder);
  mcBot.loadPlugin(collectblock);

  const defaultMove = new Movements(mcBot);
  defaultMove.allow1by1towers = true;
  defaultMove.canDig = true;
  defaultMove.scafoldingBlocks.push(mcBot.registry.itemsByName['acacia_slab'].id);
  mcBot.pathfinder.setMovements(defaultMove);

  console.log('Bot spawned');
}

async function handleChatCommands(username: string, message: string) {
  messageQueue = messageQueue
    .then(async () => {
      await processChatCommand(username, message);
    })
    .catch((error) => {
      const messageText = error instanceof Error ? error.message : 'Queued message handling failed';
      logEvent('action_error', { error: messageText });
    });
}

async function processChatCommand(username: string, message: string) {
  if (username === mcBot.username || message.includes('Teleport')) {
    return;
  }

  if (message.endsWith(']')) {
    return;
  }

  if (message === 'reset') {
    mcBot.chat('Local mode has no cloud session state to reset.');
    return;
  }

  const worldState = {
    playerLocation: getPlayerLocation(username),
  };

  const providerInput = {
    user: username,
    text: message,
    worldState,
    memory: {},
  };

  logEvent('message_in', {
    user: username,
    text: message,
  });

  try {
    const selection = await providerRouter.handleMessage(providerInput);

    logEvent('provider_selected', {
      provider: selection.providerName,
    });

    if (selection.fallbackReason) {
      logEvent('fallback_reason', {
        reason: selection.fallbackReason,
      });
    }

    logEvent('provider_decision', {
      decision: selection.decision,
    });

    if (selection.decision.reply) {
      mcBot.chat(selection.decision.reply);
    }

    const actionResults = await executor.execute(username, selection.decision.actions);

    for (const result of actionResults) {
      if (!result.ok && result.error) {
        mcBot.chat(`Could not run ${result.action.name}: ${result.error}`);
        continue;
      }

      if (result.response && typeof result.response === 'object' && 'message' in (result.response as Record<string, unknown>)) {
        const responseMessage = (result.response as Record<string, unknown>).message;
        if (typeof responseMessage === 'string') {
          mcBot.chat(responseMessage);
        }
      }
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Provider handling failed';
    logEvent('action_error', { error: messageText });
    mcBot.chat(`I could not process that request: ${messageText}`);
  }
}

function getPlayerLocation(username: string): { x: number; y: number; z: number } | undefined {
  const player = mcBot.players[username];
  if (!player || !player.entity || !player.entity.position) {
    return undefined;
  }

  const position = player.entity.position;
  return {
    x: position.x,
    y: position.y,
    z: position.z,
  };
}
