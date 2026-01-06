# Betting System API Documentation

## Overview

This document describes the API endpoints for the fireworks betting system.

## Base URL

```
http://localhost:3000/api/betting
```

## Endpoints

### 1. Get Daily Betting Summary

**Endpoint:** `GET /summary`

**Description:** Get betting summary for a specific date

**Query Parameters:**
- `date` (optional): Date in format `YYYY-MM-DD`. If not provided, uses today's date.

**Response:**
```json
{
  "success": true,
  "summary": {
    "date": "2024-01-15",
    "totalAmount": 5000,
    "betCount": 10,
    "wins": 3,
    "losses": 5,
    "pending": 2,
    "byPlayer": [
      {
        "playerName": "John",
        "totalAmount": 1000,
        "betCount": 2,
        "wins": 1,
        "losses": 1,
        "pending": 0
      }
    ],
    "byStadium": [
      {
        "stadium": "Bangkok",
        "totalAmount": 3000,
        "betCount": 6,
        "wins": 2,
        "losses": 3,
        "pending": 1
      }
    ]
  },
  "formatted": "📊 สรุปยอดแทงรายวัน - 2024-01-15\n..."
}
```

### 2. Get Player Betting Summary

**Endpoint:** `GET /summary/player/:playerName`

**Description:** Get betting summary for a specific player

**Path Parameters:**
- `playerName` (required): Name of the player

**Query Parameters:**
- `date` (optional): Date in format `YYYY-MM-DD`. If not provided, uses today's date.

**Response:**
```json
{
  "success": true,
  "summary": {
    "playerName": "John",
    "date": "2024-01-15",
    "totalAmount": 1000,
    "betCount": 2,
    "wins": 1,
    "losses": 1,
    "pending": 0,
    "records": [...]
  },
  "formatted": "📊 สรุปยอดแทง - John\n..."
}
```

### 3. Get Stadium Betting Summary

**Endpoint:** `GET /summary/stadium/:stadium`

**Description:** Get betting summary for a specific stadium

**Path Parameters:**
- `stadium` (required): Name of the stadium

**Query Parameters:**
- `date` (optional): Date in format `YYYY-MM-DD`. If not provided, uses today's date.

**Response:**
```json
{
  "success": true,
  "summary": {
    "stadium": "Bangkok",
    "date": "2024-01-15",
    "totalAmount": 3000,
    "betCount": 6,
    "wins": 2,
    "losses": 3,
    "pending": 1,
    "byFireworks": [
      {
        "fireworks": "Red",
        "totalAmount": 1500,
        "betCount": 3,
        "wins": 1,
        "losses": 2,
        "pending": 0
      }
    ],
    "records": [...]
  },
  "formatted": "📊 สรุปยอดแทง - Bangkok\n..."
}
```

### 4. Get All Betting Records

**Endpoint:** `GET /records`

**Description:** Get all betting records for a specific date

**Query Parameters:**
- `date` (optional): Date in format `YYYY-MM-DD`. If not provided, uses today's date.

**Response:**
```json
{
  "success": true,
  "records": [
    {
      "timestamp": "14:30:45",
      "lineName": "John",
      "userId": "U1234567890abcdef1234567890abcdef",
      "amount": 500,
      "message": "Red",
      "venue": "Bangkok",
      "result": "pending"
    }
  ],
  "count": 10
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": "ไม่สามารถดึงข้อมูลได้"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "เกิดข้อผิดพลาดในการดึงข้อมูล"
}
```

## Data Models

### Betting Record

```typescript
{
  timestamp: string;        // HH:MM:SS
  lineName: string;         // Player name
  userId: string;           // LINE User ID
  amount: number;           // Bet amount
  message: string;          // Fireworks type
  venue: string;            // Stadium name
  result: string;           // 'win' | 'loss' | 'pending'
}
```

### Betting Summary

```typescript
{
  date: string;             // YYYY-MM-DD
  totalAmount: number;      // Total bet amount
  betCount: number;         // Total number of bets
  wins: number;             // Number of winning bets
  losses: number;           // Number of losing bets
  pending: number;          // Number of pending bets
  byPlayer: PlayerSummary[];
  byStadium: StadiumSummary[];
}
```

### Player Summary

```typescript
{
  playerName: string;
  totalAmount: number;
  betCount: number;
  wins: number;
  losses: number;
  pending: number;
}
```

### Stadium Summary

```typescript
{
  stadium: string;
  totalAmount: number;
  betCount: number;
  wins: number;
  losses: number;
  pending: number;
  byFireworks: FireworksSummary[];
}
```

## Admin Commands

### 1. เปิดรับแทง (Open Betting)

**Command:** Type "เปิดรับแทง" in 1-on-1 chat

**Action:** Opens LIFF form to input betting event details

**Form Fields:**
- Stadium name
- Fireworks type
- Betting price
- Room link (optional)
- Note (optional)

### 2. ส่งลิ้งค์การโอนเงิน (Send Payment Link)

**Command:** Type "ส่งลิ้งค์การโอนเงิน" in 1-on-1 chat

**Action:** Opens LIFF form to input payment information

**Form Fields:**
- Bank name
- Account information

### 3. สรุปยอดแทง (Betting Summary)

**Command:** Type "สรุปยอดแทง" in 1-on-1 chat

**Action:** Sends betting summary to 1-on-1 chat

**Response:** Detailed summary with player and stadium breakdowns

### 4. สรุปผลแข่ง (Result Summary)

**Command:** Type "สรุปผลแข่ง" in 1-on-1 chat

**Action:** Opens LIFF form to input betting results

**Form Fields:**
- Betting events (auto-populated)
- Result for each event (win/loss)

## Player Betting

### Message Format

Players can place bets by typing messages in the group chat.

**Supported Formats:**
- "ชื่อ 100 บั้งไฟสีแดง สนามกรุงเทพ"
- "ชื่อ 100 บาท บั้งไฟสีแดง สนามกรุงเทพ"
- "ชื่อ 100 สีแดง กรุงเทพ"

**Parsing:**
- Player name: First word
- Amount: Number followed by optional "บาท"
- Fireworks: Color or type keyword
- Stadium: Stadium name or location

## Scheduled Tasks

### Daily Data Clearing

**Schedule:** 19:00 (7 PM) every day

**Action:**
1. Archive all betting records to archive sheet
2. Clear active betting sheet
3. Log clearing operation

**Endpoint:** `POST /api/betting/scheduled/trigger-clearing` (manual trigger)

## Integration

### Webhook Integration

The betting system is integrated with the main webhook handler. Messages are automatically routed to the appropriate handler based on:

1. **Message Type:** Text messages only
2. **Source Type:** 
   - User (1-on-1) → Admin command handler
   - Group → Player betting handler

### Error Handling

All operations include comprehensive error handling with:
- User-friendly error messages in Thai
- Detailed logging for debugging
- Retry logic for transient failures
- Graceful degradation

## Examples

### Get Daily Summary

```bash
curl http://localhost:3000/api/betting/summary
```

### Get Player Summary

```bash
curl http://localhost:3000/api/betting/summary/player/John
```

### Get Stadium Summary

```bash
curl http://localhost:3000/api/betting/summary/stadium/Bangkok
```

### Get Records for Specific Date

```bash
curl "http://localhost:3000/api/betting/records?date=2024-01-15"
```

## Notes

- All timestamps are in Bangkok timezone (UTC+7)
- All error messages are in Thai language
- Dates must be in YYYY-MM-DD format
- Player names and stadium names are case-sensitive
- Betting records are stored in Google Sheets
- Archive sheets are created automatically for each day
