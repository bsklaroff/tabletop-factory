import { Player, GameFSMData, GameFSM } from './game-fsm.ts'
import { TicTacToeState, TicTacToeAction, TicTacToeFSM } from './games/tic-tac-toe.ts'
import { BoopState, BoopAction, BoopFSM } from './games/boop.ts'
import ticTacToeRules from './games/tic-tac-toe-rules.ts'
import boopRules from './games/boop-rules.ts'

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
  rules: string
  displayName: string
  jsxName: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  FSMClass: GameFSMType<any, any>
}

export const allGameInfo = new Map<string, GameInfo>([
  ['tic_tac_toe', {
    name: 'tic_tac_toe',
    rules: ticTacToeRules,
    displayName: 'Tic-tac-toe',
    jsxName: 'TicTacToe',
    FSMClass: TicTacToeFSM,
  }],
  ['boop', {
    name: 'boop',
    rules: boopRules,
    displayName: 'Boop',
    jsxName: 'Boop',
    FSMClass: BoopFSM,
  }],
])
