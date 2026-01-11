# Design Document - Open Betting Form LIFF

## Overview

The Open Betting Form LIFF is a web application that runs within the LINE app, allowing admins to record and broadcast open betting information to group chats. The system consists of:

1. **Frontend (LIFF)**: HTML/CSS/JavaScript form that runs in LINE
2. **Backend API**: Express.js endpoints to handle group loading and message sending
3. **Google Sheets Integration**: Records betting events for audit and historical tracking
4. **LINE Messaging API**: Sends formatted messages to group chats

The form workflow:
1. User opens LIFF form from LINE
2. System loads available groups from backend
3. User selects group and enters betting details
4. System sends message to group via LINE API
5. System records event to Google Sheets
6. LIFF window closes after success

## Architecture

### Frontend Architecture

```
LIFF Form (public/liff-open-betting-form.html)
├── LIFF SDK Initialization
│   ├── Load LIFF SDK from CDN
│   ├── Initialize with LIFF ID
│   ├── Verify user login
│   └── Get user context (userId)
├── Group Loading
│   ├── Fetch /api/groups endpoint
│   ├── Populate dropdown with group names
│   └── Handle loading/error states
├── Form Input
│   ├── Group selection (required)
│   ├── Venue input (required)
│   ├── Fireworks number input (required)
│   ├── Room link input (optional)
│   └── Notes input (optional)
└── Form Submission
    ├── Validate required fields
    ├── POST to /api/send-betting-message
    ├── Show loading state
    ├── Handle success/error responses
    └── Close LIFF window on success
```

### Backend Architecture

```
Express.js Server (src/app.ts)
├── GET /api/groups
│   ├── Load groups from GroupAutoDetectService
│   ├── Return groups array with id and name
│   └── Handle errors gracefully
└── POST /api/send-betting-message
    ├── Validate request body
    ├── Send message to group via LINE API
    ├── Record to Google Sheets
    ├── Return success/error response
    └── Handle partial failures (message sent but sheet failed)
```

### Data Flow

```
User Input (LIFF Form)
    ↓
Validate Input
    ↓
POST /api/send-betting-message
    ├─→ Send to LINE API (group message)
    ├─→ Record to Google Sheets
    └─→ Return response
    ↓
Display Result to User
    ↓
Close LIFF Window
```

## Components and Interfaces

### Frontend Components

#### LIFF Form Component
- **File**: `public/liff-open-betting-form.html`
- **Responsibilities**:
  - Initialize LIFF SDK
  - Load and display groups
  - Collect user input
  - Validate form data
  - Submit to backend
  - Display feedback messages

#### Key Functions
- `onLiffLoad()`: Called when LIFF SDK loads
- `initLiff()`: Initialize LIFF and get user context
- `loadGroups()`: Fetch groups from API and populate dropdown
- `handleFormSubmit()`: Validate and submit form data
- `showError()`: Display error messages
- `showSuccess()`: Display success messages
- `closeForm()`: Close LIFF window

### Backend API Endpoints

#### GET /api/groups
**Purpose**: Retrieve all available groups

**Response**:
```json
{
  "success": true,
  "count": 2,
  "primaryGroupId": "C1234567890abcdef1234567890abcdef",
  "groups": [
    {
      "id": "C1234567890abcdef1234567890abcdef",
      "name": "Group Name 1",
      "joinedAt": "2024-01-15T10:30:00Z",
      "lastActive": "2024-01-15T10:30:00Z"
    },
    {
      "id": "C0987654321fedcba0987654321fedcba",
      "name": "Group Name 2",
      "joinedAt": "2024-01-14T15:45:00Z",
      "lastActive": "2024-01-14T15:45:00Z"
    }
  ]
}
```

#### POST /api/send-betting-message
**Purpose**: Send betting message to group and record to Google Sheets

**Request Body**:
```json
{
  "groupId": "C1234567890abcdef1234567890abcdef",
  "venue": "ต 310",
  "fireNumber": "35",
  "roomLink": "https://example.com/room",
  "note": "เปิดรับแทงแล้ว",
  "userId": "U1234567890abcdef1234567890abcdef",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "message": "Betting message sent successfully",
  "messageId": "100001",
  "sheetRecorded": true
}
```

**Response (Partial Success - Message sent but sheet failed)**:
```json
{
  "success": true,
  "message": "Betting message sent but failed to record to sheet",
  "messageId": "100001",
  "sheetRecorded": false,
  "sheetError": "Failed to append to sheet"
}
```

**Response (Error)**:
```json
{
  "success": false,
  "error": "Failed to send message to group",
  "details": "Group not found"
}
```

### Service Components

#### GroupAutoDetectService
- **File**: `src/services/groupAutoDetectService.ts`
- **Method**: `getAllGroups()` - Returns array of all registered groups
- **Method**: `getPrimaryGroupId()` - Returns first registered group ID

#### LINE Client
- **File**: `src/config/line.ts`
- **Method**: `lineClient.pushMessage(groupId, message)` - Send message to group
- **Method**: `lineClient.getGroupSummary(groupId)` - Get group info

#### Open Betting Record Service
- **File**: `src/services/openBettingRecordService.js`
- **Method**: `recordOpenBetting(data)` - Record betting event to Google Sheets
- **Method**: `ensureTodaySheetExists()` - Create daily sheet if needed

## Data Models

### Betting Message Format (sent to LINE group)

```
Flex Message with the following structure:
{
  "type": "flex",
  "altText": "เปิดรับแทง: ต 310 บั้งไฟ 35",
  "contents": {
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "🎯 เปิดรับแทง",
          "weight": "bold",
          "size": "xl",
          "color": "#667eea"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "spacing": "md",
      "contents": [
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
          "contents": [
            {
              "type": "text",
              "text": "สนาม:",
              "color": "#aaaaaa",
              "size": "sm",
              "flex": 1
            },
            {
              "type": "text",
              "text": "ต 310",
              "wrap": true,
              "color": "#666666",
              "size": "sm",
              "flex": 5
            }
          ]
        },
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
          "contents": [
            {
              "type": "text",
              "text": "บั้งไฟ:",
              "color": "#aaaaaa",
              "size": "sm",
              "flex": 1
            },
            {
              "type": "text",
              "text": "35",
              "wrap": true,
              "color": "#666666",
              "size": "sm",
              "flex": 5
            }
          ]
        },
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
          "contents": [
            {
              "type": "text",
              "text": "ห้องแข่ง:",
              "color": "#aaaaaa",
              "size": "sm",
              "flex": 1
            },
            {
              "type": "text",
              "text": "https://example.com/room",
              "wrap": true,
              "color": "#0099ff",
              "size": "sm",
              "flex": 5
            }
          ]
        },
        {
          "type": "box",
          "layout": "baseline",
          "margin": "md",
          "contents": [
            {
              "type": "text",
              "text": "หมายเหตุ:",
              "color": "#aaaaaa",
              "size": "sm",
              "flex": 1
            },
            {
              "type": "text",
              "text": "เปิดรับแทงแล้ว",
              "wrap": true,
              "color": "#666666",
              "size": "sm",
              "flex": 5
            }
          ]
        }
      ]
    }
  }
}
```

### Google Sheets Record Format

**Sheet Name**: YYYY-MM-DD (e.g., 2024-01-15)

**Columns**:
1. Time (เวลา) - HH:MM:SS format
2. Venue (สนาม) - Stadium name
3. Fireworks Number (บั้งไฟ) - Fireworks event number
4. Room Link (ลิงค์ห้องแข่ง) - URL to betting room
5. Notes (หมายเหตุ) - Additional notes
6. Admin ID - User ID of admin who opened betting

**Example Row**:
```
10:30:45 | ต 310 | 35 | https://example.com/room | เปิดรับแทงแล้ว | U1234567890abcdef1234567890abcdef
```

## Correctness Properties

A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.

### Property 1: Group Loading Completeness
**For any** backend state with registered groups, when the LIFF form loads, all registered groups SHALL be available in the dropdown menu.
**Validates: Requirements 1.1, 1.2**

### Property 2: Form Validation Prevents Invalid Submission
**For any** form submission attempt with missing required fields (groupId, venue, or fireNumber), the system SHALL prevent submission and display a validation error message.
**Validates: Requirements 2.3**

### Property 3: Message Delivery to Group
**For any** valid form submission, the betting message SHALL be successfully sent to the selected group via LINE Messaging API.
**Validates: Requirements 3.1, 3.4**

### Property 4: Google Sheets Recording
**For any** successful message send, the betting event data SHALL be recorded to Google Sheets with all required fields (timestamp, venue, fireNumber, roomLink, notes, adminId).
**Validates: Requirements 4.1, 4.2**

### Property 5: User Authentication Requirement
**For any** LIFF form load, if the user is not logged in to LINE, the system SHALL redirect to LINE login page before allowing form interaction.
**Validates: Requirements 5.1, 5.2**

### Property 6: Error Message Clarity
**For any** API failure, the system SHALL display a user-friendly error message in Thai language describing what went wrong.
**Validates: Requirements 6.1, 6.2**

### Property 7: Daily Sheet Creation
**For any** first betting record of the day, if the daily sheet (YYYY-MM-DD) does not exist, the system SHALL create it with proper headers before recording data.
**Validates: Requirements 4.4, 4.5**

### Property 8: Success Feedback and Window Closure
**For any** successful form submission, the system SHALL display a success message and close the LIFF window after a brief delay (2 seconds).
**Validates: Requirements 3.2, 3.5**

## Error Handling

### Frontend Error Handling

1. **LIFF Initialization Errors**
   - Display: "ไม่สามารถเริ่มต้นแอปพลิเคชันได้"
   - Action: Show error message, allow retry

2. **Group Loading Errors**
   - Display: "ไม่สามารถโหลดรายการกลุ่มได้"
   - Action: Show error message, allow retry

3. **Form Validation Errors**
   - Display: "กรุณากรอกข้อมูลที่จำเป็นทั้งหมด"
   - Action: Prevent submission, highlight required fields

4. **Message Sending Errors**
   - Display: "เกิดข้อผิดพลาดในการส่งข้อมูล: [error details]"
   - Action: Show error message, preserve form data, allow retry

### Backend Error Handling

1. **Invalid Group ID**
   - Response: 400 Bad Request
   - Message: "Invalid group ID"

2. **Missing Required Fields**
   - Response: 400 Bad Request
   - Message: "Missing required fields: [field names]"

3. **LINE API Failure**
   - Response: 200 OK (partial success)
   - Message: "Message sent but failed to record to sheet"
   - Action: Still record attempt, notify user

4. **Google Sheets Failure**
   - Response: 200 OK (partial success)
   - Message: "Message sent but failed to record to sheet"
   - Action: Message was sent successfully, sheet recording failed

5. **Server Error**
   - Response: 500 Internal Server Error
   - Message: "Internal server error"
   - Action: Log error, return generic message

## Testing Strategy

### Unit Tests

1. **Group Loading Tests**
   - Test successful group loading from API
   - Test error handling when API fails
   - Test empty group list handling
   - Test group dropdown population

2. **Form Validation Tests**
   - Test required field validation
   - Test empty string rejection
   - Test whitespace-only string rejection
   - Test valid input acceptance

3. **Message Formatting Tests**
   - Test Flex Message structure generation
   - Test all fields included in message
   - Test optional fields handling (roomLink, note)
   - Test Thai language text encoding

4. **Google Sheets Recording Tests**
   - Test daily sheet creation
   - Test row appending with all fields
   - Test timestamp formatting
   - Test error handling on sheet failure

### Property-Based Tests

1. **Property 1: Group Loading Completeness**
   - Generate random group lists
   - Verify all groups appear in dropdown
   - Test with 0, 1, and multiple groups

2. **Property 2: Form Validation**
   - Generate random form inputs
   - Verify validation rejects invalid combinations
   - Test all required field combinations

3. **Property 3: Message Delivery**
   - Generate random valid form submissions
   - Verify message sent to correct group
   - Verify message contains all submitted data

4. **Property 4: Google Sheets Recording**
   - Generate random betting events
   - Verify all fields recorded correctly
   - Verify timestamp format consistency

5. **Property 5: User Authentication**
   - Test LIFF initialization with logged-in user
   - Test LIFF initialization with logged-out user
   - Verify redirect to login when needed

6. **Property 6: Error Message Clarity**
   - Generate random API errors
   - Verify error messages are in Thai
   - Verify error messages are user-friendly

7. **Property 7: Daily Sheet Creation**
   - Test first record of day creates sheet
   - Test subsequent records use existing sheet
   - Verify headers are correct

8. **Property 8: Success Feedback**
   - Test success message displays
   - Test LIFF window closes after delay
   - Test form data cleared after success

### Integration Tests

1. **End-to-End Form Submission**
   - User opens LIFF form
   - Groups load successfully
   - User selects group and enters data
   - Form submits successfully
   - Message appears in group
   - Record appears in Google Sheets
   - LIFF window closes

2. **Error Recovery**
   - API fails on first attempt
   - User retries
   - Second attempt succeeds

3. **Partial Failure Handling**
   - Message sends successfully
   - Google Sheets recording fails
   - User is notified of partial success
   - Message still appears in group

## Implementation Notes

1. **LIFF ID Configuration**: The LIFF ID must be set in the HTML file and match the LINE channel configuration
2. **CORS Handling**: Ensure backend allows requests from LIFF domain
3. **Timestamp Format**: Use Thai locale for time display (HH:MM:SS format)
4. **Error Logging**: All errors should be logged to browser console for debugging
5. **Loading States**: Show spinner during API calls to provide user feedback
6. **Input Preservation**: Keep form data if submission fails to allow retry
7. **Message Format**: Use Flex Message format for rich formatting in LINE groups
8. **Sheet Headers**: Ensure Google Sheets headers are created on first use
