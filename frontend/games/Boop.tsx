import { useState } from 'react'

import { BoopFSM, BoopAction } from '@shared/games/boop.ts'
import boopCat0 from '../assets/boop_cat0.png'
import boopCat1 from '../assets/boop_cat1.png'
import boopKitten0 from '../assets/boop_kitten0.png'
import boopKitten1 from '../assets/boop_kitten1.png'
import './Boop.css'

interface BoopProps {
  fsm: BoopFSM | null
  takeAction: (action: BoopAction) => void
  replayMode: boolean
}

function Boop({ fsm, takeAction, replayMode }: BoopProps) {
  type BoardMode = 'display' | 'place' | 'remove' | 'graduate'

  const [selectedPieceType, setSelectedPieceType] = useState<'cat' | 'kitten' | null>(null)
  const [selectedAction, setSelectedAction] = useState<'remove' | 'graduate' | null>(null)
  const [selectedGraduationCells, setSelectedGraduationCells] = useState<{row: number, col: number}[]>([])

  const getBoardMode = (): BoardMode => {
    if (replayMode || !isCurrentPlayer || fsm?.state.winner !== null) {
      return 'display'
    }
    if (fsm.state.needsPieceRemoval && fsm.state.pendingGraduations.length > 0) {
      return selectedAction === 'remove' ? 'remove' : selectedAction === 'graduate' ? 'graduate' : 'display'
    }
    if (fsm.state.needsPieceRemoval) {
      return 'remove'
    }
    if (fsm.state.pendingGraduations.length > 0) {
      return 'graduate'
    }
    return 'place'
  }

  if (!fsm) return null

  const playerId = localStorage.getItem('playerId')
  const playerIndex = fsm.players.findIndex((p) => p.id === playerId)
  const isCurrentPlayer = playerIndex === fsm.state.currentPlayer
  const validMoves = fsm?.validActions()

  const handlePlacePiece = (row: number, col: number) => {
    if (!fsm.state.board[row][col].type) {
      let pieceType = selectedPieceType

      // Automatically select piece type if only one is available
      if (!pieceType) {
        if (fsm.state.playerPieces[fsm.state.currentPlayer].cats === 0) {
          pieceType = 'kitten'
        } else if (fsm.state.playerPieces[fsm.state.currentPlayer].kittens === 0) {
          pieceType = 'cat'
        }
      }

      if (pieceType) {
        const placeAction = validMoves.find((move) => (
          move.type === 'place' &&
          move.row === row &&
          move.col === col &&
          move.pieceType === pieceType
        ))
        if (placeAction) {
          takeAction(placeAction)
          setSelectedPieceType(null)
        }
      }
    }
  }

  const handleRemovePiece = (row: number, col: number) => {
    const removeAction = validMoves.find((move) => (
      move.type === 'remove-piece' &&
      move.row === row &&
      move.col === col
    ))
    if (removeAction) {
      takeAction(removeAction)
      setSelectedAction(null)
    }
  }

  const handleGraduate = (row: number, col: number) => {
    const clickedCell = { row, col }

    // If the cell is already selected, deselect it
    if (selectedGraduationCells.some((cell) => cell.row === row && cell.col === col)) {
      setSelectedGraduationCells(selectedGraduationCells.filter((cell) => (
        cell.row !== row || cell.col !== col
      )))
      return
    }

    // Get all graduation actions that include this cell
    const graduationCells = [...selectedGraduationCells, clickedCell]
    const graduationActions = validMoves.filter((move) => (
      move.type === 'select-graduation' &&
      graduationCells.every((cell) => (
        move.positions.some(([r, c]) => r === cell.row && c === cell.col)
      ))
    ))

    // If there's only one possible graduation with this cell, do it
    if (graduationActions.length === 1) {
      takeAction(graduationActions[0])
      setSelectedAction(null)
      setSelectedGraduationCells([])

    // Otherwise, add this cell to the selection if it's compatible
    } else if (graduationActions.length > 0) {
      setSelectedGraduationCells(graduationCells)
    }
  }

  const handleCellClick = (row: number, col: number) => {
    const mode = getBoardMode()
    if (mode === 'place') {
      handlePlacePiece(row, col)
    } else if (mode === 'remove') {
      handleRemovePiece(row, col)
    } else if (mode === 'graduate') {
      handleGraduate(row, col)
    }
  }

  const getCellClass = (row: number, col: number) => {
    const classes = ['cell']
    const mode = getBoardMode()
    if (mode === 'place') {
      const hasOnlyOnePieceType = (
        fsm.state.playerPieces[fsm.state.currentPlayer].cats === 0 ||
        fsm.state.playerPieces[fsm.state.currentPlayer].kittens === 0
      )
      if (validMoves.some((move) => (
        move.type === 'place' &&
        move.row === row &&
        move.col === col
      )) && (selectedPieceType || hasOnlyOnePieceType)) {
        classes.push('cell-valid')
      }
    } else if (mode === 'remove') {
      if (validMoves.some((move) => (
        move.type === 'remove-piece' &&
        move.row === row &&
        move.col === col
      ))) {
        classes.push('cell-valid')
      }
    } else if (mode === 'graduate') {
      // Get all graduation actions that include this cell
      const graduationCells = [...selectedGraduationCells, { row, col }]
      const graduationActions = validMoves.filter((move) => (
        move.type === 'select-graduation' &&
        graduationCells.every((cell) => (
          move.positions.some(([r, c]) => r === cell.row && c === cell.col)
        ))
      ))
      if (graduationActions.length > 0) {
        classes.push('cell-valid')
      }
      if (selectedGraduationCells.some((cell) => cell.row === row && cell.col === col)) {
        classes.push('cell-selected')
      }
    }
    return classes.join(' ')
  }

  const renderPiece = (row: number, col: number) => {
    const cell = fsm.state.board[row][col]
    if (!cell.type || cell.player === null) return null

    const classes = [
      'piece',
      `player-${cell.player}`,
      cell.type,
    ]

    const pieceImage = {
      cat: {
        0: boopCat0,
        1: boopCat1,
      },
      kitten: {
        0: boopKitten0,
        1: boopKitten1,
      },
    }[cell.type][cell.player]

    return (
      <div className={classes.join(' ')}>
        <img src={pieceImage} alt={cell.type} />
      </div>
    )
  }

  const renderPieceCount = (player: number) => {
    const pieces = fsm.state.playerPieces[player]
    const isCurrentPlayerPieces = player === fsm.state.currentPlayer
    return (
      <div className={`player-pieces player-${player} ${isCurrentPlayerPieces ? 'current' : ''}`}>
        <div>{fsm.players[player].name}</div>
        <div className="piece-type-counts">
          <div>Cats: {pieces.cats}</div>
          <div>Kittens: {pieces.kittens}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="boop">
      <div className="piece-count">
        {renderPieceCount(0)}
        {renderPieceCount(1)}
      </div>

      <div className="board">
        {fsm.state.board.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((_, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                onMouseDown={(e) => e.preventDefault()}
                disabled={(
                  getBoardMode() === 'display' ||
                  !getCellClass(rowIndex, colIndex).includes('cell-valid')
                )}
              >
                {renderPiece(rowIndex, colIndex)}
              </button>
            ))}
          </div>
        ))}
      </div>

      {fsm.state.winner !== null ? (
        <div className="winner-message">
          {`${fsm.players[fsm.state.winner].name} wins!`}
        </div>
      ) : !replayMode && isCurrentPlayer && (
        <>
          {!fsm.state.needsPieceRemoval && !fsm.state.pendingGraduations.length && (
            <div className="piece-selection">
              {fsm.state.playerPieces[fsm.state.currentPlayer].cats === 0 ? (
                <div>Place a Kitten ({fsm.state.playerPieces[fsm.state.currentPlayer].kittens} left)</div>
              ) : fsm.state.playerPieces[fsm.state.currentPlayer].kittens === 0 ? (
                <div>Place a Cat ({fsm.state.playerPieces[fsm.state.currentPlayer].cats} left)</div>
              ) : (
                <>
                  <div>Select piece type to place:</div>
                  <div className="piece-buttons">
                    <button
                      onClick={() => setSelectedPieceType('cat')}
                      disabled={!fsm.state.playerPieces[fsm.state.currentPlayer].cats}
                      className={selectedPieceType === 'cat' ? 'selected' : ''}
                    >
                      Place a Cat ({fsm.state.playerPieces[fsm.state.currentPlayer].cats} left)
                    </button>
                    <button
                      onClick={() => setSelectedPieceType('kitten')}
                      disabled={!fsm.state.playerPieces[fsm.state.currentPlayer].kittens}
                      className={selectedPieceType === 'kitten' ? 'selected' : ''}
                    >
                      Place a Kitten ({fsm.state.playerPieces[fsm.state.currentPlayer].kittens} left)
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {fsm.state.needsPieceRemoval && fsm.state.pendingGraduations.length > 0 && (
            <div className="piece-selection">
              <div>You have 8 pieces and three-in-a-row. Choose your action:</div>
              <div className="piece-buttons">
                <button
                  onClick={() => setSelectedAction('remove')}
                  className={selectedAction === 'remove' ? 'selected' : ''}
                >
                  Graduate a Single Piece
                </button>
                <button
                  onClick={() => setSelectedAction('graduate')}
                  className={selectedAction === 'graduate' ? 'selected' : ''}
                >
                  Graduate Three-in-a-Row
                </button>
              </div>
              {selectedAction === 'remove' && (
                <div>Select a kitten to graduate, or cat to remove</div>
              )}
              {selectedAction === 'graduate' && (
                <div>Select which three-in-a-row to graduate</div>
              )}
            </div>
          )}

          {fsm.state.needsPieceRemoval && !fsm.state.pendingGraduations.length && (
            <div>You have 8 pieces on the board. Select a kitten to graduate, or cat to remove.</div>
          )}

          {!fsm.state.needsPieceRemoval && fsm.state.pendingGraduations.length > 0 && (
            <div>Select which three-in-a-row to graduate</div>
          )}
        </>
      )}

    </div>
  )
}

export default Boop
