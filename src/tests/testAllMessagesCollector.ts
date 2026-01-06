/**
 * Test All Messages Collector Service
 * ทดสอบการเก็บและจัดเรียงข้อความ
 */

import { AllMessagesCollectorService } from '../services/allMessagesCollectorService';

// ข้อมูลทดสอบ (จากรูปของคุณ)
const testMessages = [
  {
    lineName: 'บำเน็ดเจ้าอยู่หัย',
    userId: 'U1',
    message: 'กูลามขาว 270-75',
    timestamp: new Date('2024-12-30T17:30:00'),
  },
  {
    lineName: 'บำเน็ดเจ้าอยู่หัย',
    userId: 'U1',
    message: 'น้องวิว 270-80',
    timestamp: new Date('2024-12-30T17:31:00'),
  },
  {
    lineName: 'กีฮยา',
    userId: 'U2',
    message: '9-15ธนธ3000มีญญ',
    timestamp: new Date('2024-12-30T17:32:00'),
  },
  {
    lineName: 'บำเน็ดเจ้าอยู่หัย',
    userId: 'U1',
    message: 'น้องมีญญ 290-300',
    timestamp: new Date('2024-12-30T17:33:00'),
  },
  {
    lineName: 'บำเน็ดเจ้าอยู่หัย',
    userId: 'U1',
    message: 'ไข่ดีจริงๆ 270/275',
    timestamp: new Date('2024-12-30T17:34:00'),
  },
  {
    lineName: 'สุรัยดีบัมม',
    userId: 'U3',
    message: 'ส1000โคดย',
    timestamp: new Date('2024-12-30T17:35:00'),
  },
  {
    lineName: 'Ton',
    userId: 'U4',
    message: '90-10า700มีญญ',
    timestamp: new Date('2024-12-30T17:36:00'),
  },
  {
    lineName: 'Fongbeer',
    userId: 'U5',
    message: '9-15ธนธ3000มีญญ',
    timestamp: new Date('2024-12-30T17:37:00'),
  },
  {
    lineName: 'อิมอินอ358',
    userId: 'U6',
    message: 'โคดโส2000',
    timestamp: new Date('2024-12-30T17:38:00'),
  },
];

/**
 * Test 1: Collect all messages
 */
export function testCollectAllMessages() {
  console.log('\n✅ Test 1: Collect all messages');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const messages = AllMessagesCollectorService.collectAllMessages(testMessages);

  console.log(`✓ Collected ${messages.length} messages`);
  messages.forEach((msg, index) => {
    console.log(`  ${index + 1}. ${msg.lineName}: "${msg.message}"`);
  });

  return messages;
}

/**
 * Test 2: Group by user
 */
export function testGroupByUser(messages: any[]) {
  console.log('\n✅ Test 2: Group messages by user');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const grouped = AllMessagesCollectorService.groupMessagesByUser(messages);

  console.log(`✓ Grouped into ${grouped.length} users (sorted by name)`);
  grouped.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.lineName} (${user.messageCount} messages)`);
  });

  return grouped;
}

/**
 * Test 3: Generate all messages data
 */
export function testGenerateData(messages: any[]) {
  console.log('\n✅ Test 3: Generate all messages data');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const data = AllMessagesCollectorService.generateAllMessagesData('C123456', messages);

  console.log(`✓ Total users: ${data.totalUsers}`);
  console.log(`✓ Total messages: ${data.totalMessages}`);
  console.log(`✓ Date: ${data.date.toLocaleDateString('th-TH')}`);

  return data;
}

/**
 * Test 4: Format all messages report
 */
export function testFormatAllMessagesReport(data: any) {
  console.log('\n✅ Test 4: Format all messages report');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const report = AllMessagesCollectorService.formatAllMessagesReport(data);
  console.log(report);

  return report;
}

/**
 * Test 5: Format simple list
 */
export function testFormatSimpleList(data: any) {
  console.log('\n✅ Test 5: Format simple list');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const report = AllMessagesCollectorService.formatSimpleList(data);
  console.log(report);

  return report;
}

/**
 * Test 6: Format compact list
 */
export function testFormatCompactList(data: any) {
  console.log('\n✅ Test 6: Format compact list');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const report = AllMessagesCollectorService.formatCompactList(data);
  console.log(report);

  return report;
}

/**
 * Test 7: Format table style
 */
export function testFormatTableStyle(data: any) {
  console.log('\n✅ Test 7: Format table style');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const report = AllMessagesCollectorService.formatTableStyle(data);
  console.log(report);

  return report;
}

/**
 * Test 8: Get user messages by name
 */
export function testGetUserMessages(data: any) {
  console.log('\n✅ Test 8: Get user messages by name');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const user = AllMessagesCollectorService.getUserMessages(data, 'บำเน็ดเจ้าอยู่หัย');

  if (user) {
    console.log(`✓ Found user: ${user.lineName}`);
    console.log(`  Messages: ${user.messages.join(', ')}`);
  }

  return user;
}

/**
 * Test 9: Get users with most messages
 */
export function testGetUsersWithMostMessages(data: any) {
  console.log('\n✅ Test 9: Get users with most messages');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const topUsers = AllMessagesCollectorService.getUsersWithMostMessages(data, 3);

  console.log(`✓ Top 3 users:`);
  topUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.lineName}: ${user.messageCount} messages`);
  });

  return topUsers;
}

/**
 * Test 10: Search messages
 */
export function testSearchMessages(data: any) {
  console.log('\n✅ Test 10: Search messages');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const results = AllMessagesCollectorService.searchMessages(data, '270');

  console.log(`✓ Found ${results.length} users with "270":`);
  results.forEach(user => {
    console.log(`  ${user.lineName}: ${user.messages.join(', ')}`);
  });

  return results;
}

/**
 * Test 11: Get statistics
 */
export function testGetStatistics(data: any) {
  console.log('\n✅ Test 11: Get statistics');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const stats = AllMessagesCollectorService.getStatistics(data);

  console.log(`✓ Total users: ${stats.totalUsers}`);
  console.log(`✓ Total messages: ${stats.totalMessages}`);
  console.log(`✓ Average per user: ${stats.averageMessagesPerUser}`);
  console.log(`✓ User with most messages: ${stats.userWithMostMessages?.lineName} (${stats.userWithMostMessages?.messageCount})`);
  console.log(`✓ User with least messages: ${stats.userWithLeastMessages?.lineName} (${stats.userWithLeastMessages?.messageCount})`);

  return stats;
}

/**
 * Test 12: Export to Google Sheets format
 */
export function testExportToGoogleSheets(data: any) {
  console.log('\n✅ Test 12: Export to Google Sheets format');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const rows = AllMessagesCollectorService.exportToGoogleSheetsFormat(data);

  console.log(`✓ Generated ${rows.length} rows (including header)`);
  console.log('\nFirst 5 rows:');
  rows.slice(0, 5).forEach((row, index) => {
    console.log(`  ${index}. ${JSON.stringify(row)}`);
  });

  return rows;
}

/**
 * Run all tests
 */
export function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  All Messages Collector Service - Test Suite              ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  try {
    // Test 1-3: Basic operations
    const messages = testCollectAllMessages();
    testGroupByUser(messages);
    const data = testGenerateData(messages);

    // Test 4-7: Format reports
    testFormatAllMessagesReport(data);
    testFormatSimpleList(data);
    testFormatCompactList(data);
    testFormatTableStyle(data);

    // Test 8-12: Advanced operations
    testGetUserMessages(data);
    testGetUsersWithMostMessages(data);
    testSearchMessages(data);
    testGetStatistics(data);
    testExportToGoogleSheets(data);

    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║  ✅ All tests passed!                                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log('\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests();
}
