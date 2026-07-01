'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { encrypt } from '@/lib/auth';

export async function loginAction(prevState: any, formData: FormData) {
  const password = formData.get('password') as string;

  if (!password) {
    return { error: '비밀번호를 입력해주세요.' };
  }

  let role: 'ADMIN' | 'MANAGER' | 'LEADER' | null = null;

  // 역할별 비밀번호 검증
  if (password === process.env.ADMIN_PASSWORD) {
    role = 'ADMIN';
  } else if (password === process.env.MANAGER_PASSWORD) {
    role = 'MANAGER';
  } else if (password === process.env.LEADER_PASSWORD) {
    role = 'LEADER';
  }

  if (!role) {
    return { error: '비밀번호가 일치하지 않습니다.' };
  }

  // 세션 토큰 생성 (만료시간 1일)
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({ role, expires });

  // 쿠키에 세션 저장
  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    sameSite: 'lax',
    path: '/',
  });

  // 역할에 따른 리다이렉션
  if (role === 'LEADER') {
    redirect('/report-form');
  } else {
    redirect('/dashboard');
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('session');
  redirect('/login');
}
