import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';

// JWT 비밀키 (운영 환경에서는 더 길고 복잡한 임의의 문자열로 설정해야 함)
const secretKey = process.env.JWT_SECRET || 'church-youth-default-secret-key-please-change';
const key = new TextEncoder().encode(secretKey);

export type Role = 'ADMIN' | 'MANAGER' | 'LEADER';

export interface SessionPayload {
  role: Role;
  expires: Date;
}

// Session 암호화 (JWT 발급)
export async function encrypt(payload: Omit<SessionPayload, 'expires'> & { expires: Date }) {
  return await new SignJWT(payload as any)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d')
    .sign(key);
}

// Session 복호화 및 검증
export async function decrypt(input: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(input, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch (error) {
    return null; // 만료되거나 유효하지 않은 토큰
  }
}

// 현재 세션 가져오기
export async function getSession() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  
  return await decrypt(session);
}
