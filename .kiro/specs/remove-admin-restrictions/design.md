# Design Document: Remove Admin Restrictions

## Overview

ระบบปัจจุบันมีการตรวจสอบสิทธิ์ admin ที่กระจายอยู่ในหลายไฟล์ ต้องการให้ลบการตรวจสอบเหล่านี้ออกเพื่อให้ทุกคนสามารถใช้คำสั่งทั้งหมดได้เท่าเทียมกัน

## Architecture

### Current Admin Check Locations

Admin checks ถูกใช้ในตำแหน่งต่อไปนี้:

1. **src/handlers/adminHandler.js** - ตรวจสอบ admin ก่อนดำเนินการคำสั่ง
2. **src/services/adminCommandService.ts** - ตรวจสอบ admin ใน TypeScript version
3. **src/services/adminCommandService.js** - ตรวจสอบ admin ใน JavaScript version
4. **src/handlers/summaryHandler.js** - ตรวจสอบ admin ก่อนสร้างสรุป
5. **src/handlers/lineMessageHandler.ts** - ตรวจสอบ admin สำหรับคำสั่งบางอย่าง
6. **src/models/AdminUser.ts** - Model สำหรับตรวจสอบ admin
7. **src/index.js** - ตรวจสอบ admin ใน official chat
8. **src/services/officialAccountService.ts** - ตรวจสอบ admin ใน official account

### Removal Strategy

ลบการตรวจสอบ admin ออกจากทุกตำแหน่ง โดย:
- ลบ `isAdmin()` function calls
- ลบ `verifyAdminPermission()` function calls
- ลบ error messages ที่บอกว่า "ไม่มีสิทธิ์"
- ปล่อยให้ทุกคำสั่งทำงานได้โดยไม่มีการตรวจสอบ

## Components and Interfaces

### Files to Modify

1. **src/handlers/adminHandler.js**
   - ลบ `isAdmin()` check ในฟังก์ชัน `handleAdminCommand()`
   - ปล่อยให้ทุกคนใช้คำสั่ง admin ได้

2. **src/services/adminCommandService.ts**
   - ลบ `isAdmin()` method
   - ลบ `verifyAdminPermission()` method
   - ลบ admin check ใน `handleAdminCommand()`

3. **src/services/adminCommandService.js**
   - ลบ `isAdmin()` method
   - ลบ admin check ใน `handleAdminCommand()`
   - ลบ admin check ใน `handleSummary()`

4. **src/handlers/summaryHandler.js**
   - ลบ admin check ก่อนสร้างสรุป

5. **src/handlers/lineMessageHandler.ts**
   - ลบ `verifyAdminPermission()` calls
   - ลบ admin check ก่อนดำเนินการคำสั่ง

6. **src/index.js**
   - ลบ admin check ใน official chat handler

7. **src/services/officialAccountService.ts**
   - ลบ `verifyAdminPermission()` call

## Data Models

ไม่มีการเปลี่ยนแปลง data models เนื่องจากเป็นการลบการตรวจสอบเท่านั้น

## Error Handling

- ลบ error messages ที่เกี่ยวกับ "ไม่มีสิทธิ์" (❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้)
- ปล่อยให้ระบบดำเนินการคำสั่งโดยตรง

## Testing Strategy

- ตรวจสอบว่าคำสั่งทั้งหมดทำงานได้โดยไม่มีการตรวจสอบ admin
- ตรวจสอบว่าไม่มี error messages เกี่ยวกับสิทธิ์
- ทดสอบด้วย user ที่ไม่ใช่ admin เพื่อให้แน่ใจว่าสามารถใช้คำสั่งได้

