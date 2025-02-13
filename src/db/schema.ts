import { jsonb, pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { InferSelectModel } from 'drizzle-orm'

import type { GameFSMData } from '../shared/game-fsm.ts'
import type { GameState, GameAction } from '../shared/game-info.ts'
import type { GameSessionData } from '../shared/api-types.ts'

export const roomTable = pgTable('room', {
  id: uuid().primaryKey().defaultRandom(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const gameSessionTable = pgTable('game_session', {
  id: uuid().primaryKey().defaultRandom(),
  roomId: uuid().notNull().references(() => roomTable.id),
  gameName: text().notNull(),
  gameFSMData: jsonb().$type<GameFSMData<GameState, GameAction>>(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp({ withTimezone: true }),
});

export type GameSession = InferSelectModel<typeof gameSessionTable>

export function getGameSessionData(gameSession: GameSession): GameSessionData {
  return {
    gameName: gameSession.gameName,
    gameFSMData: gameSession.gameFSMData,
  }
}
