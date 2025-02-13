import _ from 'lodash'
import { useState, useEffect, useRef } from 'react'

import { BoopFSM, BoopAction } from '@shared/games/boop.ts'
import boopCat0 from '../assets/boop_cat0.png'
import boopCat1 from '../assets/boop_cat1.png'
import boopKitten0 from '../assets/boop_kitten0.png'
import boopKitten1 from '../assets/boop_kitten1.png'
import './Boop.css'

interface SlidingPiece {
  from: { row: number, col: number }
  to: { row: number, col: number }
  player: number
  type: 'cat' | 'kitten'
}

interface FadingPiece {
  row: number
  col: number
  player: number
  type: 'cat' | 'kitten'
  boopDirection: [number, number] | null
}

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
  const [slidingPieces, setSlidingPieces] = useState<SlidingPiece[]>([])
  const [fadingPieces, setFadingPieces] = useState<FadingPiece[]>([])
  const prevFSMRef = useRef<BoopFSM | null>(fsm)

  // Handle animations when FSM updates
  useEffect(() => {
    if (!fsm) return

    let prevFSM = prevFSMRef.current
    prevFSMRef.current = fsm
    if (replayMode) {
      prevFSM = fsm.copy()
      prevFSM.undo()
    }

    if (prevFSM !== null && !_.isEqual(prevFSM.state, fsm.state)) {
      const newSlidingPieces: SlidingPiece[] = []
      const newFadingPieces: FadingPiece[] = []

      const lastAction = fsm.actionHistory.at(-1)
      if (lastAction === undefined) {
        return
      }
      if (lastAction.type === 'place') {
        // If the placed piece itself was graduated and removed, add a fade animation
        if (!fsm.state.board[lastAction.row][lastAction.col].type) {
            newFadingPieces.push({
              row: lastAction.row,
              col: lastAction.col,
              player: lastAction.player,
              type: lastAction.pieceType,
              boopDirection: null,
            })
        }

        // Calculate boop animations for any remaining pieces
        const boopResults = BoopFSM.calculateBoops(
          prevFSM.state.board,
          lastAction.row,
          lastAction.col,
          { player: lastAction.player, type: lastAction.pieceType },
        )

        for (const { oldPosition, newPosition, boopDirection } of boopResults) {
          const [oldRow, oldCol] = oldPosition
          const piece = prevFSM.state.board[oldRow][oldCol]

          const [newRow, newCol] = newPosition !== null ? newPosition : [0, 0]
          if (newPosition === null || !fsm.state.board[newRow][newCol].type) {
            // Piece was booped off-board or graduated, so add slide-and-fade animation
            newFadingPieces.push({
              row: oldRow,
              col: oldCol,
              player: piece.player!,
              type: piece.type!,
              boopDirection: boopDirection,
            })
          } else {
            // Piece was booped to new position - add slide animation
            newSlidingPieces.push({
              from: { row: oldRow, col: oldCol },
              to: { row: newRow, col: newCol },
              player: piece.player!,
              type: piece.type!,
            })
          }
        }
      }

      // Handle any non-boop graduation + removal actions by just fading removed pieces
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
          const prevCell = prevFSM.state.board[row][col]
          const alreadyAnimating = (
            newFadingPieces.some(p => p.row === row && p.col === col) ||
            newSlidingPieces.some(p => p.from.row === row && p.from.col === col)
          )
          if (prevCell.type && !fsm.state.board[row][col].type && !alreadyAnimating) {
            newFadingPieces.push({
              row, col,
              player: prevCell.player!,
              type: prevCell.type,
              boopDirection: null,
            })
          }
        }
      }

      setSlidingPieces(newSlidingPieces)
      setFadingPieces(newFadingPieces)

      // Clear slidingPieces after they complete
      const timeout = setTimeout(() => {
        setSlidingPieces([])
        setFadingPieces([])
      }, 1000)

      return () => clearTimeout(timeout)
    }
  }, [fsm, replayMode])

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
    const classes = ['boop-cell']
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
        classes.push('boop-cell-valid')
      }
    } else if (mode === 'remove') {
      if (validMoves.some((move) => (
        move.type === 'remove-piece' &&
        move.row === row &&
        move.col === col
      ))) {
        classes.push('boop-cell-valid')
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
        classes.push('boop-cell-valid')
      }
      if (selectedGraduationCells.some((cell) => cell.row === row && cell.col === col)) {
        classes.push('boop-cell-selected')
      }
    }
    return classes.join(' ')
  }

  const renderPiece = (row: number, col: number) => {
    const cell = fsm.state.board[row][col]

    // Check for fading or sliding-fading pieces
    if (!cell.type || cell.player === null) {
      const fadingPiece = fadingPieces.find(p => p.row === row && p.col === col)
      if (fadingPiece) {
        const pieceImage = {
          cat: { 0: boopCat0, 1: boopCat1 },
          kitten: { 0: boopKitten0, 1: boopKitten1 },
        }[fadingPiece.type][fadingPiece.player as 0 | 1]

        let animationClass = 'fading'
        let style = {}
        if (fadingPiece.boopDirection !== null) {
          animationClass = 'sliding-fading'
          const cellSize = 84
          const endX = cellSize * fadingPiece.boopDirection[1]
          const endY = cellSize * fadingPiece.boopDirection[0]
          style = {
            '--start-x': '0px',
            '--start-y': '0px',
            '--end-x': `${endX}px`,
            '--end-y': `${endY}px`,
          } as React.CSSProperties
        }

        return (
          <div
            className={`boop-piece boop-player-${fadingPiece.player} ${fadingPiece.type} boop-${animationClass}`}
            style={style}
          >
            <img src={pieceImage} alt={fadingPiece.type} />
          </div>
        )
      }
      return null
    }

    const slidingPiece = slidingPieces.find((a) => a.to.row === row && a.to.col === col)
    const style = slidingPiece ? {
      '--start-x': `${(slidingPiece.from.col - col) * 84}px`,
      '--start-y': `${(slidingPiece.from.row - row) * 84}px`,
      '--end-x': '0px',
      '--end-y': '0px',
    } as React.CSSProperties : undefined

    const classes = [
      'boop-piece',
      `boop-player-${cell.player}`,
      cell.type,
      slidingPiece ? 'boop-sliding' : '',
    ]

    const pieceImage = {
      cat: { 0: boopCat0, 1: boopCat1 },
      kitten: { 0: boopKitten0, 1: boopKitten1 },
    }[cell.type][cell.player]

    return (
      <div className={classes.join(' ')} style={style}>
        <img src={pieceImage} alt={cell.type} />
      </div>
    )
  }

  const renderPieceCount = (player: number) => {
    const pieces = fsm.state.playerPieces[player]
    const isCurrentPlayerPieces = player === fsm.state.currentPlayer
    return (
      <div className={`boop-player-pieces boop-player-${player} ${isCurrentPlayerPieces ? 'boop-current' : ''}`}>
        <div>{fsm.players[player].name}</div>
        <div className="boop-piece-type-counts">
          <div>Cats: {pieces.cats}</div>
          <div>Kittens: {pieces.kittens}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="boop-game">
      <div className="boop-piece-count">
        {renderPieceCount(0)}
        {renderPieceCount(1)}
      </div>

      <div className="boop-board">
        {fsm.state.board.map((row, rowIndex) => (
          <div key={rowIndex} className="boop-row">
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
        <div className="boop-winner-message">
          {`${fsm.players[fsm.state.winner].name} wins!`}
        </div>
      ) : !replayMode && isCurrentPlayer && (
        <>
          {!fsm.state.needsPieceRemoval && !fsm.state.pendingGraduations.length && (
            <div className="boop-piece-selection">
              {fsm.state.playerPieces[fsm.state.currentPlayer].cats === 0 ? (
                <div>Place a Kitten ({fsm.state.playerPieces[fsm.state.currentPlayer].kittens} left)</div>
              ) : fsm.state.playerPieces[fsm.state.currentPlayer].kittens === 0 ? (
                <div>Place a Cat ({fsm.state.playerPieces[fsm.state.currentPlayer].cats} left)</div>
              ) : (
                <>
                  <div>Select piece type to place:</div>
                  <div className="boop-piece-buttons">
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
            <div className="boop-piece-selection">
              <div>You have 8 pieces and three-in-a-row. Choose your action:</div>
              <div className="boop-piece-buttons">
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
