const fs = require('fs')
const server = require('http').createServer()
server.on('request', (req, res) => {
  const src = fs.createReadStream('./README.md')
  src.pipe(res)
  // const start = Date.now()
  // fs.readFile('./README.md', (err, data) => {
  //   if (err) throw err
  //   console.log(Date.now() - start, '时间')
  //   res.end(data)
  // })
})

server.listen(8000)