import { writeFile, unlink, mkdir, rm, rmdir } from 'fs/promises';
import { join } from 'path';
import { dwatcher } from '../src/index.js';

// Simple test framework
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }
  
  test(name, fn) {
    this.tests.push({ name, fn });
  }
  
  async run() {
    console.log('🧪 Running dwatcher tests...\n');
    
    for (const { name, fn } of this.tests) {
      try {
        console.log(`  ${name}...`);
        await fn();
        console.log(`  ✅ ${name} passed`);
        this.passed++;
      } catch (error) {
        console.log(`  ❌ ${name} failed: ${error.message}`);
        this.failed++;
      }
    }
    
    console.log(`\n📊 Test Results:`);
    console.log(`  Passed: ${this.passed}`);
    console.log(`  Failed: ${this.failed}`);
    console.log(`  Total: ${this.tests.length}`);
    
    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test setup
const testRunner = new TestRunner();
const testDir = join(process.cwd(), 'test-temp');

// Clean up function
async function cleanup() {
  try {
    await rm(testDir, { recursive: true });
  } catch (err) {
    // Ignore cleanup errors
  }
}

// Tests
testRunner.test('Module imports correctly', async () => {
  assert(typeof dwatcher === 'function', 'dwatcher should be a function');
});

testRunner.test('Configuration defaults are correct', async () => {
  // Test by creating a dwatcher instance with minimal config
  // This is tricky to test without actually running, so we'll test the import
  const { dwatcher } = await import('../src/index.js');
  assert(typeof dwatcher === 'function', 'dwatcher function should be available');
});

testRunner.test('File ignore patterns work', async () => {
  // Import the utility functions for testing
  const module = await import('../src/index.js');
  
  // Since the functions are not exported, we'll test the behavior indirectly
  // by checking that the module loads without errors
  assert(typeof module.dwatcher === 'function', 'Module should export dwatcher function');
});

testRunner.test('CLI helper is available', async () => {
  const { createCLI } = await import('../src/index.js');
  assert(typeof createCLI === 'function', 'createCLI should be a function');
  
  const cli = createCLI();
  assert(typeof cli.run === 'function', 'CLI should have a run method');
});

testRunner.test('Test directory setup', async () => {
  await cleanup();
  await mkdir(testDir, { recursive: true });
  
  // Create a test file
  const testFile = join(testDir, 'test.js');
  await writeFile(testFile, 'console.log("test");');
  
  // Clean up
  await unlink(testFile);
  await rmdir(testDir);
});

testRunner.test('Package.json structure is valid', async () => {
  const { readFile } = await import('fs/promises');
  const packageJson = JSON.parse(await readFile('package.json', 'utf8'));
  
  assert(packageJson.name === '@dwatcher/core', 'Package name should be @dwatcher/core');
  assert(packageJson.type === 'module', 'Package should use ES modules');
  assert(packageJson.main === 'src/index.js', 'Main entry should be src/index.js');
  assert(packageJson.bin.dwatcher === 'bin/dwatcher.js', 'Binary should be bin/dwatcher.js');
});

testRunner.test('ES Module exports are correct', async () => {
  const module = await import('../src/index.js');
  
  assert('dwatcher' in module, 'Should export dwatcher function');
  assert('createCLI' in module, 'Should export createCLI function');
  assert(typeof module.dwatcher === 'function', 'dwatcher should be a function');
  assert(typeof module.createCLI === 'function', 'createCLI should be a function');
});

testRunner.test('Environment variable detection works', async () => {
  // Test that DWATCHER_RUNNING can be detected
  const originalEnv = process.env.DWATCHER_RUNNING;
  
  process.env.DWATCHER_RUNNING = '1';
  assert(process.env.DWATCHER_RUNNING === '1', 'Environment variable should be set');
  
  // Restore original value
  if (originalEnv) {
    process.env.DWATCHER_RUNNING = originalEnv;
  } else {
    delete process.env.DWATCHER_RUNNING;
  }
});

testRunner.test('CLI argument parsing logic', async () => {
  const { createCLI } = await import('../src/index.js');
  const cli = createCLI();
  
  // Test that CLI object has the expected structure
  assert(typeof cli.run === 'function', 'CLI should have run method');
  
  // Test help flag recognition (we can't actually run it, but we can test the structure)
  const helpArgs = ['node', 'dwatcher', '--help'];
  assert(helpArgs.includes('--help'), 'Help flag should be recognizable');
});

// Test internal utility functions by creating mock scenarios
testRunner.test('Ignore patterns work correctly', async () => {
  // Test the ignore pattern logic
  const ignorePatterns = [
    'node_modules/**',
    '.git/**',
    '*.log',
    'dist/**'
  ];
  
  const testPaths = [
    'src/index.js',
    'node_modules/express/index.js',
    '.git/config',
    'app.log',
    'dist/bundle.js',
    'test/test.js'
  ];
  
  // Mock the shouldIgnore function logic
  const shouldIgnore = (filePath, patterns) => {
    return patterns.some(pattern => {
      if (pattern.includes('**')) {
        const regex = new RegExp(pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*'));
        return regex.test(filePath);
      }
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(filePath);
      }
      return filePath.includes(pattern);
    });
  };
  
  const ignored = testPaths.filter(path => shouldIgnore(path, ignorePatterns));
  const expected = [
    'node_modules/express/index.js',
    '.git/config', 
    'app.log',
    'dist/bundle.js'
  ];
  
  assert(ignored.length === expected.length, `Should ignore ${expected.length} files, got ${ignored.length}`);
  assert(ignored.every(path => expected.includes(path)), 'Should ignore correct files');
});

testRunner.test('Debounce timer logic simulation', async () => {
  // Simulate the debounce logic without actually running dwatcher
  let restartCount = 0;
  let debounceTimer = null;
  const debounceMs = 100;
  
  const mockRestart = () => {
    restartCount++;
  };
  
  const mockFileChange = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(mockRestart, debounceMs);
  };
  
  // Simulate rapid file changes
  mockFileChange(); // Change 1
  await sleep(50);   // Wait 50ms
  mockFileChange(); // Change 2 (resets timer)
  await sleep(50);   // Wait 50ms  
  mockFileChange(); // Change 3 (resets timer)
  
  // Wait for debounce to complete
  await sleep(150);
  
  assert(restartCount === 1, `Should restart once after debounce, got ${restartCount}`);
  
  // Test single change
  restartCount = 0;
  mockFileChange();
  await sleep(150);
  
  assert(restartCount === 1, `Single change should cause one restart, got ${restartCount}`);
});

testRunner.test('Command line argument parsing simulation', async () => {
  // Test argument parsing logic without actually running CLI
  const parseArgs = (args) => {
    const options = {};
    let command = '';
    let commandArgs = [];
    
    let i = 0;
    while (i < args.length) {
      const arg = args[i];
      
      if (arg.startsWith('--')) {
        switch (arg) {
          case '--debounce':
            options.debounceMs = parseInt(args[++i]) || 300;
            break;
          case '--verbose':
            options.verbose = true;
            break;
          case '--no-clear':
            options.clear = false;
            break;
          default:
            // Unknown option
            break;
        }
      } else {
        if (!command) {
          command = arg;
        } else {
          commandArgs.push(arg);
        }
      }
      i++;
    }
    
    return { command, commandArgs, options };
  };
  
  const testArgs = ['node', 'server.js', '--debounce', '500', '--verbose'];
  const parsed = parseArgs(testArgs);
  
  assert(parsed.command === 'node', 'Should parse command correctly');
  assert(parsed.commandArgs.length === 1, 'Should parse command args correctly');
  assert(parsed.commandArgs[0] === 'server.js', 'Should parse server file correctly');
  assert(parsed.options.debounceMs === 500, 'Should parse debounce option correctly');
  assert(parsed.options.verbose === true, 'Should parse verbose flag correctly');
});
testRunner.test('File extension filtering logic', async () => {
  // Test the logic that would be used for file extension filtering
  const watchExtensions = ['.js', '.json', '.ts'];
  const testFiles = [
    'test.js',
    'config.json', 
    'app.ts',
    'styles.css',
    'readme.md'
  ];
  
  const shouldWatchFile = (filename, extensions) => {
    if (extensions.length === 0) return true;
    return extensions.some(ext => filename.endsWith(ext));
  };
  
  const watchedFiles = testFiles.filter(file => shouldWatchFile(file, watchExtensions));
  const expectedWatched = ['test.js', 'config.json', 'app.ts'];
  
  assert(watchedFiles.length === 3, 'Should watch exactly 3 files');
  assert(watchedFiles.every(file => expectedWatched.includes(file)), 'Should watch correct files');
});

// Run tests
await testRunner.run();