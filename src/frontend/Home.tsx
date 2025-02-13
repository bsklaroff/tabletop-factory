import { useNavigate } from 'react-router'
import { CreateRoomReq, CreateRoomRes } from '@shared/api-types.ts'
import { allGameInfo } from '@shared/game-info.ts'

function Home() {
  const navigate = useNavigate()

  const createRoom = async (gameName: string) => {
    try {
      const response = await fetch('/api/create_room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName } as CreateRoomReq),
      })
      if (!response.ok) {
        throw new Error('Failed to create room')
      }
      const { roomId } = await response.json() as CreateRoomRes
      await navigate(`/play/${roomId}`)
    } catch (error) {
      console.error('Error creating room:', error)
    }
  }

  return (
    <div className="home">
      <h1>Tabletop Factory</h1>
      <ul className="game-list">
        {Array.from(allGameInfo).map(([gameName, gameInfo]) => (
          <li key={ gameName }>
            <button onClick={() => { void createRoom(gameName) }}>
              { gameInfo.displayName }
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Home
