# Design Document - ระบบแทงบั้งไฟ LINE OA

## Overview

ระบบแทงบั้งไฟ LINE OA เป็นแพลตฟอร์มที่ช่วยให้แอดมินจัดการการแทงบั้งไฟผ่าน LINE Official Account ที่ติดตั้งในกลุ่ม LINE โดยมีการบูรณาการกับ Google Sheets เพื่อเก็บข้อมูลและสร้างรายงาน

### ส่วนประกอบหลัก:
1. **Admin Commands** - คำสั่งที่แอดมินใช้ใน 1-on-1 chat
2. **Player Betting** - ผู้เล่นแทงในกลุ่มแชท
3. **Data Management** - การจัดการข้อมูลใน Google Sheets
4. **Reporting** - การสร้างรายงาน

## Architecture

### System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    LINE Official Account                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐         │
│  │  Admin 1-on-1    │          │   Group Chat     │         │
│  │  Chat Commands   │          │  Player Betting  │         │
│  └────────┬─────────┘          └────────┬─────────┘         │
│           │                             │                    │
│           ├─ เปิดรับแทง                 ├─ พิมพ์ข้อความแทง  │
│           ├─ ส่งลิ้งค์โอนเงิน            └─ ระบบตรวจจับ      │
│           ├─ สรุปยอดแทง                                      │
│           └─ สรุปผลแข่ง                                      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Webhook Handler                │
        │   (Message Processing)           │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  Admin Command   │              │  Player Message  │
│  Handler         │              │  Parser          │
└────────┬─────────┘              └────────┬─────────┘
         │                                 │
         ├─ LIFF Form                      ├─ Extract betting info
         ├─ Process input                  ├─ Validate data
         └─ Save to Sheets                 └─ Save to Sheets
                                           └─ Send to group
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Google Sheets Service          │
        │   (Data Storage & Management)    │
        └──────────────────────────────────┘
                           │
        ┌──────────────────┴──────────────────┐
        │                                     │
        ▼                                     ▼
┌──────────────────┐              ┌──────────────────┐
│  Daily Sheets    │              │  Archive Sheets  │
│  (Active Data)   │              │  (Historical)    │
└──────────────────┘              └──────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────┐
        │   Scheduled Tasks                │
        │   (19:00 Daily Clear)            │
        └──────────────────────────────────┘
```

## Components and Interfaces

### 1. Message Handler (Webhook)

**ไฟล์:** `src/handlers/messageHandler.js` (ใหม่)

**หน้าที่:**
- รับข้อความจาก LINE
- ตรวจสอบว่าเป็นคำสั่งแอดมิน หรือข้อความแทงจากผู้เล่น
- ส่งไปยัง handler ที่เหมาะสม

**Interface:**
```javascript
handleMessage(event) {
  // event.source.type: 'user' (1-on-1) หรือ 'group'
  // event.message.text: ข้อความที่ส่งมา
  
  if (event.source.type === 'user') {
    // Admin command
    handleAdminCommand(event);
  } else if (event.source.type === 'group') {
    // Player betting
    handlePlayerBetting(event);
  }
}
```

### 2. Admin Command Handler

**ไฟล์:** `src/handlers/adminCommandHandler.js` (ใหม่)

**หน้าที่:**
- ตรวจสอบคำสั่งแอดมิน (เปิดรับแทง, ส่งลิ้งค์, สรุปยอด, สรุปผล)
- เปิด LIFF form ที่เหมาะสม
- ประมวลผลข้อมูลที่ส่งมา

**Commands:**
```
- "เปิดรับแทง" → Open betting form
- "ส่งลิ้งค์การโอนเงิน" → Payment link form
- "สรุปยอดแทง" → Fetch betting summary
- "สรุปผลแข่ง" → Result summary form
```

### 3. Player Betting Parser

**ไฟล์:** `src/services/playerBettingParser.js` (ใหม่)

**หน้าที่:**
- วิเคราะห์ข้อความแทงจากผู้เล่น
- ดึงข้อมูล: ชื่อ, จำนวนเงิน, บั้ง, สนาม
- ตรวจสอบความถูกต้องของข้อมูล

**Algorithm:**
```
1. ใช้ NLP/Regex เพื่อดึงข้อมูล
2. ตรวจสอบว่าข้อมูลครบถ้วน
3. ถ้าครบ → บันทึกลง Sheets
4. ถ้าไม่ครบ → ขอชี้แจง (หรือบันทึกเฉพาะที่ได้)
```

### 4. Betting Record Service

**ไฟล์:** `src/services/bettingRecordService.js` (ใหม่)

**หน้าที่:**
- บันทึกข้อมูลแทงลง Google Sheets
- ดึงข้อมูลแทงตามเงื่อนไข
- อัปเดตผลแข่ง

**Methods:**
```javascript
saveBettingRecord(playerName, amount, fireworks, stadium, userId, groupId)
getBettingRecordsByDate(date)
getBettingRecordsByPlayer(playerName, date)
getBettingRecordsByStadium(stadium, date)
updateBettingResult(recordId, result)
clearDailyRecords(date)
```

### 5. Reporting Service

**ไฟล์:** `src/services/reportingService.js` (ใหม่)

**หน้าที่:**
- สร้างรายงานตามมิติต่างๆ
- ดึงข้อมูลจาก Google Sheets
- จัดรูปแบบข้อมูลสำหรับแสดงผล

**Reports:**
```
1. Daily Total Report
   - วันที่
   - ยอดรวมทั้งหมด
   - จำนวนการแทง

2. Per-Player Report
   - ชื่อผู้เล่น
   - ยอดแทงรวม
   - จำนวนการแทง
   - ผลแพ้/ชนะ

3. Per-Stadium Report
   - ชื่อสนาม
   - ยอดแทงรวม
   - จำนวนการแทง
   - ผลแพ้/ชนะ
```

### 6. Scheduled Task Service

**ไฟล์:** `src/services/scheduledTaskService.js` (ใหม่)

**หน้าที่:**
- เคลียร์ข้อมูลแทงทุกวันเวลา 19:00
- เก็บข้อมูลไปยัง archive sheet
- บันทึก log

**Schedule:**
```
- เวลา: 19:00 (ทุกวัน)
- Action: 
  1. ดึงข้อมูลวันนี้
  2. บันทึกไปยัง archive sheet
  3. ลบข้อมูลจาก active sheet
  4. บันทึก log
```

## Data Models

### Betting Record Schema

```javascript
{
  id: string,                    // Unique ID
  date: string,                  // YYYY-MM-DD
  timestamp: string,             // HH:MM:SS
  playerName: string,            // ชื่อผู้เล่น
  playerId: string,              // LINE User ID
  groupId: string,               // GROUP ID
  amount: number,                // จำนวนเงิน
  fireworks: string,             // ประเภทบั้ง
  stadium: string,               // ชื่อสนาม
  result: string,                // 'win' | 'loss' | 'pending'
  status: string,                // 'active' | 'archived'
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Google Sheets Structure

**Sheet 1: Active Betting (YYYY-MM-DD)**
```
| A: Timestamp | B: Player Name | C: Player ID | D: Amount | E: Fireworks | F: Stadium | G: Result | H: Status |
```

**Sheet 2: Archive (archive-YYYY-MM-DD)**
```
Same structure as Active Betting
```

**Sheet 3: Summary (summary-YYYY-MM-DD)**
```
| A: Player Name | B: Total Amount | C: Bet Count | D: Win | E: Loss | F: Pending |
```

## Error Handling

### Player Betting Errors

1. **Incomplete Information**
   - ข้อความไม่มีข้อมูลครบ
   - Action: บันทึกเฉพาะที่ได้ หรือขอชี้แจง

2. **Invalid Amount**
   - จำนวนเงินไม่ถูกต้อง
   - Action: ปฏิเสธและขอให้ส่งใหม่

3. **Invalid Stadium/Fireworks**
   - สนาม/บั้งไม่ตรงกับที่เปิดรับแทง
   - Action: ขอชี้แจง

### Admin Command Errors

1. **Invalid Command**
   - คำสั่งไม่ถูกต้อง
   - Action: ส่งข้อความแนะนำ

2. **Missing Data**
   - ข้อมูลไม่ครบในฟอร์ม
   - Action: ขอให้กรอกใหม่

3. **Google Sheets Error**
   - ไม่สามารถเชื่อมต่อ Sheets
   - Action: ส่งข้อความแจ้งข้อผิดพลาด

## Testing Strategy

### Unit Tests

1. **Player Betting Parser**
   - ทดสอบการดึงข้อมูลจากข้อความต่างๆ
   - ทดสอบการตรวจสอบความถูกต้อง

2. **Betting Record Service**
   - ทดสอบการบันทึกข้อมูล
   - ทดสอบการดึงข้อมูล
   - ทดสอบการอัปเดตผล

3. **Reporting Service**
   - ทดสอบการสร้างรายงาน
   - ทดสอบการจัดรูปแบบข้อมูล

### Integration Tests

1. **End-to-End Betting Flow**
   - ผู้เล่นส่งข้อความแทง
   - ระบบบันทึกลง Sheets
   - ตรวจสอบข้อมูลใน Sheets

2. **Admin Command Flow**
   - แอดมินส่งคำสั่ง
   - ระบบเปิด LIFF form
   - แอดมินกรอกข้อมูล
   - ระบบบันทึกลง Sheets

3. **Scheduled Task Flow**
   - เวลา 19:00 ระบบเคลียร์ข้อมูล
   - ตรวจสอบว่าข้อมูลถูกย้ายไปยัง archive
   - ตรวจสอบว่า active sheet ว่างเปล่า

## Integration with Existing System

### Existing Components

1. **Open Betting Service** (`src/services/openBettingService.js`)
   - ใช้สำหรับบันทึกการเปิดรับแทง
   - ยังคงใช้ได้ตามเดิม

2. **Payment Link Service** (`src/services/paymentLinkService.js`)
   - ใช้สำหรับส่งลิ้งค์การโอนเงิน
   - ยังคงใช้ได้ตามเดิม

3. **Result Summary Service** (`src/services/resultSummaryService.js`)
   - ใช้สำหรับบันทึกผลแข่ง
   - ยังคงใช้ได้ตามเดิม

### New Components Integration

```
Existing System:
- Open Betting Service
- Payment Link Service
- Result Summary Service

New System:
+ Player Betting Parser
+ Betting Record Service
+ Reporting Service
+ Scheduled Task Service

Integration Points:
- ใช้ Google Sheets เดียวกัน
- ใช้ LINE OA เดียวกัน
- ใช้ LIFF เดียวกัน
```

## Implementation Phases

### Phase 1: Core Betting Recording
- Player Betting Parser
- Betting Record Service
- Google Sheets integration

### Phase 2: Admin Commands & Reporting
- Admin Command Handler
- Reporting Service
- Summary endpoints

### Phase 3: Automation
- Scheduled Task Service
- Daily data clearing
- Archive management

### Phase 4: Testing & Refinement
- Unit tests
- Integration tests
- Performance optimization
