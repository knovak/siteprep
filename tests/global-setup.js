const { execSync } = require('child_process');

module.exports = async () => {
  console.log('Building site before running tests...');
  try {
    execSync('bash scripts/build.sh', {
      cwd: process.cwd(),
      stdio: 'inherit'
    });
    console.log('Build complete!');
  } catch (error) {
    console.error('Build failed:', error);
    throw error;
  }
};
