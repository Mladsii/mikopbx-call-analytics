import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type ShortCallType =
  | 'voicemail'
  | 'callback_request'
  | 'appointment_set'
  | 'spam'
  | 'wrong_number'
  | 'info_request'
  | 'internal'
  | 'consultation'
  | 'other';

export type CallLog = {
  linkedid: string;
  call_date: string;
  manager_num: string;
  manager_name: string;
  client_phone: string;
  direction: 'incoming' | 'outgoing';
  duration_sec: number;
  billsec: number;
  disposition: string;
  has_analysis: boolean;
  short_call_type?: ShortCallType | null;
  transcript?: string | null;
};

export const SHORT_CALL_LABELS: Record<ShortCallType, { label: string; icon: string; color: string }> = {
  voicemail: { label: 'Автоответчик', icon: '📞', color: 'bg-gray-100 text-gray-700' },
  callback_request: { label: 'Перезвонить', icon: '🔁', color: 'bg-yellow-100 text-yellow-800' },
  appointment_set: { label: 'Назначено', icon: '⏰', color: 'bg-green-100 text-green-800' },
  spam: { label: 'Спам', icon: '🚫', color: 'bg-red-100 text-red-700' },
  wrong_number: { label: 'Не туда', icon: '❌', color: 'bg-gray-100 text-gray-600' },
  info_request: { label: 'Инфо-запрос', icon: 'ℹ️', color: 'bg-blue-100 text-blue-700' },
  internal: { label: 'Внутренний', icon: '🏢', color: 'bg-slate-100 text-slate-600' },
  consultation: { label: 'Консультация', icon: '💬', color: 'bg-indigo-100 text-indigo-700' },
  other: { label: 'Другое', icon: '•', color: 'bg-gray-100 text-gray-600' },
};

export type Call = {
  linkedid: string;
  call_date: string;
  manager_num: string;
  manager_name: string;
  client_phone: string;
  direction: 'incoming' | 'outgoing';
  duration_sec: number;
  disposition: string;
  transcript: string;
  audio_url: string;
  transcript_url: string;
  call_type: 'корп' | '1с' | 'другой';
  call_summary: string;
  score: number;
  strong_points: string[];
  mistakes: string[];
  missed_opportunities: string[];
  recommendation: string;
  fields: Record<string, string>;
};
