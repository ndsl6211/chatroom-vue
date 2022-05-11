const express = require('express')
const defaultUsers = require('../static/default_users.json')

const router = express.Router()

router.post('/login', (req, res) => {
  const username = req.body.username 
  const password = req.body.password

  const user = defaultUsers.find(
    user => user.username === username && user.password === password
  )

  if (user) {
    req.session.user = user
    res.cookie('user', username, {
      httpOnly: false,
      path: '/',
      secure: false
    })
    res.status(200).send('login succeeded')
  } else {
    res.status(401).send('invalid username or password')
  }
})

router.post('/logout', (req, res) => {
  req.session = null
  res.clearCookie('chat_sid')

  res.status(200).send()
})

module.exports = router