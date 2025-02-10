import { Player, GameFSMData, GameFSM } from './game-fsm.ts'
import { TicTacToeState, TicTacToeAction, TicTacToeFSM } from './games/tic-tac-toe.ts'
import ticTacToeRules from './games/tic-tac-toe-rules.ts'

export type GameState =
  | TicTacToeState

export type GameAction =
  | TicTacToeAction

interface GameFSMType {
  new (arg: Player[] | GameFSMData<GameState, GameAction>): GameFSM<GameState, GameAction>
  minPlayers: number
  maxPlayers: number
}

export interface GameInfo {
  name: string
  rules: string
  displayName: string
  jsxName: string
  FSMClass: GameFSMType
}

export const allGameInfo = new Map<string, GameInfo>([
  ['tic_tac_toe', {
    name: 'tic_tac_toe',
    rules: ticTacToeRules,
    displayName: 'Tic-tac-toe',
    jsxName: 'TicTacToe',
    FSMClass: TicTacToeFSM,
  }],
])
