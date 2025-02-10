import _ from 'lodash'

import { GameFSM } from '../game-fsm.ts'

type PlayerNumber = -1 | 0 | 1

export interface TicTacToeState {
  board: PlayerNumber[][]
  currentPlayer: PlayerNumber
  winner: PlayerNumber | null
}

export interface TicTacToeAction {
  player: PlayerNumber
  row: number
  col: number
}

export class TicTacToeFSM extends GameFSM<TicTacToeState, TicTacToeAction> {
  newInitState(_numPlayers: number): TicTacToeState {
    return {
      board: [
        [-1, -1, -1],
        [-1, -1, -1],
        [-1, -1, -1],
      ],
      currentPlayer: 0,
      winner: null,
    }
  }

  takeAction(action: TicTacToeAction): boolean {
    if (!this.validActions().some((va) => _.isEqual(va, action))) {
      return false
    }

    this.state.board[action.row][action.col] = action.player
    this.addToDisplay(`${this.players[action.player].name} played (${action.row}, ${action.col})`)

    const winner = this.checkWinner()
    if (winner !== null) {
      this.state.winner = winner
      if (this.state.winner === -1) {
        this.addToDisplay('Game ends in a draw')
      } else {
        this.addToDisplay(`${this.players[winner].name} wins!`)
      }
    }

    this.state.currentPlayer = this.state.currentPlayer === 0 ? 1 : 0
    this.actionHistory.push(action)
    return true
  }

  validActions(): TicTacToeAction[] {
    if (this.state.winner !== null) {
      return []
    }
    const actions: TicTacToeAction[] = []
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        if (this.state.board[row][col] === -1) {
          actions.push({ player: this.state.currentPlayer, row, col })
        }
      }
    }
    return actions
  }

  hasEnded(): boolean {
    return this.state.winner !== null
  }

  private checkWinner(): PlayerNumber | null {
    const board = this.state.board

    // Check rows
    for (let row = 0; row < 3; row++) {
      if (board[row][0] !== -1 &&
          board[row][0] === board[row][1] &&
          board[row][1] === board[row][2]) {
        return board[row][0]
      }
    }

    // Check columns
    for (let col = 0; col < 3; col++) {
      if (board[0][col] !== -1 &&
          board[0][col] === board[1][col] &&
          board[1][col] === board[2][col]) {
        return board[0][col]
      }
    }

    // Check diagonals
    if (board[0][0] !== -1 &&
        board[0][0] === board[1][1] &&
        board[1][1] === board[2][2]) {
      return board[0][0]
    }

    if (board[0][2] !== -1 &&
        board[0][2] === board[1][1] &&
        board[1][1] === board[2][0]) {
      return board[0][2]
    }

    // Check if board is full (draw)
    const isBoardFull = board.every(row => row.every(cell => cell !== -1))
    if (isBoardFull) {
      return -1
    }

    return null
  }
}
