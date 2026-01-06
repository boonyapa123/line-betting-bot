# Requirements Document

## Introduction

ระบบปัจจุบันมีการตรวจสอบสิทธิ์ admin ที่จำกัดการใช้งานคำสั่งบางอย่างให้เฉพาะ admin เท่านั้น ต้องการให้ลบการตรวจสอบ admin ออกไป เพื่อให้ทุกคนสามารถใช้คำสั่งทั้งหมดได้เท่าเทียมกัน โดยไม่มีการแยกสิทธิ์

## Glossary

- **System**: ระบบ LINE Betting Bot
- **Admin Check**: การตรวจสอบว่าผู้ใช้เป็น admin หรือไม่
- **Command**: คำสั่งที่ผู้ใช้ส่งมาผ่าน LINE
- **User**: ผู้ใช้ระบบใดๆ

## Requirements

### Requirement 1

**User Story:** As a user, I want to use all commands without admin restrictions, so that I can perform all operations equally with other users

#### Acceptance Criteria

1. WHEN a user sends any command, THE System SHALL execute the command without checking admin status
2. WHILE the system processes commands, THE System SHALL treat all users equally regardless of their role
3. IF an admin check exists in the codebase, THEN THE System SHALL remove or bypass the admin verification logic
4. THE System SHALL allow all users to access all available commands and features

