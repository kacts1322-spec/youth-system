'use client';

import { useActionState } from 'react';
import { loginAction } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  // Next.js 15 (React 19) useActionState 사용
  const [state, formAction, isPending] = useActionState(loginAction as any, null);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm game-card-glow">
        <CardHeader className="space-y-1 text-center">
          <div className="text-4xl mb-2">⛪</div>
          <CardTitle className="text-2xl font-extrabold tracking-tight text-neon-cyan">
            청년부 관리 시스템
          </CardTitle>
          <CardDescription className="text-gray-400 font-medium">
            부여받은 권한 비밀번호를 입력해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction}>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password" className="sr-only">비밀번호</Label>
                <Input 
                  id="password" 
                  name="password" 
                  type="password" 
                  placeholder="🔑 비밀번호 입력" 
                  required
                  className="h-12 text-lg bg-[#1e2235] border-[#363e60] text-gray-100 focus:border-cyan-500"
                />
              </div>
              {state?.error && (
                <p className="text-sm font-medium text-red-400 text-center">{state.error}</p>
              )}
              <Button type="submit" className="w-full h-12 text-base font-extrabold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white shadow-lg shadow-cyan-500/20 rounded-xl transition-all duration-300 hover:scale-[1.02]" disabled={isPending}>
                {isPending ? '⏳ 확인 중...' : '🚀 로그인'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
