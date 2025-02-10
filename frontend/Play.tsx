import './Play.css'
import { JSX, useEffect, useState, useRef } from 'react'
import { useParams } from 'react-router'
import { io, Socket } from 'socket.io-client'

import { RoomJoinData, GameSessionData } from '@shared/api-types.ts'
import { GameFSM, Player } from '@shared/game-fsm.ts'
import { GameState, GameAction, GameInfo, allGameInfo } from '@shared/game-info.ts'

// Import all game JSX elements into gameJSXMap
interface GameJSXProps {
  fsm: GameFSM<GameState, GameAction> | null
  takeAction: (action: GameAction) => void
}
const gameJSXMap = new Map<string, (p: GameJSXProps) => JSX.Element>()
const gameInfoEntries = Array.from(allGameInfo.entries())
await Promise.all(gameInfoEntries.map(async ([gameName, gameInfo]) => {
  const jsxModule = await import(`./games/${gameInfo.jsxName}.tsx`) as {[k: string]: () => JSX.Element}
  const jsxElement = jsxModule['default']
  gameJSXMap.set(gameName, jsxElement)
}))


function Play() {
  const { roomId } = useParams()
  const [players, setPlayers] = useState<Player[]>([])
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null)
  const [gameFSM, setGameFSM] = useState<GameFSM<GameState, GameAction> | null>(null)
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


  let gameContent = null
  if (gameInfo !== null) {
    const GameJSX = gameJSXMap.get(gameInfo.name)!
    const takeAction = (action: GameAction) => {
      socketRef.current?.emit('game:action', {
        roomId,
        gameAction: action,
      })
    }
    gameContent = <GameJSX fsm={gameFSM} takeAction={takeAction} />
  }

  return (
    <div className="play">
      <div className="play-main">
        {players && gameInfo && !gameFSM && (
          <>
            <h2>{gameInfo.displayName}</h2>
            <button
            onClick={() => {
              socketRef.current?.emit('game:start', {
                roomId,
                players: players.slice(0, gameInfo.FSMClass.maxPlayers),
              })
            }}
            disabled={players.length < gameInfo.FSMClass.minPlayers}
            className="start-game-button"
          >
            Start Game
          </button>
          </>
        )}
        {gameContent}
        {gameFSM?.hasEnded() && (
          <button
            onClick={() => {
              // Rotate players array from previous array by one player, so
              // e.g. player will switch sides in a two-player game
              const newPlayers = structuredClone(gameFSM.players)
              newPlayers.unshift(newPlayers.pop()!)
              socketRef.current?.emit('game:start', {
                roomId,
                players: newPlayers,
              })
            }}
            className="new-game-button"
          >
            New Game
          </button>
        )}
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
            <h3>Game Status</h3>
            <div className="game-status">
              {gameFSM.displayStrings.map((str, index) => (
                <p key={index}>{str}</p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Play
