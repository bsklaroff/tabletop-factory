import { Server, Socket } from 'socket.io'
import { desc, eq } from 'drizzle-orm'

import db, { TXType } from './db/engine.ts'
import { gameSessionTable, GameSession, getGameSessionData } from './db/schema.ts'
import { RoomJoinData, GameStartData, GameActionData } from './shared/api-types.ts'
import { Player } from './shared/game-fsm.ts'
import { allGameInfo } from './shared/game-info.ts'
import { setupAIClient } from './ai-client.ts'


export function setupSocketServer(io: Server, port: number) {
  // activeSockets maps socketId -> playerId
  const activeSockets = new Map<string, string>()
  // activePlayers maps playerId -> Player info
  const activePlayers = new Map<string, Player>()
  // activeRooms maps roomId -> set of playerIds in room
  const activeRooms = new Map<string, Set<string>>()

  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)
    let currentRoomId: string | null = null

    socket.on('room:join', async ({ playerId, playerName, roomId }: RoomJoinData) => {
      await socket.join(roomId)
      currentRoomId = roomId
      const gameSession = await getActiveGameSession(roomId)

      activeSockets.set(socket.id, playerId)
      activePlayers.set(playerId, { id: playerId, name: playerName })
      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Set())
        // Reconnect any AI players from an existing game
        if (gameSession.gameFSMData !== null) {
          const aiPlayers = gameSession.gameFSMData.players.filter(p => p.id.startsWith('AI_'))
          aiPlayers.forEach(player => setupAIClient(port, roomId, player.id))
        }
      }

      const roomPlayerIds = activeRooms.get(roomId)!
      roomPlayerIds.add(playerId)

      const roomPlayers = getRoomPlayers(activePlayers, roomPlayerIds)
      io.to(roomId).emit('players:state', roomPlayers)
      io.to(roomId).emit('game:state', getGameSessionData(gameSession))
      console.log(`Player ${playerName} (${playerId}) joined room ${roomId}`)
    })

    socket.on('game:start', async ({ roomId, players }: GameStartData) => {
      if (players.some((p) => activePlayers.get(p.id) === undefined)) {
        console.warn(`game:start called for roomId ${roomId} but not all players are in the room`)
        return
      }

      await db.transaction(async (tx) => {
        let gameSession = await getActiveGameSession(roomId, tx)
        const gameInfo = allGameInfo.get(gameSession.gameName)!

        // Make sure the current game has either not started or already ended
        if (gameSession.gameFSMData !== null) {
          const prevGameFSM = new gameInfo.FSMClass(gameSession.gameFSMData)
          if (!prevGameFSM.hasEnded()) {
            console.warn(`game:start called for roomId ${roomId} but gameSession ${gameSession.id} has already started`)
            return
          } else {
            await tx.insert(gameSessionTable).values({
              roomId: roomId,
              gameName: gameSession.gameName,
            })
            gameSession = await getActiveGameSession(roomId, tx)
          }
        }

        gameSession.gameFSMData = (new gameInfo.FSMClass(players)).toData()
        await (
          tx.update(gameSessionTable)
          .set({ gameFSMData: gameSession.gameFSMData })
          .where(eq(gameSessionTable.id, gameSession.id))
        )
        io.to(roomId).emit('game:state', getGameSessionData(gameSession))
      })
    })

    socket.on('game:action', async ({ roomId, gameAction }: GameActionData) => {
      await db.transaction(async (tx) => {
        const gameSession = await getActiveGameSession(roomId, tx)
        if (gameSession.gameFSMData === null) {
          console.error(`game:action called for roomId ${roomId} but gameSession ${gameSession.id} has not started`)
          return
        }

        const gameInfo = allGameInfo.get(gameSession.gameName)!
        const gameFSM = new gameInfo.FSMClass(gameSession.gameFSMData)
        const validAction = gameFSM.takeAction(gameAction)
        if (!validAction) {
          console.error(`game:action called for roomId ${roomId} but action ${JSON.stringify(gameAction)} is not valid`)
          return
        }

        gameSession.gameFSMData = gameFSM.toData()
        await (
          tx.update(gameSessionTable)
          .set({ gameFSMData: gameSession.gameFSMData })
          .where(eq(gameSessionTable.id, gameSession.id))
        )
        io.to(roomId).emit('game:state', getGameSessionData(gameSession))
      })
    })

    socket.on('disconnect', () => {
      const playerId = activeSockets.get(socket.id)
      if (playerId === undefined) return
      activeSockets.delete(socket.id)

      // If this was the player's last socket, remove them from the room
      const remainingSockets = getPlayerSockets(activeSockets, playerId)
      if (remainingSockets.length === 0) {
        activePlayers.delete(playerId)

        if (currentRoomId === null) return
        const roomPlayerIds = activeRooms.get(currentRoomId)
        if (roomPlayerIds === undefined) return
        roomPlayerIds.delete(playerId)
        if (roomPlayerIds.size === 0) {
          activeRooms.delete(currentRoomId)
        } else {
          const remainingPlayers = getRoomPlayers(activePlayers, roomPlayerIds)
          io.to(currentRoomId).emit('players:state', remainingPlayers)
        }
      }
    })
  })
}

function getRoomPlayers(
  activePlayers: Map<string, Player>,
  roomPlayerIds: Set<string>,
): Player[] {
  return Array.from(roomPlayerIds).map((pid) => activePlayers.get(pid)!)
}

function getPlayerSockets(
  activeSockets: Map<string, string>,
  playerId: string,
): string[] {
  return (
    Array.from(activeSockets.entries())
    .filter((kvPair) => kvPair[1] === playerId)
    .map((kvPair) => kvPair[0])
  )
}

async function getActiveGameSession(
  roomId: string,
  tx?: TXType,
): Promise<GameSession> {
  const driver = (tx !== undefined) ? tx : db
  const gameSession = (await (
    driver.select()
    .from(gameSessionTable)
    .where(eq(gameSessionTable.roomId, roomId))
    .orderBy(desc(gameSessionTable.createdAt))
    .limit(1)
  ))[0]
  return gameSession
}
