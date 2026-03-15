import { useState, useEffect, useCallback, useRef } from 'react';
import { rulesApi, type ExpiringRule } from '../api/rules';

const POLL_INTERVAL_MS = 60 * 1000; // 每 60 秒轮询一次
const EXPIRING_MINUTES = 5;

// 记录已通知的规则 id，避免重复推送浏览器通知
const notifiedIds = new Set<string>();

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function sendBrowserNotification(rules: ExpiringRule[]) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const newRules = rules.filter((r) => !notifiedIds.has(r.id));
  if (newRules.length === 0) return;

  newRules.forEach((r) => notifiedIds.add(r.id));

  const title = `${newRules.length} 条规则即将到期`;
  const body =
    newRules.length === 1
      ? `规则 "${newRules[0].rule}" 将在 5 分钟内到期`
      : `包括 "${newRules[0].rule}" 等规则将在 5 分钟内到期`;

  new Notification(title, { body, icon: '/favicon.ico' });
}

export function useExpiringRules() {
  const [expiringRules, setExpiringRules] = useState<ExpiringRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const permissionRequestedRef = useRef(false);

  const fetchExpiringRules = useCallback(async () => {
    try {
      const rules = await rulesApi.getExpiringRules(EXPIRING_MINUTES);
      setExpiringRules(rules);
      if (rules.length > 0) {
        sendBrowserNotification(rules);
      }
    } catch {
      // 静默失败，不影响主功能
    }
  }, []);

  const extendRule = useCallback(async (id: string) => {
    setIsLoading(true);
    try {
      await rulesApi.extendRule(id, 1);
      // 延长后从列表里移除，避免用户看到过时状态
      setExpiringRules((prev) => prev.filter((r) => r.id !== id));
      // 也从已通知集合里移除，以便下次到期时再次提醒
      notifiedIds.delete(id);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // 只在首次挂载时请求通知权限
    if (!permissionRequestedRef.current) {
      permissionRequestedRef.current = true;
      requestNotificationPermission();
    }

    // 立即执行一次，然后定时轮询
    fetchExpiringRules();
    const timer = setInterval(fetchExpiringRules, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchExpiringRules]);

  return { expiringRules, extendRule, isLoading };
}
