const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IMG_DIR = path.join(__dirname, '..', 'public', 'manual-images');

if (!fs.existsSync(IMG_DIR)) {
  fs.mkdirSync(IMG_DIR, { recursive: true });
}

async function takeScreenshots() {
  console.log('브라우저 실행 중...');
  const browser = await puppeteer.launch({ 
    headless: "new",
    defaultViewport: { width: 430, height: 932 } // 모바일 뷰포트 (iPhone 14 Pro 기준)
  });

  try {
    // 1. 셀리더 모드 스크린샷
    console.log('[셀리더] 로그인 캡처 중...');
    let context = await browser.createBrowserContext();
    let page = await context.newPage();
    
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('input[type="password"]');
    
    // 로그인 화면 캡처
    await page.screenshot({ path: path.join(IMG_DIR, 'leader-login.png') });
    
    // 로그인 진행
    await page.type('input[type="password"]', '2026');
    await page.click('button[type="submit"]');
    
    console.log('[셀리더] 주간 보고서 화면 캡처 중...');
    await page.waitForNavigation();
    await page.waitForSelector('form'); // 폼 로딩 대기
    await new Promise(r => setTimeout(r, 2000)); // 애니메이션/데이터 로딩 대기
    await page.screenshot({ path: path.join(IMG_DIR, 'leader-report-form.png'), fullPage: true });
    
    await context.close();

    // 2. 임원 모드 스크린샷
    console.log('[임원] 로그인 및 대시보드 캡처 중...');
    context = await browser.createBrowserContext();
    page = await context.newPage();
    
    await page.goto('http://127.0.0.1:3000/login', { waitUntil: 'load', timeout: 60000 });
    await page.waitForSelector('input[type="password"]');
    
    await page.type('input[type="password"]', '1q2w3e4r');
    await page.click('button[type="submit"]');
    
    await page.waitForNavigation();
    await new Promise(r => setTimeout(r, 2000)); // 차트 및 데이터 로딩 대기
    await page.screenshot({ path: path.join(IMG_DIR, 'manager-dashboard.png'), fullPage: true });
    
    console.log('[임원] 출석 체크 화면 캡처 중...');
    await page.goto('http://127.0.0.1:3000/attendance', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(IMG_DIR, 'manager-attendance.png'), fullPage: true });

    console.log('[임원] 명단 관리 화면 캡처 중...');
    await page.goto('http://127.0.0.1:3000/members', { waitUntil: 'load' });
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: path.join(IMG_DIR, 'manager-members.png'), fullPage: true });

    await context.close();
    console.log('✅ 모든 스크린샷 촬영 완료!');

  } catch (error) {
    console.error('❌ 스크린샷 캡처 중 오류 발생:', error);
  } finally {
    await browser.close();
  }
}

takeScreenshots();
