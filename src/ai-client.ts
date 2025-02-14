import fs from 'fs'
import path from 'path'
import { io } from 'socket.io-client'
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateText } from 'ai';

import { GameFSM } from './shared/game-fsm.ts'
import { RoomJoinData, GameSessionData, GameActionData } from './shared/api-types.ts'
import { allGameInfo, GameState, GameAction, GameInfo } from './shared/game-info.ts'

const openrouter = createOpenRouter({
  apiKey: process.env['TF_OPENROUTER_API_KEY'],
});

export function setupAIClient(port: number, roomId: string, playerId: string) {
  const socket = io(`http://localhost:${port}`)

  socket.on('connect', () => {
    console.log('AI Client connected')
    const joinData: RoomJoinData = {
      playerId: playerId,
      playerName: 'AI',
      roomId: roomId,
    }
    socket.emit('room:join', joinData)
  })

  socket.on('game:state', async ({ gameName, gameFSMData }: GameSessionData) => {
    if (gameFSMData === null) return
    const gameInfo = allGameInfo.get(gameName)!
    const gameFSM = new gameInfo.FSMClass(gameFSMData) as GameFSM<GameState, GameAction>

    const currentPlayerId = gameFSM.players[gameFSM.state.currentPlayer].id
    if (gameFSM.hasEnded() || currentPlayerId !== playerId) return

    const gameAction = await getAIAction(gameInfo, gameFSM)
    socket.emit('game:action', { roomId, gameAction } as GameActionData)
  })

  return socket
}

async function getAIAction(
  gameInfo: GameInfo,
  gameFSM: GameFSM<GameState, GameAction>,
): Promise<GameAction> {
  const rules = readGameFile(gameInfo.rulesFile)
  const fsmCode = readGameFile(gameInfo.fsmCodeFile)
  const systemPrompt = `You are playing a game of ${gameInfo.displayName}. Here are the rules:
<rules>
${rules}
</rules>

Here is the game's implementation code:
<code>
${fsmCode}
</code>

You will be provided with a game state, and asked to return the best possible move for the current player.

Think through this step-by-step and explain your reasoning:
1. Analyze the current game state
2. Consider the valid moves available
3. Choose the best move for the current player based on the game rules and current state
4. Explain why this is the best move

After your explanation, on a new line, output ONLY a JSON object representing your chosen action.
The action must match the types defined in the game code above.
Format it exactly like this:

ACTION:
{
  // your action JSON here
}`

  const userPrompt = `The current game state is:
<state>
${JSON.stringify(gameFSM.state, null, 2)}
</state>

You are the current player. Please give your reasoning, and then your best possible action.`

  console.log('Querying AI for next move...')
  const { text } = await generateText({
    model: openrouter('openai/o3-mini'),
    system: systemPrompt,
    prompt: userPrompt,
  })

  try {
    console.log('AI response:\n', text)
    let actionJSON = text.split('ACTION:').at(-1)?.trim()
    if (!actionJSON) {
      throw new Error('No ACTION section found in response')
    }
    if (actionJSON.startsWith('```json')) {
      actionJSON = actionJSON.match(/```json([\s\S]*?)```/)![1].trim()
    }
    const action = JSON.parse(actionJSON) as GameAction
    return action;
  } catch (e) {
    console.error('Failed to parse AI response:', e);
    throw new Error('Invalid AI response format');
  }
}

function readGameFile(filename: string): string {
  const filepath = path.join(import.meta.dirname, 'shared/games', filename)
  return fs.readFileSync(filepath, 'utf8')
}
