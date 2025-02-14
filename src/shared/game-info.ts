import { Player, GameFSMData, GameFSM } from './game-fsm.ts'
import { TicTacToeState, TicTacToeAction, TicTacToeFSM } from './games/tic-tac-toe.ts'
import { BoopState, BoopAction, BoopFSM } from './games/boop.ts'

export type GameState =
  | TicTacToeState
  | BoopState

export type GameAction =
  | TicTacToeAction
  | BoopAction

interface GameFSMType<S, A> {
  new (arg: Player[] | GameFSMData<S, A>): GameFSM<S, A>
  minPlayers: number
  maxPlayers: number
}

export interface GameInfo {
  name: string
  displayName: string
  jsxName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FSMClass: GameFSMType<any, any>
  rulesFile: string
  fsmCodeFile: string
}

export const allGameInfo = new Map<string, GameInfo>([
  ['tic_tac_toe', {
    name: 'tic_tac_toe',
    displayName: 'Tic-tac-toe',
    jsxName: 'TicTacToe',
    FSMClass: TicTacToeFSM,
    rulesFile: 'tic-tac-toe-rules.txt',
    fsmCodeFile: 'tic-tac-toe.ts',
  }],
  ['boop', {
    name: 'boop',
    displayName: 'Boop',
    jsxName: 'Boop',
    FSMClass: BoopFSM,
    rulesFile: 'boop-rules.txt',
    fsmCodeFile: 'boop.ts',
  }],
])
