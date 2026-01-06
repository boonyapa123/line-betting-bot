# Implementation Plan - ระบบแทงบั้งไฟ LINE OA

## Overview

แผนการดำเนินการนี้แบ่งออกเป็น 4 ขั้นตอนหลัก: การตั้งค่าโครงสร้าง, การบันทึกการแทง, คำสั่งแอดมิน, และการอัตโนมัติ

---

## Phase 1: Core Betting Recording System

- [x] 1. Set up project structure and core interfaces
  - Create directory structure: `src/services/betting/`, `src/handlers/betting/`
  - Define TypeScript interfaces for betting data models
  - Create base service classes for betting operations
  - _Requirements: 5.1, 5.2_

- [x] 2. Implement Player Betting Parser
  - Create `src/services/betting/playerBettingParser.js` to analyze player messages
  - Implement regex/NLP patterns to extract: player name, amount, fireworks type, stadium
  - Add validation logic for extracted data
  - Handle edge cases (missing fields, invalid formats)
  - _Requirements: 5.1, 5.2_

- [x] 3. Implement Betting Record Service
  - Create `src/services/betting/bettingRecordService.js` for data persistence
  - Implement `saveBettingRecord()` method to write to Google Sheets
  - Implement `getBettingRecordsByDate()` method to fetch daily records
  - Implement `getBettingRecordsByPlayer()` method for player-specific records
  - Implement `getBettingRecordsByStadium()` method for stadium-specific records
  - _Requirements: 5.2, 5.3_

- [x] 4. Create Message Handler for Player Betting
  - Create `src/handlers/betting/playerBettingHandler.js`
  - Integrate with webhook to detect group chat messages
  - Call Player Betting Parser to extract information
  - Call Betting Record Service to save data
  - _Requirements: 5.1, 5.2_

- [ ]* 4.1 Write unit tests for Player Betting Parser
  - Test extraction of player name, amount, fireworks, stadium
  - Test validation of extracted data
  - Test edge cases and error handling
  - _Requirements: 5.1, 5.2_

- [ ]* 4.2 Write unit tests for Betting Record Service
  - Test saving betting records to Google Sheets
  - Test retrieving records by date, player, stadium
  - Test data integrity
  - _Requirements: 5.2, 5.3_

---

## Phase 2: Admin Commands and Reporting

- [x] 5. Implement Admin Command Handler
  - Create `src/handlers/betting/adminCommandHandler.js`
  - Detect admin commands: "เปิดรับแทง", "ส่งลิ้งค์การโอนเงิน", "สรุปยอดแทง", "สรุปผลแข่ง"
  - Route commands to appropriate handlers
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 6. Implement Betting Summary Report
  - Create `src/services/betting/bettingSummaryService.js`
  - Implement `generatePlayerSummary()` to get per-player betting data
  - Implement `generateStadiumSummary()` to get per-stadium betting data
  - Implement `generateDailySummary()` to get daily total
  - Format data for display in LINE messages
  - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3_

- [x] 7. Create Betting Summary Endpoint
  - Create `src/routes/bettingRoutes.js` with endpoints:
    - `GET /api/betting/summary` - daily summary
    - `GET /api/betting/summary/player/:playerName` - player summary
    - `GET /api/betting/summary/stadium/:stadium` - stadium summary
  - Integrate with admin command handler to send summaries to 1-on-1 chat
  - _Requirements: 3.1, 3.2, 6.1, 6.2, 6.3_

- [x] 8. Implement Result Recording Handler
  - Create `src/handlers/betting/resultRecordingHandler.js`
  - Handle "สรุปผลแข่ง" command from admin
  - Open LIFF form to input results for each betting event
  - Update betting records with win/loss results
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. Create Result Update Service
  - Create `src/services/betting/resultUpdateService.js`
  - Implement `updateBettingResult()` to mark bets as win/loss
  - Implement `getBettingEventsByDate()` to fetch open events
  - Send result summary to group chat as Flex Message
  - _Requirements: 4.1, 4.2, 4.3_

- [ ]* 9.1 Write unit tests for Betting Summary Service
  - Test generation of player summaries
  - Test generation of stadium summaries
  - Test generation of daily summaries
  - _Requirements: 6.1, 6.2, 6.3_

- [ ]* 9.2 Write unit tests for Result Update Service
  - Test updating betting results
  - Test fetching betting events
  - Test result calculation
  - _Requirements: 4.1, 4.2, 4.3_

---

## Phase 3: Automation and Data Management

- [x] 10. Implement Scheduled Task Service
  - Create `src/services/betting/scheduledTaskService.js`
  - Implement daily task scheduler using node-cron or similar
  - Schedule task to run at 19:00 every day
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 11. Implement Daily Data Clearing
  - Create `src/services/betting/dailyDataClearingService.js`
  - Implement `archiveDailyRecords()` to move data to archive sheet
  - Implement `clearActiveRecords()` to remove data from active sheet
  - Implement `logClearingOperation()` to record audit trail
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 12. Create Archive Sheet Management
  - Implement logic to create archive sheets with naming: `archive-YYYY-MM-DD`
  - Implement logic to maintain historical data for reporting
  - Implement `getArchivedRecords()` to fetch historical data
  - _Requirements: 7.2, 6.4, 6.5_

- [x] 13. Integrate Scheduled Tasks with Main Application
  - Initialize scheduled task service on app startup
  - Add error handling and retry logic for failed tasks
  - Add logging for task execution
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 13.1 Write unit tests for Scheduled Task Service
  - Test task scheduling
  - Test data archiving
  - Test data clearing
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ]* 13.2 Write integration tests for Daily Data Clearing
  - Test end-to-end data archiving and clearing
  - Test data integrity after clearing
  - Test historical data retrieval
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

---

## Phase 4: Integration and Refinement

- [x] 14. Integrate with Existing Admin Commands
  - Update `src/handlers/richMenuHandlers.js` to include new betting commands
  - Ensure "เปิดรับแทง", "ส่งลิ้งค์การโอนเงิน", "สรุปยอดแทง", "สรุปผลแข่ง" work correctly
  - Test integration with existing LIFF forms
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 15. Create Comprehensive Error Handling
  - Add error handling for all betting operations
  - Implement user-friendly error messages
  - Add logging for debugging
  - _Requirements: All_

- [x] 16. Create API Documentation
  - Document all new endpoints
  - Document data models and schemas
  - Document error responses
  - _Requirements: All_

- [ ]* 16.1 Write integration tests for complete betting flow
  - Test player betting → recording → summary → result
  - Test admin commands → LIFF form → data saving
  - Test scheduled clearing at 19:00
  - _Requirements: All_

- [ ]* 16.2 Write integration tests for reporting
  - Test daily report generation
  - Test player report generation
  - Test stadium report generation
  - _Requirements: 6.1, 6.2, 6.3_

---

## Notes

- All new services should follow the existing code patterns in the project
- Use Google Sheets API for all data operations
- Ensure all timestamps are in Bangkok timezone (UTC+7)
- All error messages should be in Thai language
- Test with real LINE OA and group chat before deployment
