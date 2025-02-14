import express from 'express'
import morgan from 'morgan'
import { createServer } from 'node:http'
import { parseArgs } from 'node:util'
import { Server } from 'socket.io'
import ViteExpress from 'vite-express'

import db from './db/engine.ts'
import { roomTable, gameSessionTable } from './db/schema.ts'
import { CreateRoomReq, CreateRoomRes, AddAIReq } from './shared/api-types.ts'
import { setupSocketServer } from './socket-server.ts'
import { setupAIClient } from './ai-client.ts'

const args = parseArgs({ options: { prod: { type: 'boolean' } } })
if (args.values.prod) {
  ViteExpress.config({ mode: 'production' })
}

const PORT = 4007
const app = express()
const server = createServer((req, res) => { void app(req, res) })
const io = new Server(server, { connectionStateRecovery: {} })

app.use(express.json())
app.use(morgan('dev'))

app.post('/api/create_room', async (req, res) => {
  try {
    const { gameName } = req.body as CreateRoomReq
    if (!gameName) {
      res.status(400).json({ error: 'Game name is required' })
      return
    }

    await db.transaction(async (tx) => {
      const room = (await tx.insert(roomTable).values({}).returning())[0]
      await tx.insert(gameSessionTable).values({ roomId: room.id, gameName: gameName })
      res.json({ roomId: room.id } as CreateRoomRes)
    })
  } catch (error) {
    console.error('Error creating room:', error)
    res.status(500).json({ error: 'Failed to create room' })
  }
})

app.post('/api/add_ai', (req, res) => {
  try {
    const { roomId } = req.body as AddAIReq
    const playerId = `AI_${crypto.randomUUID()}`
    setupAIClient(PORT, roomId, playerId)
    res.status(200)
  } catch (error) {
    console.error('Error adding AI:', error)
    res.status(500).json({ error: 'Failed to add AI' })
  }
})

setupSocketServer(io, PORT)

server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is listening...')
})

await ViteExpress.bind(app, server)
