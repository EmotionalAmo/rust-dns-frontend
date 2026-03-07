import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { domainCheckApi } from '@/api/domainCheck';
import type { DomainCheckResult } from '@/api/domainCheck';
import { rulesApi } from '@/api/rules';
import { toast } from 'sonner';
import { Search, Globe, ArrowRight, ShieldOff, ShieldCheck } from 'lucide-react';

export default function DomainLookupPage() {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [results, setResults] = useState<DomainCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [addingRules, setAddingRules] = useState<Set<string>>(new Set());

  const handleCheck = async () => {
    const domains = input
      .split('\n')
      .map(d => d.trim())
      .filter(d => d.length > 0);

    if (domains.length === 0) return;

    setLoading(true);
    setError(null);
    setSearched(false);
    try {
      const res = await domainCheckApi.checkDomains(domains);
      setResults(res.results);
      setSearched(true);
    } catch {
      setError(t('domainLookup.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) {
      // Allow newline naturally; Ctrl+Enter triggers check
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    }
  };

  const handleAddRule = async (domain: string, isWhitelist: boolean) => {
    const key = `${domain}:${isWhitelist ? 'white' : 'black'}`;
    setAddingRules(prev => new Set(prev).add(key));
    try {
      const rule = isWhitelist ? `@@||${domain}^` : `||${domain}^`;
      await rulesApi.createRule({ rule, comment: 'Added from domain lookup' });
      toast.success(t(isWhitelist ? 'domainLookup.addedWhitelist' : 'domainLookup.addedBlacklist', { domain }));
    } catch {
      toast.error(t('domainLookup.addError'));
    } finally {
      setAddingRules(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  const getActionBadge = (result: DomainCheckResult) => {
    if (result.blocked) {
      return <Badge variant="destructive">{t('domainLookup.statusBlocked')}</Badge>;
    }
    if (result.action === 'rewrite') {
      return <Badge variant="secondary">{t('domainLookup.statusRewrite')}</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-400">{t('domainLookup.statusAllowed')}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            {t('domainLookup.title')}
          </CardTitle>
          <CardDescription>{t('domainLookup.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder={t('domainLookup.placeholder')}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-3">
            <Button onClick={handleCheck} disabled={loading || input.trim().length === 0}>
              {loading ? t('domainLookup.checking') : t('domainLookup.check')}
            </Button>
            <span className="text-xs text-muted-foreground">{t('domainLookup.hint')}</span>
          </div>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </CardContent>
      </Card>

      {searched && results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('domainLookup.resultsTitle')}</CardTitle>
            <CardDescription>{t('domainLookup.resultsDesc', { count: results.length })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {results.map(result => (
                <div
                  key={result.domain}
                  className={`flex items-center justify-between rounded-md border px-4 py-3 text-sm ${
                    result.blocked
                      ? 'border-destructive/30 bg-destructive/5'
                      : result.action === 'rewrite'
                        ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
                        : 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {result.blocked
                      ? <ShieldOff className="h-4 w-4 shrink-0 text-destructive" />
                      : <ShieldCheck className="h-4 w-4 shrink-0 text-green-500" />
                    }
                    <div className="min-w-0">
                      <span className="font-mono font-medium truncate block" title={result.domain}>
                        {result.domain}
                      </span>
                      {result.rewrite_target && (
                        <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                          <ArrowRight className="h-3 w-3 shrink-0" />
                          <span className="font-mono truncate">{result.rewrite_target}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    {getActionBadge(result)}
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        disabled={addingRules.has(`${result.domain}:${result.blocked ? 'white' : 'black'}`)}
                        onClick={() => handleAddRule(result.domain, result.blocked)}
                      >
                        <Globe className="h-3 w-3 mr-1" />
                        {result.blocked ? t('domainLookup.addWhitelist') : t('domainLookup.addBlacklist')}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {searched && results.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">{t('domainLookup.noResults')}</p>
      )}
    </div>
  );
}
