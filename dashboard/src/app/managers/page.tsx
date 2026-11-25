'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, CallLog } from '@/lib/supabase';
import { DEMO_MODE, getDemoCalls, getDemoLogs } from '@/lib/demo-data';
import { formatDuration, scoreBg } from '@/lib/utils';
import { Star } from 'lucide-react';

type ManagerCard = {
  num: string;
  name: string;
  total: number;
  answered: number;
  avg_billsec: number;
  analyzed: number;
  avg_score: number | null;
};

export default function ManagersPage() {
  const [managers, setManagers] = useState<ManagerCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [filterAnalyzed, setFilterAnalyzed] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    load();
  }, [period]);

  async function load() {
    setLoading(true);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [logsData, callsData] = DEMO_MODE
      ? [getDemoLogs(days), getDemoCalls(days)]
      : await Promise.all([
          supabase.from('calls_log').select('*').gte('call_date', since).limit(50000).then(({ data }) => data || []),
          supabase.from('calls').select('manager_num, score').gte('call_date', since).limit(50000).then(({ data }) => data || []),
        ]);

    const logs = (logsData || []) as CallLog[];
    const scoresByMgr: Record<string, number[]> = {};
    (callsData || []).forEach((c: { manager_num: string; score: number }) => {
      if (c.score != null) {
        if (!scoresByMgr[c.manager_num]) scoresByMgr[c.manager_num] = [];
        scoresByMgr[c.manager_num].push(c.score);
      }
    });

    const byMgr: Record<string, ManagerCard> = {};
    logs.forEach((c) => {
      if (!byMgr[c.manager_num]) {
        byMgr[c.manager_num] = {
          num: c.manager_num,
          name: c.manager_name,
          total: 0,
          answered: 0,
          avg_billsec: 0,
          analyzed: 0,
          avg_score: null,
        };
      }
      const m = byMgr[c.manager_num];
      m.total++;
      if (c.disposition === 'ANSWERED') m.answered++;
      if (c.has_analysis) m.analyzed++;
      m.avg_billsec += c.billsec || 0;
    });

    Object.values(byMgr).forEach((m) => {
      m.avg_billsec = m.answered ? Math.round(m.avg_billsec / m.answered) : 0;
      const scores = scoresByMgr[m.num];
      m.avg_score = scores?.length
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : null;
    });

    setManagers(Object.values(byMgr).sort((a, b) => b.total - a.total));
    setLoading(false);
  }

  const filtered = managers.filter((m) => {
    if (filterAnalyzed === 'with') return m.analyzed > 0;
    if (filterAnalyzed === 'without') return m.analyzed === 0;
    return true;
  });

  const periodLabel = period === '7d' ? '7 дней' : period === '30d' ? '30 дней' : '90 дней';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Менеджеры</h1>
        <div className="flex items-center gap-3">
          <select
            value={filterAnalyzed}
            onChange={(e) => setFilterAnalyzed(e.target.value as 'all' | 'with' | 'without')}
            className="text-sm border border-gray-200 rounded px-3 py-1.5 bg-white"
          >
            <option value="all">Все менеджеры</option>
            <option value="with">Есть AI-разбор</option>
            <option value="without">Нет AI-разбора</option>
          </select>
          <div className="flex gap-2 bg-white rounded-md p-1 border border-gray-200">
            {(['7d', '30d', '90d'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded text-sm font-medium ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : '90 дней'}
              </button>
            ))}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-500">За последние {periodLabel}</p>

      {loading ? (
        <div className="text-center text-gray-500 p-8">Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-gray-500 p-8">Нет данных за выбранный период</div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((m) => (
            <Link
              key={m.num}
              href={`/manager/${m.num}`}
              className="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 hover:shadow-sm transition"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">#{m.num}</span>
                {m.avg_score != null && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${scoreBg(m.avg_score)}`}>
                    <Star size={10} />
                    {m.avg_score}
                  </span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">{m.name}</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-gray-500 uppercase">Всего</div>
                  <div className="text-xl font-bold">{m.total}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Ответ</div>
                  <div className="text-xl font-bold text-green-600">{m.answered}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Разбор</div>
                  <div className="text-xl font-bold text-blue-600">{m.analyzed}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 uppercase">Ср.длит</div>
                  <div className="text-xl font-bold">{formatDuration(m.avg_billsec)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
