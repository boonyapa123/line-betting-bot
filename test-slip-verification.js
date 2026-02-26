/**
 * ไฟล์ทดสอบระบบตรวจสอบสลิป
 * 
 * วิธีใช้:
 * node test-slip-verification.js
 */

require('dotenv').config();

const LineSlipVerificationService = require('./services/betting/lineSlipVerificationService');
const QRCodeScannerService = require('./services/betting/qrCodeScannerService');
const Slip2GoQRVerificationService = require('./services/betting/slip2GoQRVerificationService');

// ============================================
// Test 1: ตรวจสอบ Service Initialization
// ============================================
async function test1_ServiceInitialization() {
  console.log('\n✅ Test 1: Service Initialization');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);
    console.log('✅ LineSlipVerificationService initialized successfully');

    const scanner = new QRCodeScannerService();
    console.log('✅ QRCodeScannerService initialized successfully');

    const verifier = new Slip2GoQRVerificationService(process.env.SLIP2GO_SECRET_KEY);
    console.log('✅ Slip2GoQRVerificationService initialized successfully');

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// ============================================
// Test 2: ตรวจสอบ Environment Variables
// ============================================
async function test2_EnvironmentVariables() {
  console.log('\n✅ Test 2: Environment Variables');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const requiredVars = [
    'SLIP2GO_SECRET_KEY',
    'SLIP2GO_API_URL',
    'LINE_SLIP_VERIFICATION_ACCESS_TOKEN',
    'LINE_SLIP_VERIFICATION_CHANNEL_SECRET'
  ];

  let allVarsPresent = true;

  for (const varName of requiredVars) {
    const value = process.env[varName];
    if (value) {
      const maskedValue = value.substring(0, 10) + '...';
      console.log(`✅ ${varName}: ${maskedValue}`);
    } else {
      console.error(`❌ ${varName}: NOT SET`);
      allVarsPresent = false;
    }
  }

  return allVarsPresent;
}

// ============================================
// Test 3: ตรวจสอบ Message Creation
// ============================================
async function test3_MessageCreation() {
  console.log('\n✅ Test 3: Message Creation');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);

    // Test Success Message
    const successResult = {
      success: true,
      data: {
        amount: 1000,
        sender: {
          account: {
            name: 'สมชาย สลิปทูโก'
          }
        },
        receiver: {
          account: {
            name: 'บริษัท สลิปทูโก จำกัด'
          }
        },
        dateTime: new Date().toISOString(),
        transRef: '015073144041ATF00999'
      }
    };

    const successMessage = service.createLineMessage(successResult);
    console.log('✅ Success Message Created:');
    console.log(successMessage);

    // Test Error Message
    const errorResult = {
      success: false,
      code: '200501',
      message: 'Slip is Duplicated'
    };

    const errorMessage = service.createLineMessage(errorResult);
    console.log('\n✅ Error Message Created:');
    console.log(errorMessage);

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// ============================================
// Test 4: ตรวจสอบ Data Extraction
// ============================================
async function test4_DataExtraction() {
  console.log('\n✅ Test 4: Data Extraction');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);

    const mockResult = {
      success: true,
      data: {
        referenceId: '92887bd5-60d3-4744-9a98-b8574eaxxxxx',
        amount: 1000,
        dateTime: new Date().toISOString(),
        transRef: '015073144041ATF00999',
        sender: {
          account: {
            name: 'สมชาย สลิปทูโก',
            bank: {
              account: 'xxx-x-x9866-x'
            }
          },
          bank: {
            name: 'ธนาคารกสิกรไทย'
          }
        },
        receiver: {
          account: {
            name: 'บริษัท สลิปทูโก จำกัด',
            bank: {
              account: 'xxx-x-x5366-x'
            }
          },
          bank: {
            name: 'ธนาคารกสิกรไทย'
          }
        }
      }
    };

    const slipData = service.extractSlipData(mockResult);
    console.log('✅ Slip Data Extracted:');
    console.log(JSON.stringify(slipData, null, 2));

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// ============================================
// Test 5: ตรวจสอบ Error Handling
// ============================================
async function test5_ErrorHandling() {
  console.log('\n✅ Test 5: Error Handling');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  try {
    const service = new LineSlipVerificationService(process.env.SLIP2GO_SECRET_KEY);

    // Test various error codes
    const errorCodes = ['200401', '200402', '200403', '200404', '200500', '200501'];

    for (const code of errorCodes) {
      const errorResult = {
        success: false,
        code: code,
        message: 'Test error'
      };

      const message = service.createLineMessage(errorResult);
      console.log(`\n✅ Error Code ${code}:`);
      console.log(message);
    }

    return true;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

// ============================================
// Run All Tests
// ============================================
async function runAllTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                  Slip Verification System - Test Suite                        ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

  const results = [];

  // Run tests
  results.push({
    name: 'Service Initialization',
    passed: await test1_ServiceInitialization()
  });

  results.push({
    name: 'Environment Variables',
    passed: await test2_EnvironmentVariables()
  });

  results.push({
    name: 'Message Creation',
    passed: await test3_MessageCreation()
  });

  results.push({
    name: 'Data Extraction',
    passed: await test4_DataExtraction()
  });

  results.push({
    name: 'Error Handling',
    passed: await test5_ErrorHandling()
  });

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                              Test Summary                                     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════════╝');

  let passedCount = 0;
  for (const result of results) {
    const status = result.passed ? '✅ PASSED' : '❌ FAILED';
    console.log(`${status} - ${result.name}`);
    if (result.passed) passedCount++;
  }

  console.log(`\n📊 Total: ${passedCount}/${results.length} tests passed`);

  if (passedCount === results.length) {
    console.log('\n✅ All tests passed! System is ready to use.');
  } else {
    console.log('\n❌ Some tests failed. Please check the errors above.');
  }
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Fatal Error:', error.message);
  process.exit(1);
});
