import './Play.css'
import { JSX, useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router'
import { io, Socket } from 'socket.io-client'

import { RoomJoinData, GameSessionData, GameActionData, AddAIReq } from '@shared/api-types.ts'

import { GameFSM, Player } from '@shared/game-fsm.ts'
import { GameState, GameAction, GameInfo, allGameInfo } from '@shared/game-info.ts'

// Import all game JSX elements into gameJSXMap
import TicTacToe from './games/TicTacToe.tsx'
import Boop from './games/Boop.tsx'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
const gameJSXMap = new Map<string, (...args: any[]) => JSX.Element | null>([
  ['tic_tac_toe', TicTacToe],
  ['boop', Boop],
])
const gameJSXKeys = Array.from(gameJSXMap.keys()).sort()
const gameInfoKeys = Array.from(allGameInfo.keys()).sort()
if (JSON.stringify(gameJSXKeys) !== JSON.stringify(gameInfoKeys)) {
  throw new Error('Mismatch between gameJSXMap and allGameInfo keys')
}

function Play() {
  const { roomId } = useParams()
  const [players, setPlayers] = useState<Player[]>([])
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [gameFSM, setGameFSM] = useState<GameFSM<GameState, GameAction> | null>(null)
  const [replayIdx, setReplayIdx] = useState<number | null>(null)
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!roomId) return

    const socket: Socket = io()
    socketRef.current = socket
    const playerId = localStorage.getItem('playerId')
    const playerName = localStorage.getItem('playerName')

    if (!playerId || !playerName) {
      console.error('Player info not found')
      return
    }

    socket.on('connect', () => {
      console.log('Connected to server:', socket.id)
      socket.emit('room:join', { playerId, playerName, roomId } as RoomJoinData)
    })

    socket.on('players:state', (playersData: Player[]) => {
      setPlayers(playersData)
    })

    socket.on('game:state', ({ gameName, gameFSMData }: GameSessionData) => {
      const updatedGameInfo = allGameInfo.get(gameName)!
      setGameInfo(updatedGameInfo)
      if (gameFSMData === null) {
        setGameFSM(null)
      } else {
        const gameFSM = new updatedGameInfo.FSMClass(gameFSMData)
        setGameFSM(gameFSM)
      }
    })

    socket.on('error', (e) => {
      console.error(e)
    })

    socket.on('disconnect', () => {
      console.log('Disconnected from server')
      setPlayers([])
      setGameInfo(null)
      setGameFSM(null)
    })

    return () => {
      socket.disconnect()
    }
  }, [roomId])

  if (!roomId) return null

  const addAIPlayer = async (roomId: string) => {
    try {
      await fetch('/api/add_ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId } as AddAIReq),
      })
    } catch (error) {
      console.error('Error adding AI player:', error)
    }
  }

  let gameContent = null
  if (gameInfo) {
    const GameJSX = gameJSXMap.get(gameInfo.name)!
    const takeAction = (action: GameAction) => {
      socketRef.current?.emit('game:action', {
        roomId,
        gameAction: action,
      } as GameActionData)
    }
    gameContent = <GameJSX fsm={gameFSM} takeAction={takeAction} replayMode={false} />
  }

  let gameReplay = null
  if (gameInfo && gameFSM && replayIdx !== null) {
    const GameJSX = gameJSXMap.get(gameInfo.name)!
    const replayFSM = new gameInfo.FSMClass(gameFSM.toData())
    replayFSM.rewindTo(replayIdx)
    gameReplay = (
      <div className="modal-overlay" onClick={() => setReplayIdx(null)}>
        <div className="game-replay" onClick={e => e.stopPropagation()}>
          <button className="close-button" onClick={() => setReplayIdx(null)}>×</button>
          <GameJSX fsm={replayFSM} takeAction={() => {}} replayMode={true} />
        </div>
      </div>
    )
  }

  return (
    <div className="play">
      <div className="play-main">
        {players && gameInfo && !gameFSM && (
          <>
            <h2>{gameInfo.displayName}</h2>
            <div className="game-controls">
              <button
                onClick={() => { void addAIPlayer(roomId) }}
                disabled={players.length >= gameInfo.FSMClass.minPlayers}
                className="game-button"
              >
                Add AI Player
              </button>
              <button
                onClick={() => {
                  socketRef.current?.emit('game:start', {
                    roomId,
                    players: players.slice(0, gameInfo.FSMClass.maxPlayers),
                  })
                }}
                disabled={players.length < gameInfo.FSMClass.minPlayers}
                className="game-button"
              >
                Start Game
              </button>
            </div>
          </>
        )}
        {gameContent}
        {gameFSM?.state.winner === null && (
          <div className="game-status-message">
            {gameFSM.players.findIndex(p => p.id === localStorage.getItem('playerId')) !== gameFSM.state.currentPlayer && (
              <>Waiting for {gameFSM.players[gameFSM.state.currentPlayer].name}...</>
            )}
          </div>
        )}
        {gameFSM?.hasEnded() && (
          <button
            onClick={() => {
              // Rotate players array from previous array by one player, so
              // for example players will switch sides in a two-player game
              const newPlayers = structuredClone(gameFSM.players)
              newPlayers.unshift(newPlayers.pop()!)
              socketRef.current?.emit('game:start', {
                roomId,
                players: newPlayers,
              })
            }}
            className="game-button"
          >
            New Game
          </button>
        )}
        {gameReplay}
      </div>
      <div className="play-sidebar">
        <div className="sidebar-section">
          <h3>Players</h3>
          <ul className="player-list">
            {players.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        </div>
        {gameFSM && (
          <div className="sidebar-section">
            <h3>Game History</h3>
            <div className="game-status">
              {gameFSM.historyDisplay.map((str, idx) => str && (
                  <p
                    key={idx}
                    onClick={() => replayIdx !== idx && setReplayIdx(idx)}
                    className={replayIdx === idx ? 'selected' : ''}
                  >
                    {str.split('\n').map((line, i) => (
                      <span key={i}>
                        {line}
                        {i < str.split('\n').length - 1 && <br />}
                      </span>
                    ))}
                  </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Play
