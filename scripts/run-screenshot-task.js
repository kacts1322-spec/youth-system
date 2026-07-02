const { spawn, execSync } = require('child_process');

async function run() {
  console.log('Next.js 서버 시작 중...');
  const server = spawn(/^win/.test(process.platform) ? 'npm.cmd' : 'npm', ['run', 'dev'], {
    stdio: 'ignore',
    shell: true
  });

  console.log('서버 준비 대기 (30초)...');
  await new Promise(r => setTimeout(r, 30000));

  console.log('스크린샷 스크립트 실행...');
  try {
    execSync('node scripts/take-screenshots.js', { stdio: 'inherit' });
    console.log('스크린샷 완료!');
  } catch (err) {
    console.error('스크립트 실행 실패:', err);
  } finally {
    console.log('서버 종료 중...');
    if (/^win/.test(process.platform)) {
      execSync(`taskkill /pid ${server.pid} /T /F`);
    } else {
      server.kill();
    }
    process.exit(0);
  }
}

run();
