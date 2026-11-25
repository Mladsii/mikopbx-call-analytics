'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, CallLog, Call, SHORT_CALL_LABELS } from '@/lib/supabase';
import { DEMO_MODE, getDemoCalls, getDemoLogs } from '@/lib/demo-data';
import { formatDuration, formatDate, scoreBg } from '@/lib/utils';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ArrowLeft, PhoneIncoming, PhoneOutgoing, Star, Clock, MessageSquare } from 'lucide-react';

type Props = { params: Promise<{ num: string }> };

const COLORS = ['#3b82f6', '#a855f7', '#10b981', '#f59e0b'];

export default function ManagerPage({ params }: Props) {
  const { num } = use(params);
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [analyzed, setAnalyzed] = useState<Call[]>([]);
  const [managerName, setManagerName] = useState('');
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const [filterDir, setFilterDir] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [filterAnswered, setFilterAnswered] = useState<'all' | 'answered' | 'noanswer'>('all');
  const [filterAnalyzed, setFilterAnalyzed] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    loadData();
  }, [num, period]);

  async function loadData() {
    setLoading(true);
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const [logsData, callsData] = DEMO_MODE
      ? [getDemoLogs(days, num), getDemoCalls(days, num)]
      : await Promise.all([
          supabase.from('calls_log').select('*').eq('manager_num', num).gte('call_date', since).order('call_date', { ascending: false }).limit(50000).then(({ data }) => data || []),
          supabase.from('calls').select('*').eq('manager_num', num).gte('call_date', since).order('call_date', { ascending: false }).limit(50000).then(({ data }) => data || []),
        ]);

    const logsArr = (logsData || []) as CallLog[];
    setLogs(logsArr);
    setAnalyzed((callsData || []) as Call[]);
    if (logsArr.length) setManagerName(logsArr[0].manager_name);
    setLoading(false);
  }

  const filtered = logs.filter((c) => {
    if (filterDir !== 'all' && c.direction !== filterDir) return false;
    if (filterAnswered === 'answered' && c.disposition !== 'ANSWERED') return false;
    if (filterAnswered === 'noanswer' && c.disposition === 'ANSWERED') return false;
    const hasAnalysis = analyzed.some((x) => x.linkedid === c.linkedid);
    if (filterAnalyzed === 'with' && !hasAnalysis) return false;
    if (filterAnalyzed === 'without' && hasAnalysis) return false;
    return true;
  });

  const dailyMap: Record<string, { date: string; in: number; out: number }> = {};
  logs.forEach((c) => {
    const d = c.call_date.substring(0, 10);
    if (!dailyMap[d]) dailyMap[d] = { date: d, in: 0, out: 0 };
    if (c.direction === 'incoming') dailyMap[d].in++;
    else dailyMap[d].out++;
  });
  const daily = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  const scoresMap: Record<string, { date: string; score: number; count: number }> = {};
  analyzed.forEach((c) => {
    if (c.score == null) return;
    const d = c.call_date.substring(0, 10);
    if (!scoresMap[d]) scoresMap[d] = { date: d, score: 0, count: 0 };
    scoresMap[d].score += c.score;
    scoresMap[d].count++;
  });
  const scoreSeries = Object.values(scoresMap)
    .map((d) => ({ date: d.date, avg: Number((d.score / d.count).toFixed(2)) }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const typeMap: Record<string, number> = {};
  analyzed.forEach((c) => {
    typeMap[c.call_type] = (typeMap[c.call_type] || 0) + 1;
  });
  const typeData = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

  const mistakeMap: Record<string, number> = {};
  analyzed.forEach((c) => {
    (c.mistakes || []).forEach((m) => {
      const key = m.split(' — ')[0] || m;
      mistakeMap[key] = (mistakeMap[key] || 0) + 1;
    });
  });
  const topMistakes = Object.entries(mistakeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const answered = logs.filter((c) => c.disposition === 'ANSWERED').length;
  const avgScore = analyzed.length
    ? Number(
        (
          analyzed.filter((c) => c.score != null).reduce((s, c) => s + c.score, 0) /
          analyzed.filter((c) => c.score != null).length
        ).toFixed(1)
      )
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} /> К дашборду
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{managerName || num}</h1>
          <p className="text-gray-500 text-sm mt-1">Менеджер #{num}</p>
        </div>
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
        <Stat icon={PhoneIncoming} label="Входящие" value={logs.filter((c) => c.direction === 'incoming').length} />
        <Stat icon={PhoneOutgoing} label="Исходящие" value={logs.filter((c) => c.direction === 'outgoing').length} />
        <Stat icon={Clock} label="Ответили" value={answered} sub={`из ${logs.length}`} />
        <Stat
          icon={Star}
          label="Ср. оценка"
          value={avgScore != null ? avgScore.toString() : '—'}
          raw
          color={avgScore != null && avgScore >= 8 ? 'text-green-600' : avgScore != null && avgScore < 5 ? 'text-red-600' : 'text-yellow-600'}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card title="Активность по дням">
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip />
                <Legend />
                <Bar dataKey="in" stackId="a" fill="#3b82f6" name="Вх" />
                <Bar dataKey="out" stackId="a" fill="#a855f7" name="Исх" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Средняя оценка по дням">
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <LineChart data={scoreSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" fontSize={11} />
                <YAxis domain={[0, 10]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Типы звонков">
          <div style={{ width: '100%', height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Топ-5 ошибок">
          {topMistakes.length === 0 ? (
            <div className="text-gray-400 text-sm">Нет данных</div>
          ) : (
            <ol className="space-y-2">
              {topMistakes.map(([m, n]) => (
                <li key={m} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex-1 truncate" title={m}>
                    {m}
                  </span>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                    {n}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Звонки ({filtered.length})</h2>
          <div className="flex gap-2">
            <select
              value={filterDir}
              onChange={(e) => setFilterDir(e.target.value as 'all' | 'incoming' | 'outgoing')}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="all">Все направления</option>
              <option value="incoming">Только входящие</option>
              <option value="outgoing">Только исходящие</option>
            </select>
            <select
              value={filterAnswered}
              onChange={(e) => setFilterAnswered(e.target.value as 'all' | 'answered' | 'noanswer')}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="all">Все статусы</option>
              <option value="answered">Только отвеченные</option>
              <option value="noanswer">Только пропущенные</option>
            </select>
            <select
              value={filterAnalyzed}
              onChange={(e) => setFilterAnalyzed(e.target.value as 'all' | 'with' | 'without')}
              className="text-sm border border-gray-200 rounded px-2 py-1"
            >
              <option value="all">Все звонки</option>
              <option value="with">С AI-разбором</option>
              <option value="without">Без разбора</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Нет звонков</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Клиент</th>
                <th className="text-left p-3">Напр.</th>
                <th className="text-right p-3">Длит.</th>
                <th className="text-left p-3">Статус</th>
                <th className="text-left p-3">Разбор</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 200).map((c) => {
                const a = analyzed.find((x) => x.linkedid === c.linkedid);
                return (
                  <tr key={c.linkedid} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-gray-700">{formatDate(c.call_date)}</td>
                    <td className="p-3">{c.client_phone || '—'}</td>
                    <td className="p-3">
                      {c.direction === 'incoming' ? (
                        <span className="inline-flex items-center gap-1 text-blue-600">
                          <PhoneIncoming size={14} /> вх
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-purple-600">
                          <PhoneOutgoing size={14} /> исх
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">{formatDuration(c.billsec)}</td>
                    <td className="p-3">
                      {c.disposition === 'ANSWERED' ? (
                        <span className="text-green-600 text-xs">ответ</span>
                      ) : (
                        <span className="text-gray-400 text-xs">пропущен</span>
                      )}
                    </td>
                    <td className="p-3">
                      {a ? (
                        <Link
                          href={`/call/${c.linkedid}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <MessageSquare size={14} />
                          <span className={`px-1.5 py-0.5 rounded text-xs ${scoreBg(a.score)}`}>
                            {a.score}/10
                          </span>
                        </Link>
                      ) : c.short_call_type ? (
                        <Link
                          href={`/call/${c.linkedid}`}
                          className="inline-flex items-center gap-1 hover:underline"
                        >
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-medium ${
                              SHORT_CALL_LABELS[c.short_call_type]?.color || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {SHORT_CALL_LABELS[c.short_call_type]?.icon}{' '}
                            {SHORT_CALL_LABELS[c.short_call_type]?.label || c.short_call_type}
                          </span>
                        </Link>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  raw,
  color = 'text-gray-900',
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  value: number | string;
  sub?: string;
  raw?: boolean;
  color?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500 text-xs uppercase font-semibold mb-2">
        <Icon size={14} />
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {raw ? value : (typeof value === 'number' ? value.toLocaleString('ru-RU') : value)}
        {sub && <span className="text-sm font-normal text-gray-400 ml-2">{sub}</span>}
      </div>
    </div>
  );
}
