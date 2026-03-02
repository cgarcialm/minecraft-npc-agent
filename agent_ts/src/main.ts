import { MyFunctionHandler } from './action-handler';
import { loadConfig } from './config';
import { ActionExecutor } from './execution/action-executor';
import { createProviderRouter } from './providers/provider-factory';
import { OllamaResponseSynthesizer } from './providers/ollama-response-synthesizer';

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
let responseSynthesizer: OllamaResponseSynthesizer | undefined;
let enableResponseSynthesis = false;
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
    await providerRouter.warmup();
    enableResponseSynthesis = config.enableResponseSynthesis && config.aiProvider === 'ollama';
    responseSynthesizer = enableResponseSynthesis
      ? new OllamaResponseSynthesizer(
        config.ollamaBaseUrl,
        config.ollamaModel,
        config.responseSynthesisTimeoutMs,
      )
      : undefined;
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
    let hasChatResponse = false;

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

    if (selection.decision.reply && selection.decision.reply.trim().length > 0) {
      mcBot.chat(selection.decision.reply);
      hasChatResponse = true;
    }

    const actionResults = await executor.execute(username, selection.decision.actions);

    for (const result of actionResults) {
      if (!result.ok && result.error) {
        mcBot.chat(`Could not run ${result.action.name}: ${result.error}`);
        hasChatResponse = true;
        continue;
      }

      if (result.response && typeof result.response === 'object' && 'message' in (result.response as Record<string, unknown>)) {
        const responseMessage = (result.response as Record<string, unknown>).message;
        if (typeof responseMessage === 'string') {
          mcBot.chat(responseMessage);
          hasChatResponse = true;
        }
      }
    }

    if (!hasChatResponse) {
      const shouldSynthesize = Boolean(
        responseSynthesizer
        && enableResponseSynthesis
        && selection.providerName === 'ollama'
        && !selection.fallbackReason,
      );

      if (shouldSynthesize && responseSynthesizer) {
        try {
          const synthesized = await responseSynthesizer.synthesize({
            user: username,
            message,
            providerReply: selection.decision.reply,
            actions: selection.decision.actions,
            actionResults,
          });
          if (synthesized) {
            mcBot.chat(synthesized);
            hasChatResponse = true;
          }
        } catch (synthesisError) {
          const synthesisMessage = synthesisError instanceof Error ? synthesisError.message : 'response synthesis failed';
          logEvent('fallback_reason', {
            reason: synthesisMessage,
          });
        }
      }

      if (!hasChatResponse) {
        mcBot.chat(buildDeterministicReply(actionResults));
      }
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Provider handling failed';
    logEvent('action_error', { error: messageText });
    mcBot.chat(`I could not process that request: ${messageText}`);
  }
}

function buildDeterministicReply(actionResults: Array<{ ok: boolean; action: { name: string } }>): string {
  if (actionResults.length === 0) {
    return 'I heard you. Tell me what action to take.';
  }

  const successfulActions = actionResults
    .filter((result) => result.ok)
    .map((result) => result.action.name);

  if (successfulActions.length > 0) {
    return `Done: ${successfulActions.join(', ')}.`;
  }

  return 'I could not complete that request.';
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
