const express = require('express')
const session = require('express-session')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const http = require('http')
const Websocket = require('ws')

const { authMiddleware } = require('./middlewares/auth')
const { parseCookie } = require('./utils/cookie_parser')

PORT = 10001

const app = express()

app.use(cors({
  credentials: true,
  origin: ['http://localhost:8080']
}))

// use session middleware
app.use(session({
  secret: 'superdupersecret',
  name: 'chat_sid',
  saveUninitialized: false,
  resave: true,
}))

// use middleware
app.use(express.json())
app.use(cookieParser())

// use routes
const auth = require('./routes/login')
app.use('/auth', auth)

const server = http.createServer(app)
const wsServer = new Websocket.WebSocketServer({
  noServer: true,
  path: '/websocket'
})

server.on('upgrade', (req, socket, head) => {
  console.log('connection upgrade!')
  wsServer.handleUpgrade(req, socket, head, (ws, rq) => {
    const cookie = parseCookie(req.headers.cookie)
    console.log(cookie)
    wsServer.emit('connection', ws, rq, cookie.user)
  }) 
})

let users = []
let messages = []

function broadcastUserList() {
  wsServer.clients.forEach(client => {
    if (client.readyState === Websocket.OPEN) {
      client.send(JSON.stringify({
        eventType: 'updateUserList',
        data: {
          userList: users.map(user => user.username)
        }
      }))
    }
  })
}

function sendMessage(ws, message) {
  messages.push(message)

  let targetMessages = messages.filter(
    msg => (msg.from === message.from && msg.to === message.to) || (msg.from === message.to && msg.to === message.from)
  )

  console.log(targetMessages)

  targetMessages = JSON.stringify({
    eventType: 'message',
    data: {
      messages: targetMessages
    }
  })

  ws.send(targetMessages)
  const targetUser = users.find(user => user.username === message.to)
  targetUser.ws.send(targetMessages)
}

function getMessageHistory(ws, { me, targetUser }) {
  let targetMessages = messages.filter(
    msg => (msg.from === me && msg.to === targetUser) || (msg.from === targetUser && msg.to === me)
  )

  targetMessages = JSON.stringify({
    eventType: 'updateMessageHistory',
    data: {
      messages: targetMessages
    }
  })

  ws.send(targetMessages)
}

wsServer.on('connection', (ws, req, username) => {
  ws.isAlive = true;

  console.log(`[CONNECTION] user ${username} connected`)
  console.log('[CONNECTION] client count:', wsServer.clients.size)
  users.push({
    username: username,
    ws: ws
  })

  broadcastUserList()

  const eventMap = {
    message: sendMessage,
    messageHistory: getMessageHistory
  }

  ws.on('message', (msg) => {
    console.log('send message!', msg.toString())
    const e = JSON.parse(msg.toString())
    eventMap[e.eventType](ws, e.data)
  })

  ws.on('close', () => {
    console.log(`user ${username} disconnected`)
    console.log('[CLOSE] client count:', wsServer.clients.size)
    const idx = users.findIndex(user => user.username == username)
    users.splice(idx, 1)
    broadcastUserList()
  })
})

const interval = setInterval(function ping() {
  users = users.filter(u => u.ws.readyState !== u.ws.CLOSED)
  console.log('current users:', users.map(u => u.username))
}, 1000);

app.get('/ping', authMiddleware, (req, res) => {
  res.send('pong')
})

server.listen(PORT, () => {
  console.log(`server started on port ${PORT}`)
})
