import type { Player, GameFSMData } from './game-fsm.ts'
import type { GameState, GameAction } from './game-info.ts'


// HTTP Types

export interface CreateRoomReq {
  gameName: string
}

export interface CreateRoomRes {
  roomId: string
}

export interface AddAIReq {
  roomId: string
}


// WebSocket types

export interface RoomJoinData {
  playerId: string
  playerName: string
  roomId: string
}

export interface GameStartData {
  roomId: string
  players: Player[]
}

export interface GameActionData {
  roomId: string
  gameAction: GameAction
}

export interface GameSessionData {
  gameName: string
  gameFSMData: GameFSMData<GameState, GameAction> | null
}
