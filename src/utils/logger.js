const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, '../../logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logLevels = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
};

/**
 * Write log to file
 */
const writeLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}${data ? ' ' + JSON.stringify(data) : ''}`;

  // Console output
  console.log(logMessage);

  // File output
  const logFile = path.join(logsDir, `${level.toLowerCase()}.log`);
  fs.appendFileSync(logFile, logMessage + '\n');
};

/**
 * Log error
 */
const error = (message, data = null) => {
  writeLog(logLevels.ERROR, message, data);
};

/**
 * Log warning
 */
const warn = (message, data = null) => {
  writeLog(logLevels.WARN, message, data);
};

/**
 * Log info
 */
const info = (message, data = null) => {
  if (process.env.NODE_ENV !== 'production') {
    writeLog(logLevels.INFO, message, data);
  }
};

/**
 * Log debug
 */
const debug = (message, data = null) => {
  if (process.env.NODE_ENV === 'development') {
    writeLog(logLevels.DEBUG, message, data);
  }
};

module.exports = {
  error,
  warn,
  info,
  debug,
};
