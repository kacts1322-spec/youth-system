import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

// 보호할 라우트 목록
const protectedRoutes = ['/dashboard', '/members', '/attendance', '/cells', '/reports', '/report-form'];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  
  // 보호된 라우트인지 확인
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route));
  
  if (path === '/') {
    // 루트 접속 시 로그인 페이지로
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (!isProtectedRoute) return NextResponse.next();

  const cookie = request.cookies.get('session')?.value;
  const session = cookie ? await decrypt(cookie) : null;

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const { role } = session;

  // 1. 셀리더(LEADER) 권한 제어: /report-form 외 접근 불가
  if (role === 'LEADER' && !path.startsWith('/report-form')) {
    return NextResponse.redirect(new URL('/report-form', request.url));
  }

  // 2. 일반관리자(MANAGER) 권한 제어: /reports (셀리더 보고서 열람) 접근 차단
  if (role === 'MANAGER' && path.startsWith('/reports')) {
    // 권한 없음 페이지 또는 대시보드로 튕겨냄
    return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
