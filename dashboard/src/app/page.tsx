'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, CallLog } from '@/lib/supabase';
import { DEMO_MODE, getDemoCalls, getDemoLogs } from '@/lib/demo-data';
import { formatDuration, scoreBg } from '@/lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Phone, PhoneIncoming, PhoneOutgoing, Star } from 'lucide-react';

type ManagerStats = {
  num: string;
  name: string;
  total: number;
  incoming: number;
  outgoing: number;
  answered: number;
  noanswer: number;
  analyzed: number;
  avg_billsec: number;
  avg_score: number | null;
};

type DailyPoint = {
  date: string;
  incoming: number;
  outgoing: number;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [managers, setManagers] = useState<ManagerStats[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [totals, setTotals] = useState({
    total: 0,
    incoming: 0,
    outgoing: 0,
    analyzed: 0,
  });
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    setLoading(true);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [logs, analyzed] = DEMO_MODE
      ? [getDemoLogs(days), getDemoCalls(days)]
      : await Promise.all([
          supabase.from('calls_log').select('*').gte('call_date', since).limit(50000).then(({ data }) => data || []),
          supabase.from('calls').select('manager_num, score').gte('call_date', since).limit(50000).then(({ data }) => data || []),
        ]);

    const allLogs = logs as CallLog[];
    const scoresByMgr: Record<string, number[]> = {};
    (analyzed || []).forEach((r: { manager_num: string; score: number }) => {
      if (r.score != null) {
        if (!scoresByMgr[r.manager_num]) scoresByMgr[r.manager_num] = [];
        scoresByMgr[r.manager_num].push(r.score);
      }
    });

    const byMgr: Record<string, ManagerStats> = {};
    allLogs.forEach((c) => {
      const key = c.manager_num;
      if (!byMgr[key]) {
        byMgr[key] = {
          num: c.manager_num,
          name: c.manager_name,
          total: 0,
          incoming: 0,
          outgoing: 0,
          answered: 0,
          noanswer: 0,
          analyzed: 0,
          avg_billsec: 0,
          avg_score: null,
        };
      }
      const m = byMgr[key];
      m.total++;
      if (c.direction === 'incoming') m.incoming++;
      else m.outgoing++;
      if (c.disposition === 'ANSWERED') m.answered++;
      else m.noanswer++;
      if (c.has_analysis) m.analyzed++;
      m.avg_billsec += c.billsec || 0;
    });
    Object.values(byMgr).forEach((m) => {
      m.avg_billsec = m.answered ? Math.round(m.avg_billsec / m.answered) : 0;
      const scores = scoresByMgr[m.num];
      m.avg_score = scores && scores.length
        ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : null;
    });

    const dailyMap: Record<string, DailyPoint> = {};
    allLogs.forEach((c) => {
      const d = c.call_date.substring(0, 10);
      if (!dailyMap[d]) dailyMap[d] = { date: d, incoming: 0, outgoing: 0 };
      if (c.direction === 'incoming') dailyMap[d].incoming++;
      else dailyMap[d].outgoing++;
    });
    const sortedDaily = Object.values(dailyMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    setManagers(Object.values(byMgr).sort((a, b) => b.total - a.total));
    setDaily(sortedDaily);
    setTotals({
      total: allLogs.length,
      incoming: allLogs.filter((c) => c.direction === 'incoming').length,
      outgoing: allLogs.filter((c) => c.direction === 'outgoing').length,
      analyzed: allLogs.filter((c) => c.has_analysis).length,
    });
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <div className="flex gap-2 bg-white rounded-md p-1 border border-gray-200">
          {(['7d', '30d', '90d'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {p === '7d' ? '7 дней' : p === '30d' ? '30 дней' : '90 дней'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={Phone} label="Всего звонков" value={totals.total} />
        <StatCard
          icon={PhoneIncoming}
          label="Входящие"
          value={totals.incoming}
          color="text-blue-600"
        />
        <StatCard
          icon={PhoneOutgoing}
          label="Исходящие"
          value={totals.outgoing}
          color="text-purple-600"
        />
        <StatCard
          icon={Star}
          label="С AI-разбором"
          value={totals.analyzed}
          color="text-green-600"
        />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          Активность по дням
        </h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer minWidth={0}>
            <BarChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="incoming" stackId="a" fill="#3b82f6" name="Входящие" />
              <Bar dataKey="outgoing" stackId="a" fill="#a855f7" name="Исходящие" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-700">Менеджеры</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : managers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Нет данных за выбранный период
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Менеджер</th>
                <th className="text-right p-3">Всего</th>
                <th className="text-right p-3">Вх</th>
                <th className="text-right p-3">Исх</th>
                <th className="text-right p-3">Отв</th>
                <th className="text-right p-3">Пропущ.</th>
                <th className="text-right p-3">Разобрано</th>
                <th className="text-right p-3">Ср. длит.</th>
                <th className="text-right p-3">Ср. оценка</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.num} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-3">
                    <Link
                      href={`/manager/${m.num}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {m.name}
                    </Link>
                    <span className="text-gray-400 ml-2">#{m.num}</span>
                  </td>
                  <td className="text-right p-3">{m.total}</td>
                  <td className="text-right p-3 text-blue-600">{m.incoming}</td>
                  <td className="text-right p-3 text-purple-600">{m.outgoing}</td>
                  <td className="text-right p-3 text-green-600">{m.answered}</td>
                  <td className="text-right p-3 text-gray-500">{m.noanswer}</td>
                  <td className="text-right p-3">{m.analyzed}</td>
                  <td className="text-right p-3">{formatDuration(m.avg_billsec)}</td>
                  <td className="text-right p-3">
                    {m.avg_score != null ? (
                      <span
                        className={`inline-block px-2 py-0.5 rounded ${scoreBg(
                          m.avg_score
                        )}`}
                      >
                        {m.avg_score}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'text-gray-900',
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-semibold mb-2">
        <Icon size={14} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>{value.toLocaleString('ru-RU')}</div>
    </div>
  );
}
