module.exports.parseCookie = cookieStr => {
  let cookie = {}
  if (cookieStr) {
    cookieStr.split('; ').forEach(element => {
      const key = element.split('=')[0] 
      const value = element.split('=')[1] 
      cookie[key] = value
    });
  }

  return cookie
}