module.exports.authMiddleware = (req, res, next) => {
  if (!req.cookies.chat_sid || !req.session.user) {
    res.status(401).send('請重新登入')
  } else {
    next()
  }
}