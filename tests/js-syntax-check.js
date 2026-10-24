const fs = require('fs')
const path = require('path')

const projectRoot = path.resolve(__dirname, '..')
const files = [
  'utils/util.js',
  'pages/shareqr/shareqr.js',
  'pages/cardshareqr/cardshareqr.js',
  'pages/visitorpass/visitorpass.js',
  'pages/showqr/showqr.js',
  'pages/cardcode/cardcode.js'
]

files.forEach(function (relativePath) {
  const fullPath = path.join(projectRoot, relativePath)
  const source = fs.readFileSync(fullPath, 'utf8')
  new Function(source)
  console.log('PASS syntax: ' + relativePath)
})
