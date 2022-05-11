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

// try to upgrade http connection to websocket connection
server.on('upgrade', (req, socket, head) => {
  console.log('connection upgrade!')
  const cookie = parseCookie(req.headers.cookie)
  if (cookie.user) {
    wsServer.handleUpgrade(req, socket, head, ws => {
      wsServer.emit('connection', ws, cookie.user)
    }) 
  }
})

// global var to store connected clients
let users = []

// global var to store all messages between clients
let messages = []

function broadcastUserList() {
  wsServer.clients.forEach(ws => {
    if (ws.readyState === Websocket.OPEN) {
      ws.send(JSON.stringify({
        eventType: 'updateUserList',
        data: {
          userList: users.map(user => user.username)
        }
      }))
    }
  })
}

function sendMessageHandler(ws, message) {
  /**
   * format of message object:
   *  {
   *    "from": {sender_name},
   *    "to": {receiver_name},
   *    "content": {message_content},
   *    "timestamp" {time}
   *  }
   */

  // save message to memory
  messages.push(message)

  // find message between current sender and receiver
  let targetMessages = messages.filter(
    msg => (msg.from === message.from && msg.to === message.to) || (msg.from === message.to && msg.to === message.from)
  )

  console.log(targetMessages)

  // transform the message into websocket event format
  targetMessages = JSON.stringify({
    eventType: 'message',
    data: {
      messages: targetMessages
    }
  })

  // send the event back to the message sender
  ws.send(targetMessages)

  // send the event back to the message receiver
  const targetUser = users.find(user => user.username === message.to)
  targetUser.ws.send(targetMessages)
}

function getMessageHistoryHandler(ws, { me, targetUser }) {
  // find message between current sender and receiver
  const targetMessages = messages.filter(
    msg => (msg.from === me && msg.to === targetUser) || (msg.from === targetUser && msg.to === me)
  )

  // send the event back to the user that request for message history
  ws.send(JSON.stringify({
    eventType: 'updateMessageHistory',
    data: {
      messages: targetMessages
    }
  }))
}

wsServer.on('connection', (ws, username) => {
  console.log(`[CONNECTION] user ${username} connected`)
  users.push({
    username: username,
    ws: ws
  })

  // broadcast current user list to all connected users when new client join
  broadcastUserList()

  const eventMap = {
    message: sendMessageHandler,
    messageHistory: getMessageHistoryHandler
  }

  // listen any message sent from client
  ws.on('message', (msg) => {
    /**
     *  message format:
     *  {
     *    "eventType": "",
     *    "data": {
     *    } 
     *  } 
     */
    const e = JSON.parse(msg.toString())
    eventMap[e.eventType](ws, e.data)
  })

  ws.on('close', () => {
    console.log(`user ${username} disconnected`)

    // remove user from active clients
    const idx = users.findIndex(user => user.username == username)
    users.splice(idx, 1)

    // broadcast current user list to all remaining clients
    broadcastUserList()
  })
})

// keep update array `users` through constantly checking if ws status of user
// is CLOSED
setInterval(() => {
  users = users.filter(u => u.ws.readyState !== u.ws.CLOSED)
  console.log('current users:', users.map(u => u.username))
}, 1000);

// ping api need auth
app.get('/ping', authMiddleware, (req, res) => {
  res.send('pong')
})

server.listen(PORT, () => {
  console.log(`server started on port ${PORT}`)
})
