const { mdToPdf } = require('md-to-pdf');
const path = require('path');
const fs = require('fs');

async function generate() {
  const leaderMd = path.join(__dirname, '..', 'manuals', 'leader_manual.md');
  const managerMd = path.join(__dirname, '..', 'manuals', 'manager_manual.md');
  const leaderPdf = path.join(__dirname, '..', 'manuals', 'youth-system-leader-manual.pdf');
  const managerPdf = path.join(__dirname, '..', 'manuals', 'youth-system-manager-manual.pdf');

  console.log('PDF 생성 시작...');
  
  try {
    await mdToPdf({ path: leaderMd }, { dest: leaderPdf });
    console.log('✅ 셀리더 매뉴얼 생성 완료:', leaderPdf);
    
    await mdToPdf({ path: managerMd }, { dest: managerPdf });
    console.log('✅ 임원 매뉴얼 생성 완료:', managerPdf);
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error);
  }
}

generate();
