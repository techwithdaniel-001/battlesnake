const winston = require('winston')
const path = require('path')
const fs = require('fs')

// Explicitly create logs directory in project root
const logDir = path.join(__dirname, '../../logs')
console.log('Creating logs directory at:', logDir)

// Create logs directory
if (!fs.existsSync(logDir)) {
  console.log('Logs directory does not exist, creating...')
  fs.mkdirSync(logDir)
}

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}]: ${message}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(logDir, 'battlesnake.log')
    })
  ]
})

// Test log to make sure it's working
logger.info('Logger initialized')

module.exports = logger