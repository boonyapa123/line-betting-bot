/**
 * Group Management Service
 * จัดการรายการกลุ่มที่ Bot อยู่
 */

const fs = require('fs');
const path = require('path');

// ใช้ global variable เก็บ group IDs (persist ตราบเท่าที่ process ยังทำงาน)
let groupsInMemory = {};

// ใช้ file เก็บ group IDs (ในการ production ควรใช้ database)
const GROUPS_FILE = path.join(__dirname, '../../data/groups.json');

// สร้าง directory ถ้ายังไม่มี
function ensureDataDir() {
  const dataDir = path.dirname(GROUPS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// อ่าน groups จาก memory ก่อน แล้วจึง file
function loadGroups() {
  try {
    // ถ้ามีใน memory ให้ใช้ memory ก่อน
    if (Object.keys(groupsInMemory).length > 0) {
      console.log('✅ Groups loaded from memory:', Object.keys(groupsInMemory).length);
      return groupsInMemory;
    }
    
    // Fallback ไปที่ file
    ensureDataDir();
    if (fs.existsSync(GROUPS_FILE)) {
      const data = fs.readFileSync(GROUPS_FILE, 'utf-8');
      const groups = JSON.parse(data);
      groupsInMemory = groups; // Cache ไว้ใน memory
      console.log('✅ Groups loaded from file:', Object.keys(groups).length);
      return groups;
    }
  } catch (error) {
    console.error('❌ Error loading groups:', error);
  }
  
  return {};
}

// บันทึก groups ลง file และ memory
function saveGroups(groups) {
  ensureDataDir();
  
  try {
    // บันทึกลง memory ก่อน
    groupsInMemory = groups;
    console.log('✅ Groups saved to memory');
    
    // บันทึกลง file
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(groups, null, 2));
    console.log('✅ Groups saved to file');
  } catch (error) {
    console.error('❌ Error saving groups:', error);
  }
}

/**
 * เพิ่มกลุ่มใหม่
 */
function addGroup(groupId, groupName) {
  if (!groupId) {
    console.warn('⚠️ Group ID is required');
    return false;
  }
  
  const groups = loadGroups();
  
  if (!groups[groupId]) {
    groups[groupId] = {
      id: groupId,
      name: groupName || `ห้องแทง ${Object.keys(groups).length + 1}`,
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    
    saveGroups(groups);
    console.log(`✅ Group added: ${groupId} - ${groups[groupId].name}`);
    return true;
  } else {
    // Update last active
    groups[groupId].lastActive = new Date().toISOString();
    saveGroups(groups);
    return false;
  }
}

/**
 * ลบกลุ่ม
 */
function removeGroup(groupId) {
  const groups = loadGroups();
  
  if (groups[groupId]) {
    delete groups[groupId];
    saveGroups(groups);
    console.log(`✅ Group removed: ${groupId}`);
    return true;
  }
  
  return false;
}

/**
 * ได้รับกลุ่มทั้งหมด
 */
function getAllGroups() {
  const groups = loadGroups();
  return Object.values(groups);
}

/**
 * ได้รับกลุ่มตามรหัส
 */
function getGroup(groupId) {
  const groups = loadGroups();
  return groups[groupId] || null;
}

/**
 * อัปเดตชื่อกลุ่ม
 */
function updateGroupName(groupId, groupName) {
  const groups = loadGroups();
  
  if (groups[groupId]) {
    groups[groupId].name = groupName;
    groups[groupId].lastActive = new Date().toISOString();
    saveGroups(groups);
    console.log(`✅ Group name updated: ${groupId} - ${groupName}`);
    return true;
  }
  
  return false;
}

/**
 * บันทึก group ID เมื่อ Bot ได้รับข้อความจากกลุ่ม
 */
async function recordGroupActivity(groupId, groupName, client) {
  if (!groupId) {
    return;
  }
  
  try {
    // ถ้ายังไม่มี group นี้ ให้เพิ่มเข้าไป
    const existingGroup = getGroup(groupId);
    
    if (!existingGroup) {
      // ลองดึงชื่อกลุ่มจาก LINE API
      let name = groupName || `ห้องแทง`;
      
      if (client) {
        try {
          const groupSummary = await client.getGroupSummary(groupId);
          name = groupSummary.groupName || name;
        } catch (error) {
          console.warn(`⚠️ Could not get group name from LINE API: ${error.message}`);
        }
      }
      
      addGroup(groupId, name);
    } else {
      // Update last active
      const groups = loadGroups();
      groups[groupId].lastActive = new Date().toISOString();
      saveGroups(groups);
    }
  } catch (error) {
    console.error('❌ Error recording group activity:', error);
  }
}

module.exports = {
  addGroup,
  removeGroup,
  getAllGroups,
  getGroup,
  updateGroupName,
  recordGroupActivity,
};
