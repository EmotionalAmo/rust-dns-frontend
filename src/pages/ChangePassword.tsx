import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { authApi } from '@/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function ChangePasswordPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setRequiresPasswordChange = useAuthStore((state) => state.setRequiresPasswordChange);
  const isLoading = useAuthStore((state) => state.isLoading);
  const setLoading = useAuthStore((state) => state.setLoading);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { score: 0, label: '', color: '' };
    if (password.length < 8) return { score: 1, label: t('changePassword.strengthTooShort'), color: 'text-red-500' };
    if (!/[A-Z]/.test(password)) return { score: 2, label: t('changePassword.strengthWeak'), color: 'text-orange-500' };
    if (!/[a-z]/.test(password) || !/[0-9]/.test(password)) return { score: 3, label: t('changePassword.strengthMedium'), color: 'text-yellow-500' };
    return { score: 4, label: t('changePassword.strengthStrong'), color: 'text-green-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const isFormValid = () => {
    return (
      currentPassword &&
      newPassword &&
      confirmPassword &&
      newPassword === confirmPassword &&
      newPassword.length >= 8
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('changePassword.errorEmpty'));
      return;
    }

    if (newPassword.length < 8) {
      toast.error(t('changePassword.errorTooShort'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('changePassword.errorMismatch'));
      return;
    }

    if (currentPassword === newPassword) {
      toast.error(t('changePassword.errorSameAsOld'));
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setRequiresPasswordChange(false);
      toast.success(t('changePassword.successTitle'), {
        description: t('changePassword.successDesc'),
        duration: 3000,
      });
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1000);
    } catch (error: unknown) {
      toast.error((error as Error).message || t('changePassword.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // If password change is not required, allow cancel
    const requiresPasswordChange = useAuthStore.getState().requiresPasswordChange;
    if (!requiresPasswordChange) {
      navigate(-1);
    } else {
      toast.warning(t('changePassword.firstLoginDesc'));
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background decoration */}
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

      {/* Card */}
      <div className="relative w-full max-w-md px-6">
        {/* Logo area */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('changePassword.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('changePassword.user', { name: user?.username || t('common.unknown') })}
          </p>
        </div>

        {/* Change Password Form */}
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title={t('common.back')}
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-base font-semibold text-foreground">{t('changePassword.subtitle')}</h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-1.5">
              <Label htmlFor="current-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('changePassword.currentPassword')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="•••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-1.5">
              <Label htmlFor="new-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('changePassword.newPassword')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="•••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPassword && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">{t('changePassword.strength')}</span>
                  <span className={`font-medium ${strength.color}`}>{strength.label}</span>
                  <span className="ml-auto text-muted-foreground">
                    {t('changePassword.charCount', { count: newPassword.length })}
                  </span>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {t('changePassword.confirmPassword')}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="•••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="pl-9 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <div className="flex items-center gap-1.5 text-xs">
                  {newPassword === confirmPassword ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span className="text-green-600 dark:text-green-400">{t('changePassword.passwordMatch')}</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                      <span className="text-red-600 dark:text-red-400">{t('changePassword.passwordMismatch')}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Password Requirements */}
            <div className="rounded-lg bg-muted/50 p-3 text-xs">
              <p className="mb-2 font-medium text-foreground">{t('changePassword.requirements')}</p>
              <ul className="space-y-1">
                <li className={`flex items-center gap-2 ${newPassword.length >= 8 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {newPassword.length >= 8 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {t('changePassword.req8chars')}
                </li>
                <li className={`flex items-center gap-2 {/[A-Z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {/[A-Z]/.test(newPassword) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {t('changePassword.reqUppercase')}
                </li>
                <li className={`flex items-center gap-2 {/[a-z]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {/[a-z]/.test(newPassword) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {t('changePassword.reqLowercase')}
                </li>
                <li className={`flex items-center gap-2 {/[0-9]/.test(newPassword) ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {/[0-9]/.test(newPassword) ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  {t('changePassword.reqNumber')}
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={isLoading}
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="submit"
                className="flex-1 font-medium"
                disabled={isLoading || !isFormValid()}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    {t('common.processing')}
                  </span>
                ) : (
                  t('changePassword.title')
                )}
              </Button>
            </div>
          </form>
        </div>

        {/* Security notice */}
        <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
          <p className="text-center text-xs text-amber-800 dark:text-amber-400">
            {t('changePassword.tip')}
          </p>
        </div>
      </div>
    </div>
  );
}
