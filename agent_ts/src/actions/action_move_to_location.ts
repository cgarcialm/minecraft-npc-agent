const { pathfinder, Movements, goals: { GoalNear } } = require('mineflayer-pathfinder');

export async function action_move_to_location(mcBot: any, mcData: any, parameters: any): Promise<[any, any]> {
  const { location_x, location_y, location_z } = parameters;

  console.log('location_x:', location_x);
  console.log('location_y:', location_y);
  console.log('location_z:', location_z);

  mcBot.chat('On my way...');

  if (!mcBot.pathfinder) {
    mcBot.loadPlugin(pathfinder);
  }

  if (!mcBot.pathfinder || typeof mcBot.pathfinder.goto !== 'function') {
    throw new Error('Pathfinder is not ready yet. Please try again in a moment.');
  }

  if (typeof mcBot.pathfinder.setMovements === 'function') {
    const defaultMove = new Movements(mcBot, mcData);
    defaultMove.allow1by1towers = true;
    defaultMove.canDig = true;
    mcBot.pathfinder.setMovements(defaultMove);
  }

  await mcBot.pathfinder.goto(new GoalNear(
    location_x,
    location_y,
    location_z,
    1
  ));

  if (typeof mcBot.pathfinder.isMoving === 'function') {
    console.log('isMoving:', mcBot.pathfinder.isMoving());
  }

  const responseBody = { "message": "Arrived at location." };
  const responseState = 'REPROMPT';
  return [responseBody, responseState];
}
