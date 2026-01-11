# Requirements Document - Open Betting Form LIFF

## Introduction

The Open Betting Form LIFF is a LINE Front-end Framework application that allows admins to record and broadcast open betting information to group chats. The form collects betting event details (venue, fireworks number, room link, notes) and sends them to selected group chats via the LINE Messaging API.

## Glossary

- **LIFF (LINE Front-end Framework)**: Framework for building web applications within LINE
- **Group Chat**: A LINE group where multiple users can communicate
- **Admin**: User with permissions to open betting and send messages to groups
- **Venue (สนาม)**: The location/stadium where the fireworks event takes place
- **Fireworks Number (บั้งไฟ)**: The specific fireworks event number being bet on
- **Room Link (ลิงค์ห้องแข่ง)**: URL link to the competition/betting room
- **Google Sheets**: Spreadsheet service for storing betting records
- **LINE Messaging API**: API for sending messages to LINE users and groups

## Requirements

### Requirement 1: Load Available Groups

**User Story:** As an admin, I want to see all available groups where I can send betting information, so that I can choose the correct group to broadcast to.

#### Acceptance Criteria

1. WHEN the LIFF form loads, THE System SHALL fetch all available groups from the backend API
2. WHEN groups are loaded successfully, THE System SHALL display them in a dropdown menu with group names
3. WHEN the API call fails, THE System SHALL display an error message and allow the user to retry
4. THE System SHALL display a loading state while fetching groups from the API
5. THE System SHALL require the user to select a group before submitting the form

### Requirement 2: Collect Betting Event Details

**User Story:** As an admin, I want to enter betting event information through a form, so that I can provide complete details to the group.

#### Acceptance Criteria

1. THE System SHALL display form fields for: Venue (required), Fireworks Number (required), Room Link (optional), and Notes (optional)
2. WHEN the user enters data, THE System SHALL validate that required fields are not empty
3. WHEN the user attempts to submit with empty required fields, THE System SHALL prevent submission and show a validation error
4. THE System SHALL provide clear labels and placeholder text for each form field in Thai language
5. THE System SHALL allow the user to cancel the form without submitting

### Requirement 3: Send Betting Message to Group

**User Story:** As an admin, I want to send the betting information to a selected group, so that all group members are notified of the open betting event.

#### Acceptance Criteria

1. WHEN the admin submits the form with valid data, THE System SHALL send the betting information to the selected group via LINE Messaging API
2. WHEN the message is sent successfully, THE System SHALL display a success message to the user
3. WHEN the message fails to send, THE System SHALL display an error message with details about the failure
4. THE System SHALL include all submitted data (venue, fireworks number, room link, notes) in the message sent to the group
5. WHEN the message is sent successfully, THE System SHALL close the LIFF window after a brief delay

### Requirement 4: Record Betting Event to Google Sheets

**User Story:** As a system, I want to record all open betting events to Google Sheets, so that there is a permanent record of when betting was opened.

#### Acceptance Criteria

1. WHEN the admin submits the form, THE System SHALL record the event to Google Sheets with timestamp
2. THE System SHALL store: timestamp, venue, fireworks number, room link, notes, and admin ID in the sheet
3. WHEN recording to Google Sheets fails, THE System SHALL still send the message to the group but notify the admin of the recording failure
4. THE System SHALL create a new sheet for each day (format: YYYY-MM-DD) if it doesn't exist
5. THE System SHALL include column headers: Time, Venue, Fireworks Number, Room Link, Notes, Admin ID

### Requirement 5: User Authentication and Context

**User Story:** As a system, I want to verify the user's identity and context, so that I can ensure only authorized admins can use the form.

#### Acceptance Criteria

1. WHEN the LIFF form loads, THE System SHALL verify that the user is logged in to LINE
2. IF the user is not logged in, THE System SHALL redirect them to the LINE login page
3. WHEN the user is logged in, THE System SHALL retrieve the user's ID from the LIFF context
4. THE System SHALL include the user's ID in all API requests for audit and tracking purposes
5. THE System SHALL display the user's ID in the form for reference (optional)

### Requirement 6: Error Handling and User Feedback

**User Story:** As an admin, I want clear feedback about what went wrong if something fails, so that I can take appropriate action.

#### Acceptance Criteria

1. WHEN an API call fails, THE System SHALL display a user-friendly error message in Thai language
2. WHEN a network error occurs, THE System SHALL allow the user to retry the operation
3. WHEN the form submission fails, THE System SHALL preserve the user's input so they don't have to re-enter it
4. THE System SHALL display loading indicators during API calls to show the form is processing
5. THE System SHALL log all errors to the browser console for debugging purposes
