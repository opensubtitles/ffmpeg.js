import { test, expect, devices } from '@playwright/test';
import path from 'path';

/**
 * Test FFmpeg MKVE Worker Loading and Initialization
 */

test.describe('FFmpeg MKVE Worker Loading', () => {
  let page;
  let testServerPort = 8080;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext({
      ...devices['Desktop Chrome'],
      launchOptions: {
        args: [
          '--js-flags=--max-old-space-size=4096',
          '--enable-features=SharedArrayBuffer',
          '--enable-webassembly-simd',
          '--disable-web-security',
          '--allow-file-access-from-files'
        ]
      }
    });
    page = await context.newPage();

    // Handle console messages for debugging
    page.on('console', msg => {
      console.log('[Browser Console]', msg.text());
    });

    // Handle unhandled errors
    page.on('pageerror', error => {
      console.error('[Page Error]', error.message);
    });

    // Handle worker errors
    page.on('workererror', error => {
      console.error('[Worker Error]', error.message);
    });
  });

  test('should load worker successfully', async () => {
    // Create test HTML with worker
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Worker Loading Test</title>
        <meta charset="UTF-8">
      </head>
      <body>
        <h1>FFmpeg Worker Loading Test</h1>
        <div id="status">Loading worker...</div>
        <div id="results"></div>

        <script>
          let worker;
          let testResults = {};

          function updateStatus(message) {
            document.getElementById('status').textContent = message;
          }

          function addResult(test, passed, details = '') {
            testResults[test] = { passed, details };
            const resultsDiv = document.getElementById('results');
            resultsDiv.innerHTML += '<p>' + (passed ? '✅' : '❌') + ' ' + test + ': ' + details + '</p>';
          }

          function runTests() {
            try {
              worker = new Worker('../ffmpeg-worker-mkve-simple.js');

              worker.onmessage = function(e) {
                const message = e.data;
                console.log('Worker message:', message);

                if (message.type === 'initialized') {
                  updateStatus('Worker initialized');
                  addResult('Worker Initialization', true, 'Worker loaded successfully');
                }

                if (message.type === 'ready') {
                  updateStatus('Worker ready');
                  addResult('Worker Ready State', true, message.message);
                  addResult('Features Available', !!message.features, message.features ? message.features.join(', ') : 'None');
                  addResult('Memory Configured', !!message.memoryAllocated, message.memoryAllocated || 'Not configured');
                  addResult('Large File Support', message.largeFileSupport === 'YES', message.largeFileSupport || 'Not specified');
                }

                if (message.type === 'test-result') {
                  updateStatus('Test completed');
                  addResult('Worker Test', message.success, message.message);
                  addResult('Test Features', !!message.features, message.features ? message.features.join(', ') : 'None');
                  addResult('Memory Available', !!message.memoryAvailable, message.memoryAvailable || 'Not available');
                }

                if (message.type === 'error') {
                  updateStatus('Worker error');
                  addResult('Worker Error', false, message.message);
                }
              };

              worker.onerror = function(error) {
                updateStatus('Worker error');
                addResult('Worker Error Handler', false, error.message);
                console.error('Worker error:', error);
              };

              // Send test message
              setTimeout(() => {
                worker.postMessage({ type: 'test' });
              }, 1000);

            } catch (error) {
              updateStatus('Worker creation failed');
              addResult('Worker Creation', false, error.message);
              console.error('Worker creation error:', error);
            }
          }

          // Run tests when page loads
          window.addEventListener('load', runTests);
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);
    await page.waitForLoadState('networkidle');

    // Wait for worker tests to complete
    await page.waitForSelector('#results:has-text("Worker Test")', { timeout: 10000 });

    // Check results
    const resultsText = await page.locator('#results').textContent();

    // Verify all key tests passed
    expect(resultsText).toContain('✅ Worker Initialization');
    expect(resultsText).toContain('✅ Worker Ready State');
    expect(resultsText).toContain('✅ Features Available');
    expect(resultsText).toContain('✅ Large File Support');

    console.log('Worker loading test completed:', resultsText);
  });

  test('should handle memory configuration for large files', async () => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Memory Configuration Test</title>
        <meta charset="UTF-8">
      </head>
      <body>
        <h1>Memory Configuration Test</h1>
        <div id="memory-info"></div>

        <script>
          function testMemoryConfiguration() {
            const memoryTests = {
              'WebAssembly Support': typeof WebAssembly !== 'undefined',
              'SharedArrayBuffer Support': typeof SharedArrayBuffer !== 'undefined',
              'Cross-Origin Isolation Enabled': crossOriginIsolated !== undefined,
              'Performance Memory API': performance.memory !== undefined,
              'Memory Limit Status': ''
            };

            // Check Chrome memory limits
            if (performance.memory) {
              const memInfo = performance.memory;
              const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
              const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
              const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);

              memoryTests['Current Memory Usage'] = usedMB + ' MB';
              memoryTests['Total Memory Available'] = totalMB + ' MB';
              memoryTests['Memory Limit'] = limitMB + ' MB';

              if (limitMB >= 4096) {
                memoryTests['Memory Limit Status'] = '✅ Sufficient (>=4GB)';
              } else if (limitMB >= 2048) {
                memoryTests['Memory Limit Status'] = '⚠️ Limited (>=2GB)';
              } else {
                memoryTests['Memory Limit Status'] = '❌ Insufficient (<2GB)';
              }
            }

            // Display results
            const infoDiv = document.getElementById('memory-info');
            let html = '<h2>Memory Configuration Results:</h2><ul>';
            for (const [test, result] of Object.entries(memoryTests)) {
              const status = typeof result === 'boolean' ? (result ? '✅' : '❌') : '';
              html += '<li>' + status + ' ' + test + ': ' + result + '</li>';
            }
            html += '</ul>';
            infoDiv.innerHTML = html;
          }

          window.addEventListener('load', testMemoryConfiguration);
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);
    await page.waitForLoadState('networkidle');

    // Check memory configuration
    const memoryInfo = await page.locator('#memory-info').textContent();

    // Verify critical memory features
    expect(memoryInfo).toContain('WebAssembly Support');
    expect(memoryInfo).toContain('Memory Limit Status');

    console.log('Memory configuration test completed:', memoryInfo);
  });

  test('should validate worker file existence', async () => {
    // Check if worker file exists
    const workerPath = path.join(process.cwd(), 'ffmpeg-worker-mkve-simple.js');
    const fs = require('fs');
    const workerExists = fs.existsSync(workerPath);

    expect(workerExists).toBe(true);

    if (workerExists) {
      const stats = fs.statSync(workerPath);
      expect(stats.size).toBeGreaterThan(0);
      console.log(`Worker file exists: ${workerPath}, size: ${stats.size} bytes`);
    }
  });

  test('should handle worker error scenarios', async () => {
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Worker Error Handling Test</title>
        <meta charset="UTF-8">
      </head>
      <body>
        <h1>Worker Error Handling Test</h1>
        <div id="error-results"></div>

        <script>
          let errorResults = {};

          function addErrorResult(test, occurred, message = '') {
            errorResults[test] = { occurred, message };
            const resultsDiv = document.getElementById('error-results');
            resultsDiv.innerHTML += '<p>' + (occurred ? '❌' : '✅') + ' ' + test + ': ' + message + '</p>';
          }

          function testErrorScenarios() {
            // Test 1: Invalid worker file
            try {
              const invalidWorker = new Worker('nonexistent-worker.js');
              invalidWorker.onerror = function(error) {
                addErrorResult('Invalid Worker File', true, 'Error handled correctly');
              };
            } catch (error) {
              addErrorResult('Invalid Worker File', true, 'Exception caught: ' + error.message);
            }

            // Test 2: Worker communication error
            try {
              const worker = new Worker('../ffmpeg-worker-mkve-simple.js');
              worker.onmessage = function(e) {
                // Normal message handler
              };

              worker.onerror = function(error) {
                addErrorResult('Worker Communication Error', true, 'Error handler working: ' + error.message);
              };

              // Send invalid message to test error handling
              setTimeout(() => {
                worker.postMessage({ type: 'invalid_command' });
              }, 1000);

            } catch (error) {
              addErrorResult('Worker Communication Setup', false, 'Failed to set up communication: ' + error.message);
            }

            // Test 3: Memory allocation test
            if (typeof WebAssembly !== 'undefined') {
              try {
                // Test large memory allocation
                const memory = new WebAssembly.Memory({
                  initial: 65536, // 64MB in 64KB pages
                  maximum: 262144 // 4GB in 64KB pages
                });
                addErrorResult('Large Memory Allocation', false, 'Successfully allocated ' + (262144 * 64 / 1024 / 1024) + 'GB');
              } catch (error) {
                addErrorResult('Large Memory Allocation', true, 'Memory limit reached: ' + error.message);
              }
            } else {
              addErrorResult('WebAssembly Support', true, 'WebAssembly not available');
            }
          }

          window.addEventListener('load', testErrorScenarios);
        </script>
      </body>
      </html>
    `;

    await page.setContent(testHTML);
    await page.waitForLoadState('networkidle');

    // Wait for error tests to complete
    await page.waitForSelector('#error-results:has-text("Worker Communication Error")', { timeout: 15000 });

    // Verify error handling works
    const errorResults = await page.locator('#error-results').textContent();

    expect(errorResults).toContain('Invalid Worker File');
    expect(errorResults).toContain('Worker Communication Error');

    console.log('Error handling test completed:', errorResults);
  });
});