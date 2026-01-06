/**
 * Application Constants
 */

// Admin Commands
export const ADMIN_COMMANDS = {
  SUMMARY: '/สรุป',
  RESULT: '/ผลแข่ง',
  REPORT: '/รายงาน',
  ADD_VENUE: '/เพิ่มสนาม',
  CLOSE_ROUND: '/ปิดรอบ',
} as const;

// Betting Status
export const BETTING_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  SETTLED: 'settled',
} as const;

// Result Types
export const RESULT_TYPES = {
  WIN: 'win',
  LOSE: 'lose',
  PENDING: 'pending',
} as const;

// Admin Permissions
export const ADMIN_PERMISSIONS = {
  MANAGE_ROUNDS: 'manage_rounds',
  VIEW_REPORTS: 'view_reports',
  SET_RESULTS: 'set_results',
  MANAGE_VENUES: 'manage_venues',
} as const;

// Message Patterns
export const MESSAGE_PATTERNS = {
  BETTING: /^([\u0E00-\u0E7F]+)(\d+)$/,
  VENUE_SELECTION: /^[\u0E00-\u0E7F]+$/,
  ADMIN_COMMAND: /^\/[\u0E00-\u0E7F]+/,
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  INVALID_BET_FORMAT: 'รูปแบบการแทงไม่ถูกต้อง ใช้: [สนาม][ยอดเงิน] เช่น ต200',
  INVALID_AMOUNT: 'ยอดเงินต้องมากกว่า 0',
  VENUE_NOT_FOUND: 'ไม่พบสนามแทงที่ขอ',
  ADMIN_ONLY: 'คำสั่งนี้สำหรับแอดมินเท่านั้น',
  INVALID_COMMAND: 'คำสั่งไม่ถูกต้อง',
  DATABASE_ERROR: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  BET_RECORDED: 'บันทึกการแทงเรียบร้อย',
  VENUE_SENT: 'ส่งลิงค์ห้องแทงเรียบร้อย',
  RESULT_SET: 'บันทึกผลการแข่งเรียบร้อย',
} as const;

// Database Collections
export const COLLECTIONS = {
  BETS: 'bets',
  BETTING_ROUNDS: 'betting_rounds',
  VENUES: 'venues',
  ADMIN_USERS: 'admin_users',
} as const;

// Timeout values (in milliseconds)
export const TIMEOUTS = {
  MESSAGE_PROCESSING: 5000,
  DATABASE_OPERATION: 10000,
  LINE_API_CALL: 5000,
} as const;
