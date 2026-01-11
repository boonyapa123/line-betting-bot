# Implementation Plan: Open Betting Form LIFF

## Overview

This implementation plan breaks down the Open Betting Form feature into discrete coding tasks. The feature requires:
1. Backend API endpoints to handle group loading and message sending
2. Frontend LIFF form improvements for better UX and error handling
3. Integration with LINE Messaging API and Google Sheets
4. Comprehensive testing to ensure correctness properties are met

The implementation follows a bottom-up approach: first create backend endpoints, then enhance the frontend form, then add comprehensive tests.

## Tasks

- [x] 1. Create backend API endpoint for sending betting messages
  - Create new route handler POST /api/send-betting-message in src/app.ts
  - Validate request body (groupId, venue, fireNumber, userId, timestamp)
  - Call LINE API to send Flex Message to group with betting details
  - Call openBettingRecordService to record to Google Sheets
  - Handle partial failures (message sent but sheet failed)
  - Return appropriate success/error responses
  - _Requirements: 3.1, 3.4, 4.1, 4.2, 4.3_

- [ ]* 1.1 Write property test for message sending
  - **Property 3: Message Delivery to Group**
  - **Validates: Requirements 3.1, 3.4**
  - Generate random valid form submissions
  - Verify message is sent to correct group
  - Verify message contains all submitted data

- [x] 2. Enhance LIFF form frontend with improved error handling
  - Update public/liff-open-betting-form.html
  - Improve error message display with better styling
  - Add retry functionality for failed API calls
  - Preserve form data when submission fails
  - Add loading indicators for all API calls
  - Improve form validation messages
  - _Requirements: 2.2, 2.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ]* 2.1 Write property test for form validation
  - **Property 2: Form Validation Prevents Invalid Submission**
  - **Validates: Requirements 2.3**
  - Generate random form inputs with missing required fields
  - Verify submission is prevented
  - Verify validation error message displays

- [x] 3. Improve group loading in LIFF form
  - Update public/liff-open-betting-form.html loadGroups() function
  - Add better error handling for API failures
  - Add retry mechanism for failed group loads
  - Improve loading state display
  - Handle empty group list gracefully
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 3.1 Write property test for group loading
  - **Property 1: Group Loading Completeness**
  - **Validates: Requirements 1.1, 1.2**
  - Generate random group lists
  - Verify all groups appear in dropdown
  - Test with 0, 1, and multiple groups

- [x] 4. Enhance LIFF authentication and user context
  - Update public/liff-open-betting-form.html initLiff() function
  - Verify user is logged in before allowing form interaction
  - Retrieve user ID from LIFF context
  - Include user ID in all API requests
  - Handle login redirect properly
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ]* 4.1 Write property test for user authentication
  - **Property 5: User Authentication Requirement**
  - **Validates: Requirements 5.1, 5.2**
  - Test LIFF initialization with logged-in user
  - Test LIFF initialization with logged-out user
  - Verify redirect to login when needed

- [x] 5. Ensure Google Sheets recording works correctly
  - Verify openBettingRecordService.recordOpenBetting() is called
  - Ensure daily sheet is created with correct format (YYYY-MM-DD)
  - Verify all required columns are created: Time, Venue, Fireworks Number, Room Link, Notes, Admin ID
  - Test timestamp formatting (HH:MM:SS Thai locale)
  - _Requirements: 4.1, 4.2, 4.4, 4.5_

- [ ]* 5.1 Write property test for Google Sheets recording
  - **Property 4: Google Sheets Recording**
  - **Validates: Requirements 4.1, 4.2**
  - Generate random betting events
  - Verify all fields recorded correctly
  - Verify timestamp format consistency

- [ ]* 5.2 Write property test for daily sheet creation
  - **Property 7: Daily Sheet Creation**
  - **Validates: Requirements 4.4, 4.5**
  - Test first record of day creates sheet
  - Test subsequent records use existing sheet
  - Verify headers are correct

- [x] 6. Implement Flex Message formatting for group messages
  - Create helper function to format betting data as Flex Message
  - Include all fields: venue, fireNumber, roomLink, notes
  - Use proper Thai language labels
  - Add visual styling with colors and layout
  - _Requirements: 3.4_

- [ ]* 6.1 Write unit test for Flex Message formatting
  - Test message structure is valid
  - Test all fields are included
  - Test optional fields handling
  - Test Thai language text encoding

- [x] 7. Add comprehensive error handling to backend
  - Handle invalid groupId (group not found)
  - Handle missing required fields
  - Handle LINE API errors gracefully
  - Handle Google Sheets errors gracefully
  - Return appropriate HTTP status codes
  - Log all errors for debugging
  - _Requirements: 6.1, 6.2_

- [ ]* 7.1 Write property test for error message clarity
  - **Property 6: Error Message Clarity**
  - **Validates: Requirements 6.1, 6.2**
  - Generate random API errors
  - Verify error messages are in Thai
  - Verify error messages are user-friendly

- [x] 8. Test success feedback and window closure
  - Verify success message displays after successful submission
  - Verify LIFF window closes after 2-second delay
  - Test on both in-client and browser environments
  - _Requirements: 3.2, 3.5_

- [ ]* 8.1 Write property test for success feedback
  - **Property 8: Success Feedback and Window Closure**
  - **Validates: Requirements 3.2, 3.5**
  - Test success message displays
  - Test LIFF window closes after delay
  - Test form data cleared after success

- [x] 9. Checkpoint - Ensure all tests pass
  - Run all unit tests and verify they pass
  - Run all property-based tests with minimum 100 iterations
  - Verify no console errors or warnings
  - Check test coverage for critical paths
  - Ask the user if questions arise

- [x] 10. Integration testing - End-to-end form submission
  - Test complete flow: form load → group selection → data entry → submission → message sent → sheet recorded
  - Test error recovery: API fails on first attempt, user retries, second attempt succeeds
  - Test partial failure: message sends successfully but sheet recording fails
  - Verify all data flows correctly through the system
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 11. Final checkpoint - Ensure all tests pass
  - Run complete test suite
  - Verify all properties pass with 100+ iterations
  - Verify no regressions in existing functionality
  - Check error logs are clean
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- All tests should run with minimum 100 iterations for property-based tests
- Error messages must be in Thai language for user-facing content
- All timestamps should use Thai locale formatting
