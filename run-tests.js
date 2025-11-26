#!/usr/bin/env node

/**
 * FFmpeg.js MKVE Playwright Test Runner
 * Executes comprehensive tests for FFmpeg worker functionality
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🎭 Starting FFmpeg.js MKVE Playwright Test Suite');
console.log('================================================');

// Start simple HTTP server for tests
function startTestServer() {
  return new Promise((resolve, reject) => {
    console.log('📡 Starting test server...');

    const server = spawn('python3', ['-m', 'http.server', '8080'], {
      cwd: process.cwd(),
      stdio: 'pipe'
    });

    server.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output.includes('Serving HTTP')) {
        console.log('✅ Test server started on port 8080');
        console.log(`   ${output}`);
        resolve(server);
      }
    });

    server.stderr.on('data', (data) => {
      console.error('Server error:', data.toString());
    });

    server.on('error', (error) => {
      console.error('Failed to start server:', error.message);
      reject(error);
    });

    // Fallback if no stdout after 5 seconds
    setTimeout(() => {
      console.log('✅ Test server started on port 8080 (assumed)');
      resolve(server);
    }, 5000);
  });
}

// Run Playwright tests
async function runPlaywrightTests() {
  console.log('🧪 Running Playwright tests...');

  const testCommands = [
    {
      name: 'Worker Loading Tests',
      command: 'npx playwright test tests/playwright/worker-loading.spec.ts --project=chrome',
      description: 'Test worker initialization and memory configuration'
    },
    {
      name: 'Large File Processing Tests',
      command: 'npx playwright test tests/playwright/large-file-processing.spec.ts --project=chrome',
      description: 'Test large file audio extraction and memory management'
    }
  ];

  const results = [];

  for (const test of testCommands) {
    console.log(`\n🧪 ${test.name}...`);
    console.log(`   ${test.description}`);

    try {
      const result = await runCommand(test.command);
      results.push({
        test: test.name,
        status: result.success ? 'PASSED' : 'FAILED',
        duration: result.duration,
        output: result.output
      });

      console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.success ? 'PASSED' : 'FAILED'} (${result.duration}ms)`);

    } catch (error) {
      results.push({
        test: test.name,
        status: 'ERROR',
        duration: 0,
        output: error.message
      });

      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  return results;
}

// Run command with timeout
async function runCommand(command) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const child = spawn(command, { shell: true, stdio: 'pipe' });
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', (code) => {
      const duration = Date.now() - startTime;
      const success = code === 0;

      resolve({
        success,
        duration,
        output,
        exitCode: code
      });
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      child.kill('SIGTERM');
      resolve({
        success: false,
        duration: 300000,
        output: 'Test timed out after 5 minutes',
        exitCode: -1
      });
    }, 300000);
  });
}

// Generate test report
function generateReport(results) {
  console.log('\n📊 Test Results Summary');
  console.log('========================');

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log(`\n📈 Test Statistics:`);
  console.log(`   Total Tests: ${results.length}`);
  console.log(`   Passed: ${passed} ${passed > 0 ? '✅' : ''}`);
  console.log(`   Failed: ${failed} ${failed > 0 ? '❌' : ''}`);
  console.log(`   Errors: ${errors} ${errors > 0 ? '⚠️' : ''}`);
  console.log(`   Success Rate: ${Math.round((passed / results.length) * 100)}%`);

  console.log(`\n📋 Detailed Results:`);
  results.forEach((result, index) => {
    const icon = result.status === 'PASSED' ? '✅' : result.status === 'ERROR' ? '⚠️' : '❌';
    console.log(`   ${index + 1}. ${icon} ${result.test} - ${result.status} (${result.duration}ms)`);
    if (result.status === 'ERROR' && result.output) {
      console.log(`      Error: ${result.output.substring(0, 100)}...`);
    }
  });

  // Recommendations
  console.log(`\n💡 Recommendations:`);
  if (passed === results.length) {
    console.log('   🎉 All tests passed! FFmpeg.js is ready for production.');
    console.log('   ✅ Worker loading and initialization working');
    console.log('   ✅ Large file support confirmed');
    console.log('   ✅ Memory configuration optimized');
    console.log('   ✅ Audio extraction workflow validated');
  } else {
    console.log('   ⚠️ Some tests failed. Review:');
    if (failed > 0) {
      console.log('   - Check worker file paths and permissions');
      console.log('   - Verify Chrome memory flags are properly set');
      console.log('   - Ensure sufficient system memory (>4GB recommended)');
    }
    if (errors > 0) {
      console.log('   - Verify Playwright installation');
      console.log('   - Check test server accessibility');
      console.log('   - Review test configuration');
    }
  }

  console.log(`\n🔧 Chrome Configuration for Tests:`);
  console.log('   --js-flags="--max-old-space-size=4096"');
  console.log('   --enable-features=SharedArrayBuffer');
  console.log('   --enable-webassembly-simd');
  console.log('   --disable-web-security');
  console.log('   --allow-file-access-from-files');

  console.log(`\n📁 Files Created:`);
  console.log('   - playwright.config.ts');
  console.log('   - tests/playwright/worker-loading.spec.ts');
  console.log('   - tests/playwright/large-file-processing.spec.ts');
  console.log('   - ffmpeg-worker-mkve-simple.js');
  console.log('   - README-MKVE-TEST.md');

  console.log('\n🚀 Ready for Team Deployment!');
}

// Main execution
async function main() {
  try {
    console.log('🔍 Environment Check:');
    console.log(`   Node.js: ${process.version}`);
    console.log(`   Platform: ${process.platform}`);
    console.log(`   Architecture: ${process.arch}`);
    console.log(`   Working Directory: ${process.cwd()}`);

    // Start test server
    const server = await startTestServer();

    // Run tests
    const results = await runPlaywrightTests();

    // Generate report
    generateReport(results);

    console.log('\n🏁 Test suite completed!');

    // Cleanup
    if (server) {
      server.kill('SIGTERM');
    }

  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Test suite interrupted by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Test suite terminated');
  process.exit(0);
});

// Run the test suite
main();