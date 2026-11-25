'use client';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, Call, CallLog, SHORT_CALL_LABELS } from '@/lib/supabase';
import { DEMO_MODE, getDemoCall, getDemoLog } from '@/lib/demo-data';
import { formatDuration, formatDate, scoreBg } from '@/lib/utils';
import {
  ArrowLeft,
  PhoneIncoming,
  PhoneOutgoing,
  Star,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lightbulb,
  User,
} from 'lucide-react';

type Props = { params: Promise<{ linkedid: string }> };

export default function CallPage({ params }: Props) {
  const { linkedid } = use(params);
  const [call, setCall] = useState<Call | null>(null);
  const [shortCall, setShortCall] = useState<CallLog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [linkedid]);

  async function load() {
    setLoading(true);
    if (DEMO_MODE) {
      setCall(getDemoCall(linkedid) || null);
      setShortCall(getDemoLog(linkedid) || null);
      setLoading(false);
      return;
    }

    const { data } = await supabase.from('calls').select('*').eq('linkedid', linkedid).maybeSingle();
    if (data) {
      setCall(data as Call);
      setShortCall(null);
    } else {
      const { data: log } = await supabase.from('calls_log').select('*').eq('linkedid', linkedid).maybeSingle();
      setShortCall(log as CallLog | null);
      setCall(null);
    }
    setLoading(false);
  }

  if (loading) {
    return <div className="text-center text-gray-500 p-8">Загрузка...</div>;
  }

  if (!call && shortCall) {
    return <ShortCallView linkedid={linkedid} call={shortCall} />;
  }

  if (!call) {
    return (
      <div className="space-y-4">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-600">
          <ArrowLeft size={16} /> К дашборду
        </Link>
        <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-gray-500">
          Звонок {linkedid} не найден
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/manager/${call.manager_num}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} /> К менеджеру {call.manager_name}
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {call.direction === 'incoming' ? (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
                  <PhoneIncoming size={14} /> Входящий
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-sm font-medium">
                  <PhoneOutgoing size={14} /> Исходящий
                </span>
              )}
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-medium">
                {call.call_type.toUpperCase()}
              </span>
              {call.score != null && (
                <span className={`px-2 py-1 rounded text-sm font-bold ${scoreBg(call.score)}`}>
                  <Star size={12} className="inline mr-1" />
                  {call.score}/10
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold mb-2">{call.call_summary || 'Без резюме'}</h1>
            <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
              <Meta icon={User} label="Менеджер" value={`${call.manager_name} (#${call.manager_num})`} />
              <Meta icon={User} label="Клиент" value={call.client_phone || '—'} />
              <Meta icon={Clock} label="Дата" value={formatDate(call.call_date)} />
              <Meta icon={Clock} label="Длительность" value={formatDuration(call.duration_sec)} />
            </div>
          </div>
        </div>

        {call.audio_url && (
          <div className="mt-6">
            <audio
              controls
              src={call.audio_url.replace(/\/$/, '') + '/download'}
              className="w-full"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Сильные стороны" icon={CheckCircle} color="text-green-600">
          {call.strong_points && call.strong_points.length > 0 ? (
            <ul className="space-y-2">
              {call.strong_points.map((p, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-green-600 mt-1">•</span>
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </Section>

        <Section title="Ошибки" icon={XCircle} color="text-red-600">
          {call.mistakes && call.mistakes.length > 0 ? (
            <ul className="space-y-2">
              {call.mistakes.map((m, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-red-600 mt-1">•</span>
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </Section>

        <Section title="Упущенные возможности" icon={AlertCircle} color="text-yellow-600">
          {call.missed_opportunities && call.missed_opportunities.length > 0 ? (
            <ul className="space-y-2">
              {call.missed_opportunities.map((m, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-yellow-600 mt-1">•</span>
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </Section>

        <Section title="Рекомендация" icon={Lightbulb} color="text-blue-600">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">
            {call.recommendation || '—'}
          </p>
        </Section>
      </div>

      {call.transcript && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Транскрипция</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
            {call.transcript}
          </div>
          {call.transcript_url && (
            <a
              href={call.transcript_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-sm text-blue-600 hover:underline"
            >
              Скачать .txt
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="text-xs text-gray-500 uppercase mb-1 flex items-center gap-1">
        <Icon size={12} />
        {label}
      </div>
      <div className="text-gray-900">{value}</div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${color}`}>
        <Icon size={16} />
        {title}
      </h3>
      {children}
    </div>
  );
}

function ShortCallView({ linkedid, call }: { linkedid: string; call: CallLog }) {
  const typeInfo = call.short_call_type ? SHORT_CALL_LABELS[call.short_call_type] : null;
  return (
    <div className="space-y-6">
      <Link
        href={`/manager/${call.manager_num}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={16} /> К менеджеру {call.manager_name}
      </Link>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          {call.direction === 'incoming' ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium">
              <PhoneIncoming size={14} /> Входящий
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded text-sm font-medium">
              <PhoneOutgoing size={14} /> Исходящий
            </span>
          )}
          {typeInfo && (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded text-sm font-medium ${typeInfo.color}`}>
              {typeInfo.icon} {typeInfo.label}
            </span>
          )}
          <span className="text-xs text-gray-400">Короткий звонок — без полного AI-анализа</span>
        </div>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <Meta icon={User} label="Менеджер" value={`${call.manager_name} (#${call.manager_num})`} />
          <Meta icon={User} label="Клиент" value={call.client_phone || '—'} />
          <Meta icon={Clock} label="Дата" value={formatDate(call.call_date)} />
          <Meta icon={Clock} label="Длительность" value={formatDuration(call.billsec)} />
        </div>
      </div>

      {call.transcript ? (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Транскрипция</h3>
          <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-mono">
            {call.transcript}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-400 text-sm">
          Транскрипция недоступна
        </div>
      )}
    </div>
  );
}
