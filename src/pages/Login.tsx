import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi, type AuthUser } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Lock, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((state) => state.setAuth);
  const setRequiresPasswordChange = useAuthStore((state) => state.setRequiresPasswordChange);
  const setLoading = useAuthStore((state) => state.setLoading);
  const isLoading = useAuthStore((state) => state.isLoading);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(t('login.errorEmpty'));
      return;
    }
    setLoading(true);
    try {
      const response = await authApi.login({ username, password });
      const user: AuthUser = { username, role: response.role };
      setAuth(response.token, user);
      if (response.requires_password_change) {
        setRequiresPasswordChange(true);
        toast.warning(t('login.errorChangePassword'));
        navigate('/change-password', { replace: true });
      } else {
        setRequiresPasswordChange(false);
        toast.success(t('login.success'));
        navigate(from, { replace: true });
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || t('login.errorInvalid'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* 背景装饰 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, hsl(235 85% 60% / 0.15), transparent)',
        }}
      />
      <div
        className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full opacity-20"
        style={{ background: 'hsl(235 85% 60%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 h-64 w-64 rounded-full opacity-10"
        style={{ background: 'hsl(235 85% 60%)' }}
      />

      {/* 卡片 */}
      <div className="relative w-full max-w-sm px-6">
        {/* Logo 区 */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Ent-DNS</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('login.subtitle')}</p>
        </div>

        {/* 登录表单 */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-foreground">{t('login.title')}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('login.username')}
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                  autoComplete="username"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('login.password')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pl-9"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {t('login.loggingIn')}
                </span>
              ) : (
                t('login.submit')
              )}
            </Button>
          </form>
        </div>

        {/* 底部提示 */}
        <p className="mt-5 text-center text-xs text-muted-foreground">
          {t('login.defaultAccount')} <span className="font-mono font-medium text-foreground">admin</span>
          {' / '}
          <span className="font-mono font-medium text-foreground">admin</span>
        </p>
      </div>
    </div>
  );
}
