import _ from 'lodash'
import { GameFSM } from '../game-fsm.ts'

type PieceType = 'cat' | 'kitten'
type PlayerNumber = 0 | 1
type Cell = { player: PlayerNumber | null, type: PieceType | null }

export interface BoopState {
  board: Cell[][]
  currentPlayer: PlayerNumber
  winner: PlayerNumber | null
  playerPieces: {
    [key: number]: {
      cats: number
      kittens: number
    }
  }
  pendingGraduations: { positions: [number, number][], allCats: boolean }[]
  needsPieceRemoval: boolean
}

export interface PlacePieceAction {
  type: 'place'
  player: PlayerNumber
  row: number
  col: number
  pieceType: PieceType
}

export interface SelectGraduationAction {
  type: 'select-graduation'
  player: PlayerNumber
  positions: [number, number][]
}

export interface RemovePieceAction {
  type: 'remove-piece'
  player: PlayerNumber
  row: number
  col: number
}

export type BoopAction =
  | PlacePieceAction
  | SelectGraduationAction
  | RemovePieceAction

interface BoopResult {
  oldPosition: [number, number]
  newPosition: [number, number] | null
  boopDirection: [number, number]
}


export class BoopFSM extends GameFSM<BoopState, BoopAction> {
  newInitState(_numPlayers: number): BoopState {
    const emptyBoard: Cell[][] = Array(6).fill(null).map(() => {
      return Array(6).fill(null).map(() => ({ player: null, type: null }))
    })

    return {
      board: emptyBoard,
      currentPlayer: 0,
      winner: null,
      playerPieces: {
        0: { cats: 0, kittens: 8 },
        1: { cats: 0, kittens: 8 },
      },
      pendingGraduations: [],
      needsPieceRemoval: false,
    }
  }

  takeAction(action: BoopAction): boolean {
    if (!this.validActions().some(va => _.isEqual(va, action))) {
      return false
    }

    if (action.type === 'place') {
      this.handlePlaceAction(action)

    } else if (action.type === 'select-graduation') {
      this.handleGraduation(action.positions)
      this.state.pendingGraduations = []
      this.state.needsPieceRemoval = false
      this.state.currentPlayer = this.state.currentPlayer === 0 ? 1 : 0

    } else if (action.type === 'remove-piece') {
      const piece = this.state.board[action.row][action.col]
      if (piece.type === 'kitten') {
        this.state.playerPieces[action.player].cats++
        this.addToDisplay(`${this.players[action.player].name} graduated a kitten to a cat`)
      } else {
        this.state.playerPieces[action.player].cats++
        this.addToDisplay(`${this.players[action.player].name} returned a cat to their pool`)
      }
      this.state.board[action.row][action.col] = { player: null, type: null }
      this.state.pendingGraduations = []
      this.state.needsPieceRemoval = false
      this.state.currentPlayer = this.state.currentPlayer === 0 ? 1 : 0
    }

    this.actionHistory.push(action)
    return true
  }

  private handlePlaceAction(action: PlacePieceAction): void {
    this.state.board[action.row][action.col] = {
      player: action.player,
      type: action.pieceType,
    }
    this.addToDisplay(`${this.players[action.player].name} placed a ${action.pieceType} at (${action.row}, ${action.col})`)

    if (action.pieceType === 'cat') {
      this.state.playerPieces[action.player].cats--
    } else {
      this.state.playerPieces[action.player].kittens--
    }
    this.performBoops(action.row, action.col)

    const threeInARows = this.checkThreeInARow(action.player)
    if (threeInARows.length > 0) {
      const cat3 = threeInARows.find(m => m.allCats)
      if (cat3) {
        const winner = this.state.board[cat3.positions[0][0]][cat3.positions[0][1]].player as PlayerNumber
        this.state.winner = winner
        this.addToDisplay(`${this.players[winner].name} wins with three cats in a row!`)
        return
      }
      this.state.pendingGraduations = threeInARows
    }

    const pieces = this.countBoardPieces(action.player)
    if (pieces.cats === 8) {
      this.state.winner = action.player
      this.addToDisplay(`${this.players[action.player].name} wins with 8 cats on the board!`)
      return
    } else if (pieces.cats + pieces.kittens === 8) {
      this.state.needsPieceRemoval = true
    }

    // If player has fewer than 8 pieces on the board and only one pending graduation, handle it automatically
    if (!this.state.needsPieceRemoval && this.state.pendingGraduations.length === 1) {
      this.handleGraduation(this.state.pendingGraduations[0].positions)
      this.state.pendingGraduations = []
    }

    if (!this.state.needsPieceRemoval && this.state.pendingGraduations.length === 0) {
      this.state.currentPlayer = this.state.currentPlayer === 0 ? 1 : 0
    }
  }

  public static isValidPosition(row: number, col: number): boolean {
    return row >= 0 && row < 6 && col >= 0 && col < 6
  }

  public static getBoopDirection(fromRow: number, fromCol: number, toRow: number, toCol: number): [number, number] {
    return [
      Math.sign(toRow - fromRow),
      Math.sign(toCol - fromCol),
    ]
  }

  public static canBoop(booper: Cell, boopee: Cell): boolean {
    if (!booper.type || !boopee.type) return false
    if (booper.type === 'cat') return true
    return boopee.type === 'kitten'
  }

  public static calculateBoops(
    board: Cell[][],
    placedRow: number,
    placedCol: number,
    placedPiece: Cell,
  ): BoopResult[] {
    const results = []
    const directions = [
      [-1,-1], [-1,0], [-1,1],
      [0,-1],          [0,1],
      [1,-1],  [1,0],  [1,1],
    ]

    for (const [dRow, dCol] of directions) {
      const targetRow = placedRow + dRow
      const targetCol = placedCol + dCol

      if (!this.isValidPosition(targetRow, targetCol)) continue

      const targetPiece = board[targetRow][targetCol]
      if (!this.canBoop(placedPiece, targetPiece)) continue

      const boopDirection = this.getBoopDirection(placedRow, placedCol, targetRow, targetCol)
      const newRow = targetRow + boopDirection[0]
      const newCol = targetCol + boopDirection[1]

      if (!this.isValidPosition(newRow, newCol)) {
        results.push({
          oldPosition: [targetRow, targetCol],
          newPosition: null,
          boopDirection,
        } as BoopResult)
      } else if (!board[newRow][newCol].type) {
        results.push({
          oldPosition: [targetRow, targetCol],
          newPosition: [newRow, newCol],
          boopDirection,
        } as BoopResult)
      }
    }

    return results
  }

  private performBoops(row: number, col: number): void {
    const boopResults = BoopFSM.calculateBoops(
      this.state.board,
      row,
      col,
      this.state.board[row][col],
    )

    for (const { oldPosition, newPosition } of boopResults) {
      const [oldRow, oldCol] = oldPosition
      const oldPiece = this.state.board[oldRow][oldCol]

      if (newPosition === null) {
        // Piece booped off board
        const owner = oldPiece.player as PlayerNumber
        if (oldPiece.type === 'cat') {
          this.state.playerPieces[owner].cats++
        } else {
          this.state.playerPieces[owner].kittens++
        }
        this.state.board[oldRow][oldCol] = { player: null, type: null }
      } else {
        // Move piece to new position
        const [newRow, newCol] = newPosition
        this.state.board[newRow][newCol] = this.state.board[oldRow][oldCol]
        this.state.board[oldRow][oldCol] = { player: null, type: null }
      }
    }
  }

  private checkThreeInARow(player: PlayerNumber): { positions: [number, number][], allCats: boolean }[] {
    const results: { positions: [number, number][], allCats: boolean }[] = []
    const directions = [
      [[0,1], [0,2]],  // horizontal
      [[1,0], [2,0]],  // vertical
      [[1,1], [2,2]],  // diagonal
      [[1,-1], [2,-2]], // other diagonal
    ]

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const start = this.state.board[row][col]
        if (start.type === null || start.player !== player) continue

        for (const [d1, d2] of directions) {
          const pos1: [number, number] = [row + d1[0], col + d1[1]]
          const pos2: [number, number] = [row + d2[0], col + d2[1]]
          if (!BoopFSM.isValidPosition(pos1[0], pos1[1]) || !BoopFSM.isValidPosition(pos2[0], pos2[1])) continue
          const piece1 = this.state.board[pos1[0]][pos1[1]]
          const piece2 = this.state.board[pos2[0]][pos2[1]]

          if (piece1.player === start.player && piece2.player === start.player) {
            const allCats = start.type === 'cat' && piece1.type === 'cat' && piece2.type === 'cat'
            results.push({
              positions: [[row, col], pos1, pos2],
              allCats,
            })
          }
        }
      }
    }

    return results
  }

  private handleGraduation(positions: [number, number][]): void {
    const player = this.state.board[positions[0][0]][positions[0][1]].player as PlayerNumber
    let kittenCount = 0
    for (const [row, col] of positions) {
      if (this.state.board[row][col].type === 'kitten') kittenCount++
      this.state.board[row][col] = { player: null, type: null }
    }
    this.state.playerPieces[player].cats += 3
    const kittenText = kittenCount === 1 ? 'kitten' : 'kittens'
    const catText = kittenCount === 1 ? 'a cat' : 'cats'
    this.addToDisplay(`${this.players[player].name} graduated ${kittenCount} ${kittenText} to ${catText}`)
  }

  private countBoardPieces(player: PlayerNumber): { cats: number, kittens: number } {
    let cats = 0, kittens = 0
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        const cell = this.state.board[row][col]
        if (cell.player === player) {
          if (cell.type === 'cat') cats++
          else if (cell.type === 'kitten') kittens++
        }
      }
    }
    return { cats, kittens }
  }

  validActions(): BoopAction[] {
    if (this.state.winner !== null) {
      return []
    }

    const player = this.state.currentPlayer

    // Check if there are pending graduations or 8 of the player's pieces on the board
    if (this.state.pendingGraduations.length > 0 || this.state.needsPieceRemoval) {
      const actions: BoopAction[] = this.state.pendingGraduations.map(match => ({
        type: 'select-graduation',
        player,
        positions: match.positions,
      }))

      // If we need to remove a piece, only allow removing own pieces
      if (this.state.needsPieceRemoval) {
        for (let row = 0; row < 6; row++) {
          for (let col = 0; col < 6; col++) {
            const cell = this.state.board[row][col]
            if (cell.player === player) {
              actions.push({ type: 'remove-piece', player, row, col })
            }
          }
        }
      }

      return actions
    }

    // Otherwise, allow placing pieces on empty cells
    const actions: BoopAction[] = []
    const pieces = this.state.playerPieces[player]

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 6; col++) {
        if (!this.state.board[row][col].type) {
          if (pieces.cats > 0) {
            actions.push({ type: 'place', player, row, col, pieceType: 'cat' })
          }
          if (pieces.kittens > 0) {
            actions.push({ type: 'place', player, row, col, pieceType: 'kitten' })
          }
        }
      }
    }

    return actions
  }

  hasEnded(): boolean {
    return this.state.winner !== null
  }
}
