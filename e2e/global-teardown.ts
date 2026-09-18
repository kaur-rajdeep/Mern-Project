const { cleanTestData } = require('./clean-test-data');

async function globalTeardown() {
  console.log('\n[Playwright Global Teardown] Running automated test data cleanup...');
  try {
    await cleanTestData();
  } catch (err) {
    console.warn('[Playwright Global Teardown] Warning during cleanup:', err);
  }
}

export default globalTeardown;
