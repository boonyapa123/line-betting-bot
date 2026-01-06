/**
 * Initialize Open Betting Record Service
 * Script เพื่อเริ่มต้น service บันทึกข้อมูลการเปิดรับแทง
 */

const openBettingRecordService = require('../services/openBettingRecordService');

async function main() {
  console.log('🚀 Initializing Open Betting Record Service...');

  const initialized = await openBettingRecordService.initialize();

  if (initialized) {
    console.log('✅ Open Betting Record Service initialized successfully');
    process.exit(0);
  } else {
    console.error('❌ Failed to initialize Open Betting Record Service');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
