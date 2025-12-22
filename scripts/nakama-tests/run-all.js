import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const tests = [
  { name: 'Authentication', file: '01-authentication.js' },
  { name: 'User Account', file: '02-user-account.js' },
  { name: 'Storage', file: '03-storage.js' },
  { name: 'Friends', file: '04-friends.js' },
  { name: 'Groups', file: '05-groups.js' },
  { name: 'Chat', file: '06-chat.js' },
  { name: 'Matches', file: '07-matches.js' },
  { name: 'Matchmaker', file: '08-matchmaker.js' },
  { name: 'Leaderboards', file: '09-leaderboards.js' },
  { name: 'Notifications', file: '10-notifications.js' },
];

function runTest(testFile) {
  return new Promise((resolve) => {
    const child = spawn('node', [join(__dirname, testFile)], {
      stdio: 'inherit',
      cwd: __dirname
    });

    child.on('close', (code) => {
      resolve(code === 0);
    });

    child.on('error', () => {
      resolve(false);
    });
  });
}

async function runAllTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║           NAKAMA SERVER TEST SUITE                        ║');
  console.log('║           Server: http://136.243.136.206:7350             ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const results = [];

  for (const test of tests) {
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`Running: ${test.name}`);
    console.log('═'.repeat(60));

    const passed = await runTest(test.file);
    results.push({ name: test.name, status: passed ? 'PASSED' : 'FAILED' });

    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST SUMMARY                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const passed = results.filter(r => r.status === 'PASSED').length;
  const failed = results.filter(r => r.status === 'FAILED').length;

  results.forEach(r => {
    const icon = r.status === 'PASSED' ? '✅' : '❌';
    console.log(`${icon} ${r.name}: ${r.status}`);
  });

  console.log(`\nTotal: ${passed} passed, ${failed} failed out of ${tests.length} tests`);

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
