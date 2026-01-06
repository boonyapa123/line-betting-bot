/**
 * File Logger
 * บันทึก logs ลงไฟล์
 */

import * as fs from 'fs';
import * as path from 'path';

const logsDir = path.join(__dirname, '../../logs');

// Create logs directory if not exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

export class FileLogger {
  /**
   * Log to file
   */
  static log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? ' ' + JSON.stringify(data) : ''}\n`;

    // Console output
    console.log(logMessage);

    // File output
    const logFile = path.join(logsDir, 'app.log');
    fs.appendFileSync(logFile, logMessage);
  }

  /**
   * Log error to file
   */
  static error(message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ❌ ${message}${error ? ' ' + JSON.stringify(error) : ''}\n`;

    // Console output
    console.error(errorMessage);

    // File output
    const logFile = path.join(logsDir, 'error.log');
    fs.appendFileSync(logFile, errorMessage);
  }

  /**
   * Get logs
   */
  static getLogs(lines: number = 100): string {
    const logFile = path.join(logsDir, 'app.log');
    if (!fs.existsSync(logFile)) {
      return 'No logs found';
    }

    const content = fs.readFileSync(logFile, 'utf-8');
    const logLines = content.split('\n');
    return logLines.slice(-lines).join('\n');
  }

  /**
   * Clear logs
   */
  static clearLogs(): void {
    const logFile = path.join(logsDir, 'app.log');
    const errorFile = path.join(logsDir, 'error.log');

    if (fs.existsSync(logFile)) {
      fs.unlinkSync(logFile);
    }
    if (fs.existsSync(errorFile)) {
      fs.unlinkSync(errorFile);
    }

    console.log('✅ Logs cleared');
  }
}
