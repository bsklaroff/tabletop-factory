import { TicTacToeFSM, TicTacToeAction } from '@shared/games/tic-tac-toe.ts'
import './TicTacToe.css'

interface TicTacToeProps {
  fsm: TicTacToeFSM | null
  takeAction: (action: TicTacToeAction) => void
}

function TicTacToe({ fsm, takeAction }: TicTacToeProps) {
  if (!fsm) return null

  const playerId = localStorage.getItem('playerId')
  const playerIndex = fsm.players.findIndex((p) => p.id === playerId)
  const isCurrentPlayer = playerIndex === fsm.state.currentPlayer
  const validMoves = fsm.validActions()

  const handleCellClick = (row: number, col: number) => {
    if (!isCurrentPlayer) return
    const action: TicTacToeAction = {
      player: fsm.state.currentPlayer,
      row,
      col,
    }
    if (validMoves.some(move => move.row === row && move.col === col)) {
      takeAction(action)
    }
  }

  const getCellContent = (value: number) => {
    switch (value) {
      case 0: return 'X'
      case 1: return 'O'
      default: return ''
    }
  }

  const getCellClass = (row: number, col: number) => {
    const classes = ['cell']
    if (isCurrentPlayer && validMoves.some((move) => move.row === row && move.col === col)) {
      classes.push('cell-valid')
    }
    return classes.join(' ')
  }

  return (
    <div className="tic-tac-toe">
      <div className="board">
        {fsm.state.board.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((cell, colIndex) => (
              <button
                key={`${rowIndex}-${colIndex}`}
                className={getCellClass(rowIndex, colIndex)}
                onClick={() => handleCellClick(rowIndex, colIndex)}
                disabled={!isCurrentPlayer || fsm.state.winner !== null}
              >
                {getCellContent(cell)}
              </button>
            ))}
          </div>
        ))}
      </div>
      {fsm.state.winner !== null && (
        <div className="winner-message">
          {fsm.state.winner === -1
            ? 'Draw'
            : `${fsm.players[fsm.state.winner].name} wins!`}
        </div>
      )}
    </div>
  )
}

export default TicTacToe
