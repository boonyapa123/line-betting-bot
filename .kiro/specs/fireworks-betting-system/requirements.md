# Requirements Document - ระบบแทงบั้งไฟ LINE OA

## Introduction

ระบบแทงบั้งไฟ LINE OA เป็นแพลตฟอร์มสำหรับการจัดการการแทงบั้งไฟผ่าน LINE Official Account ที่ติดตั้งในกลุ่ม LINE โดยแอดมินสามารถเปิดรับแทง ส่งลิ้งค์การโอนเงิน สรุปยอดแทง และบันทึกผลแข่ง ผ่านคำสั่งต่างๆ ในห้องแชท 1-on-1 ส่วนผู้เล่นสามารถแทงบั้งไฟในกลุ่มได้อย่างง่ายดาย โดยข้อมูลทั้งหมดจะถูกเก็บในชีท Google Sheets และเคลียร์ทุกวันเวลา 19:00

## Glossary

- **LINE OA (Official Account)**: บัญชี LINE ที่ใช้สำหรับการสื่อสารกับผู้ใช้
- **LIFF (LINE Front-end Framework)**: เฟรมเวิร์กสำหรับสร้างแอปพลิเคชันภายใน LINE
- **Flex Message**: รูปแบบข้อความที่มีการออกแบบที่สวยงามและมีปุ่มกระทำ
- **Rich Menu**: เมนูที่แสดงในด้านล่างของแชท LINE
- **Google Sheets**: บริการสเปรดชีตออนไลน์ของ Google
- **Admin (แอดมิน)**: ผู้ดูแลระบบที่มีสิทธิ์ในการจัดการการแทง
- **Player (ผู้เล่น)**: ผู้ใช้ที่เข้าร่วมการแทงบั้งไฟ
- **Betting Record (บันทึกการแทง)**: ข้อมูลการแทงของผู้เล่นแต่ละคน
- **Fireworks (บั้งไฟ)**: ประเภทของการแข่งขันที่ผู้เล่นสามารถแทงได้
- **Stadium (สนาม)**: สถานที่จัดการแข่งขันบั้งไฟ

## Requirements

### Requirement 1: เปิดรับแทง

**User Story:** As an Admin, I want to open betting for a specific fireworks event, so that players can place their bets on that event.

#### Acceptance Criteria

1. WHEN Admin types "เปิดรับแทง" in the 1-on-1 chat with LINE OA, THE System SHALL display a LIFF form to collect betting event details
2. THE System SHALL require Admin to input: Stadium name, Fireworks type, and Betting price
3. WHEN Admin submits the form, THE System SHALL save the betting event to Google Sheets with timestamp
4. WHEN Admin submits the form, THE System SHALL send a Flex Message to the group chat announcing the open betting event with all details
5. WHILE betting is open, THE System SHALL allow Players to place bets through a Quick Form in the group chat

### Requirement 2: ส่งลิ้งค์การโอนเงิน

**User Story:** As an Admin, I want to send payment transfer links to players, so that they can transfer money for their bets.

#### Acceptance Criteria

1. WHEN Admin types "ส่งลิ้งค์การโอนเงิน" in the 1-on-1 chat, THE System SHALL display a LIFF form to input bank account details
2. THE System SHALL require Admin to input: Bank name and Account information
3. WHEN Admin submits the form, THE System SHALL send the payment information as a Flex Message to the group chat
4. THE System SHALL format the payment information clearly for easy reference by Players

### Requirement 3: สรุปยอดแทง

**User Story:** As an Admin, I want to view a summary of all bets placed by each player, so that I can verify and manage the betting records.

#### Acceptance Criteria

1. WHEN Admin types "สรุปยอดแทง" in the 1-on-1 chat, THE System SHALL retrieve all betting records from Google Sheets for the current day
2. THE System SHALL organize betting data by individual player showing: Player name, Bet amount, Fireworks type, Stadium, and Result (Win/Loss)
3. THE System SHALL send the summary as a detailed message in the 1-on-1 chat (NOT in the group chat)
4. THE System SHALL NOT send this summary to the group chat, keeping it private between Admin and System

### Requirement 4: สรุปผลแข่ง

**User Story:** As an Admin, I want to record the results of betting events, so that I can finalize the bets and clear data for the next day.

#### Acceptance Criteria

1. WHEN Admin types "สรุปผลแข่ง" in the 1-on-1 chat, THE System SHALL display a LIFF form showing all open betting events from the current day
2. THE System SHALL require Admin to input the result (Win/Loss) for each betting event
3. WHEN Admin submits the results, THE System SHALL update all related betting records in Google Sheets with the outcome
4. WHEN Admin submits the results, THE System SHALL send a Flex Message to the group chat showing the final results for all events
5. WHEN the time reaches 19:00 daily, THE System SHALL automatically clear all betting records from Google Sheets for the next day's session

### Requirement 5: บันทึกการแทงในกลุ่ม

**User Story:** As a Player, I want to place bets by typing freely in the group chat, so that I can participate in the betting event without complex forms.

#### Acceptance Criteria

1. WHEN a Player types a message in the group chat, THE System SHALL analyze the message to extract betting information (Player name, bet amount, fireworks type, stadium)
2. WHEN the System successfully extracts betting information, THE System SHALL save the betting record to Google Sheets with timestamp and Player's LINE ID immediately
3. THE System SHALL NOT send confirmation messages to the group chat after recording bets
4. THE System SHALL prevent Players from editing or deleting their own betting records after submission
5. THE System SHALL allow only Admin to edit or delete betting records if needed

### Requirement 6: การรายงาน (Reporting)

**User Story:** As an Admin, I want to view betting reports by different dimensions, so that I can analyze betting patterns and performance.

#### Acceptance Criteria

1. WHEN Admin requests a report, THE System SHALL provide daily total betting amount summary
2. WHEN Admin requests a report, THE System SHALL provide per-player betting summary showing total amount bet by each player
3. WHEN Admin requests a report, THE System SHALL provide per-stadium betting summary showing total amount bet on each stadium
4. THE System SHALL store daily betting records for historical reporting and audit purposes
5. THE System SHALL allow Admin to access historical reports from previous days

### Requirement 7: การจัดการข้อมูลรายวัน

**User Story:** As a System, I want to manage daily betting data automatically, so that the system stays organized and data is cleared appropriately.

#### Acceptance Criteria

1. WHEN the time reaches 19:00 daily, THE System SHALL automatically clear all betting records from the active betting sheet
2. WHILE clearing data, THE System SHALL archive the day's betting records to a historical sheet for reporting purposes
3. THE System SHALL maintain data integrity by ensuring all records are saved before clearing
4. THE System SHALL log all data clearing operations for audit purposes
