'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, CallLog, Call } from '@/lib/supabase';
import { DEMO_MODE, getDemoCalls, getDemoLogs } from '@/lib/demo-data';
import { formatDuration, formatDate, scoreBg } from '@/lib/utils';
import { PhoneIncoming, PhoneOutgoing, MessageSquare } from 'lucide-react';

export default function CallsPage() {
  const [logs, setLogs] = useState<CallLog[]>([]);
  const [analyzedMap, setAnalyzedMap] = useState<Record<string, Call>>({});
  const [loading, setLoading] = useState(true);
  const [filterAnalyzed, setFilterAnalyzed] = useState<'all' | 'with' | 'without'>('all');

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [logsData, callsData] = DEMO_MODE
      ? [getDemoLogs(30), getDemoCalls(30)]
      : await Promise.all([
          supabase.from('calls_log').select('*').gte('call_date', since).order('call_date', { ascending: false }).limit(50000).then(({ data }) => data || []),
          supabase.from('calls').select('linkedid, score, call_type').gte('call_date', since).limit(50000).then(({ data }) => data || []),
        ]);

    const map: Record<string, Call> = {};
    (callsData || []).forEach((c) => {
      map[c.linkedid] = c as Call;
    });

    setLogs((logsData || []) as CallLog[]);
    setAnalyzedMap(map);
    setLoading(false);
  }

  const filtered = logs.filter((c) => {
    if (filterAnalyzed === 'with' && !analyzedMap[c.linkedid]) return false;
    if (filterAnalyzed === 'without' && analyzedMap[c.linkedid]) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Звонки</h1>
        <select
          value={filterAnalyzed}
          onChange={(e) => setFilterAnalyzed(e.target.value as 'all' | 'with' | 'without')}
          className="text-sm border border-gray-200 rounded px-3 py-1.5 bg-white"
        >
          <option value="all">Все звонки</option>
          <option value="with">С AI-разбором</option>
          <option value="without">Без разбора</option>
        </select>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Загрузка...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left p-3">Дата</th>
                <th className="text-left p-3">Менеджер</th>
                <th className="text-left p-3">Клиент</th>
                <th className="text-left p-3">Напр.</th>
                <th className="text-right p-3">Длит.</th>
                <th className="text-left p-3">Тип</th>
                <th className="text-left p-3">Оценка</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const a = analyzedMap[c.linkedid];
                return (
                  <tr key={c.linkedid} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="p-3 text-gray-700 whitespace-nowrap">{formatDate(c.call_date)}</td>
                    <td className="p-3">
                      <Link href={`/manager/${c.manager_num}`} className="text-blue-600 hover:underline">
                        {c.manager_name}
                      </Link>
                    </td>
                    <td className="p-3">{c.client_phone || '—'}</td>
                    <td className="p-3">
                      {c.direction === 'incoming' ? (
                        <PhoneIncoming size={14} className="text-blue-600 inline" />
                      ) : (
                        <PhoneOutgoing size={14} className="text-purple-600 inline" />
                      )}
                    </td>
                    <td className="p-3 text-right">{formatDuration(c.billsec)}</td>
                    <td className="p-3">
                      {a ? (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded uppercase">
                          {a.call_type}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {a ? (
                        <Link href={`/call/${c.linkedid}`} className="inline-flex items-center gap-1">
                          <MessageSquare size={12} className="text-blue-600" />
                          <span className={`px-1.5 py-0.5 rounded text-xs ${scoreBg(a.score)}`}>
                            {a.score}/10
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
