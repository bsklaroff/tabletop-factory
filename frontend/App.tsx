import { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router'
import './App.css'

function App() {
  const playerId = useRef('')
  const [playerName, setPlayerName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)

  useEffect(() => {
    // Get or generate UUID
    let storedId = localStorage.getItem('playerId')
    if (!storedId) {
      storedId = crypto.randomUUID()
      localStorage.setItem('playerId', storedId)
    }
    playerId.current = storedId

    // Get stored name or pop up name setting modal
    const storedName = localStorage.getItem('playerName')
    if (storedName) {
      setPlayerName(storedName)
    } else {
      setIsEditingName(true)
    }
  }, [])

  const handleNameEdit = () => {
    setIsEditingName(true)
  }

  const handleNameSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newName = formData.get('name') as string
    localStorage.setItem('playerName', newName)
    setPlayerName(newName)
    setIsEditingName(false)
  }

  return (
    <div className="app">
      {isEditingName ? (
        <div className="modal-overlay">
          <div className="name-form-modal">
            <h2>Enter Your Name</h2>
            <form onSubmit={handleNameSubmit}>
              <input
                name="name"
                type="text"
                defaultValue={playerName}
                placeholder="Your name"
                autoFocus
                required
              />
              <button type="submit">Save</button>
            </form>
          </div>
        </div>
      ) : (
        <div className="player-info">
          <span onClick={handleNameEdit} style={{ cursor: 'pointer' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
            </svg>
            {playerName}
          </span>
        </div>
      )}
      <Outlet />
    </div>
  )
}

export default App
