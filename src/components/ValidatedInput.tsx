import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import apiClient from '@/api/client';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type ValidationError = {
  message?: string;
  suggestion?: string;
};

type ValidationState = {
  forValue: string;
  valid: boolean;
  error?: ValidationError;
};

// 验证域名
async function validateDomain(domain: string): Promise<{ valid: boolean; error?: ValidationError }> {
  try {
    const result = await apiClient.post('/api/v1/rules/validate', {
      type: 'filter',
      rule: domain.trim(),
    });
    return result.data as { valid: boolean; error?: ValidationError };
  } catch (error) {
    return { valid: false, error: { message: (error as Error).message } };
  }
}

// 验证 IP
async function validateIp(ip: string): Promise<{ valid: boolean; error?: ValidationError }> {
  try {
    const result = await apiClient.post('/api/v1/rules/validate', {
      type: 'rewrite',
      rule: `test.local -> ${ip.trim()}`,
    });
    return result.data as { valid: boolean; error?: ValidationError };
  } catch (error) {
    return { valid: false, error: { message: (error as Error).message } };
  }
}

interface ValidatedInputProps {
  value: string;
  onChange: (value: string) => void;
  type: 'domain' | 'ip';
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  name?: string;
  error?: string;
}

export function ValidatedInput({
  value,
  onChange,
  type,
  label,
  placeholder,
  disabled = false,
  className = '',
  id,
  name,
  error: externalError,
}: ValidatedInputProps) {
  const queryClient = useQueryClient();

  // Store result paired with the value it was validated for
  const [validationState, setValidationState] = useState<ValidationState | null>(null);

  useEffect(() => {
    if (!value.trim()) return;

    let cancelled = false;
    const cacheKey = ['validation', type, value];
    const cached = queryClient.getQueryData<{ valid: boolean; error?: ValidationError }>(cacheKey);

    if (cached) {
      // Use Promise.resolve to avoid synchronous setState in effect body
      Promise.resolve().then(() => {
        if (!cancelled) setValidationState({ forValue: value, ...cached });
      });
      return () => { cancelled = true; };
    }

    const timer = setTimeout(() => {
      const promise = type === 'domain' ? validateDomain(value) : validateIp(value);
      promise.then((result) => {
        if (!cancelled) {
          setValidationState({ forValue: value, ...result });
          queryClient.setQueryData(cacheKey, result);
        }
      });
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value, type, queryClient]);

  // Derive display values — null when empty or stale (new value typed, not yet validated)
  const isValid = !value.trim() ? null : validationState?.forValue === value ? validationState.valid : null;
  const localError = !value.trim() ? null : validationState?.forValue === value ? (validationState.error ?? null) : null;
  const hasError = !!localError || !!externalError;
  const displayError = localError || externalError;

  const getStatusColor = () => {
    if (isValid === true) return 'border-green-300';
    if (isValid === false) return 'border-red-300';
    return 'border-gray-300';
  };

  const getStatusIcon = () => {
    if (isValid === true) return <CheckCircle2 size={16} className="text-green-500" />;
    if (isValid === false) return <XCircle size={16} className="text-red-500" />;
    return null;
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <div className="relative">
        <Input
          id={id}
          name={name}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            pr-9 font-mono transition-colors
            ${getStatusColor()}
            ${hasError ? 'border-red-500' : ''}
          `}
        />
        {getStatusIcon() && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {getStatusIcon()}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {hasError && displayError && (
        <div className="flex items-start gap-2 text-sm text-red-600">
          <XCircle size={16} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            {typeof displayError === 'string' ? (
              <span>{displayError}</span>
            ) : displayError?.message ? (
              <div className="space-y-1">
                <div className="font-medium">{displayError.message}</div>
                {displayError.suggestion && (
                  <div className="text-xs opacity-80">建议: {displayError.suggestion}</div>
                )}
              </div>
            ) : (
              <span>格式错误</span>
            )}
          </div>
        </div>
      )}

      {/* 有效提示 */}
      {isValid === true && value.trim() && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <CheckCircle2 size={16} />
          <span>格式正确</span>
        </div>
      )}
    </div>
  );
}
