import { useExpiringRules } from '../hooks/useExpiringRules';
import { Button } from './ui/button';

function formatTimeLeft(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '已到期';
  const minutes = Math.floor(diff / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  if (minutes > 0) return `${minutes} 分 ${seconds} 秒后到期`;
  return `${seconds} 秒后到期`;
}

export function ExpiringRulesAlert() {
  const { expiringRules, extendRule, isLoading } = useExpiringRules();

  if (expiringRules.length === 0) return null;

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {expiringRules.length} 条临时规则即将到期（5 分钟内）
          </p>
          <div className="mt-2 space-y-2">
            {expiringRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between gap-3 rounded-md bg-amber-100 px-3 py-2 dark:bg-amber-900"
              >
                <div className="min-w-0 flex-1">
                  <code className="block truncate text-xs font-mono text-amber-900 dark:text-amber-100">
                    {rule.rule}
                  </code>
                  <span className="text-xs text-amber-700 dark:text-amber-300">
                    {formatTimeLeft(rule.expires_at)}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-7 text-xs border-amber-400 text-amber-800 hover:bg-amber-200 dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-800"
                  disabled={isLoading}
                  onClick={() => extendRule(rule.id)}
                >
                  延长 1h
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
