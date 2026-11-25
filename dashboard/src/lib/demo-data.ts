import type { Call, CallLog, ShortCallType } from '@/lib/supabase';

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const managers = [
  { num: '101', name: 'Иван Иванов', target: 13 },
  { num: '102', name: 'Анна Петрова', target: 8 },
  { num: '103', name: 'Сергей Смирнов', target: 6 },
  { num: '104', name: 'Ольга Кузнецова', target: 3 },
];

const topics = [
  { type: 'корп' as const, short: 'consultation' as ShortCallType, subject: 'обновление инфраструктуры', summary: 'Обсудили обновление инфраструктуры и перенос рабочих мест. Клиент запросил план этапов и оценку сроков.', next: 'Подготовить план миграции и смету до пятницы.', score: 9 },
  { type: '1с' as const, short: 'callback_request' as ShortCallType, subject: 'обмен данными между базами 1С', summary: 'Клиент описал сбой обмена между базами. Согласовали диагностику и повторный звонок после проверки журнала.', next: 'Проверить журнал обмена и связаться с клиентом завтра.', score: 7 },
  { type: 'корп' as const, short: 'appointment_set' as ShortCallType, subject: 'подключение новых сотрудников', summary: 'Уточнили число новых сотрудников и необходимое оборудование. Назначили встречу для согласования комплектации.', next: 'Отправить приглашение на встречу и список оборудования.', score: 8 },
  { type: 'другой' as const, short: 'info_request' as ShortCallType, subject: 'условия технической поддержки', summary: 'Клиент запросил условия поддержки и время реакции. Менеджер объяснил варианты обслуживания.', next: 'Выслать сравнение тарифов поддержки.', score: 8 },
  { type: '1с' as const, short: 'consultation' as ShortCallType, subject: 'обновление конфигурации 1С', summary: 'Обсудили обновление конфигурации и проверку совместимости расширений. Договорились провести предварительный аудит.', next: 'Согласовать время аудита и запросить резервную копию.', score: 6 },
  { type: 'корп' as const, short: 'callback_request' as ShortCallType, subject: 'защита корпоративной сети', summary: 'Клиент рассказал о расширении офиса. Обсудили сегментацию сети и резервное копирование.', next: 'Подготовить схему сети для нового офиса.', score: 9 },
  { type: 'другой' as const, short: 'wrong_number' as ShortCallType, subject: 'уточнение контакта', summary: 'Звонок перенаправлен ответственному специалисту; предметный разговор не состоялся.', next: 'Уточнить контакт ответственного сотрудника.', score: 5 },
  { type: '1с' as const, short: 'consultation' as ShortCallType, subject: 'автоматизация отчётности', summary: 'Выявили ручные операции при подготовке отчётности. Менеджер уточнил требования и предложил короткую демонстрацию.', next: 'Подготовить демонстрационный сценарий по отчётам.', score: 8 },
];

const assignment: number[] = [];
const assigned = managers.map(() => 0);
for (let i = 0; i < 30; i++) {
  let chosen = 0;
  let best = -Infinity;
  managers.forEach((manager, index) => {
    const priority = ((i + 1) * manager.target) / 30 - assigned[index];
    if (priority > best) { best = priority; chosen = index; }
  });
  assignment.push(chosen);
  assigned[chosen]++;
}

// Bursty activity makes the daily chart look like a realistic reporting period.
const dayOffsets = [
  0, 0, 0, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 4, 5,
  6, 6, 6, 6, 7, 7, 8, 8, 8, 9, 10, 10, 11, 12, 13,
];

const baseCalls: CallLog[] = Array.from({ length: 30 }, (_, index) => {
  const manager = managers[assignment[index]];
  const topic = topics[index % topics.length];
  const date = new Date();
  date.setDate(date.getDate() - dayOffsets[index]);
  date.setHours(9 + (index % 8), (index * 11) % 60, 0, 0);
  const answered = index % 7 !== 5;
  const analyzed = answered && index % 5 !== 3;
  return {
    linkedid: `demo-call-${String(index + 1).padStart(3, '0')}`,
    call_date: date.toISOString(),
    manager_num: manager.num,
    manager_name: manager.name,
    client_phone: `+7 (900) ***-**-${String(index + 1).padStart(2, '0')}`,
    direction: index % 3 === 0 ? 'incoming' : 'outgoing',
    duration_sec: answered ? 95 + ((index * 137) % 710) : 0,
    billsec: answered ? 78 + ((index * 113) % 590) : 0,
    disposition: answered ? 'ANSWERED' : 'NO ANSWER',
    has_analysis: analyzed,
    short_call_type: analyzed ? topic.short : null,
    transcript: analyzed ? 'Синтетическая запись разговора для демонстрации интерфейса.' : null,
  };
});

const demoCalls: Call[] = baseCalls.filter((c) => c.has_analysis).map((log, index) => {
  const topic = topics[(Number(log.linkedid.slice(-3)) - 1) % topics.length];
  return {
    linkedid: log.linkedid,
    call_date: log.call_date,
    manager_num: log.manager_num,
    manager_name: log.manager_name,
    client_phone: log.client_phone,
    direction: log.direction,
    duration_sec: log.duration_sec,
    disposition: log.disposition,
    transcript: `Менеджер: Добрый день, ${log.manager_name}. Чем могу помочь?\nКлиент: Хотим обсудить ${topic.subject}.\nМенеджер: Понял. Уточню несколько деталей, чтобы предложить подходящий вариант.\nКлиент: Да, расскажу текущую ситуацию.\nМенеджер: Спасибо. ${topic.next}`,
    audio_url: '',
    transcript_url: '',
    call_type: topic.type,
    call_summary: topic.summary,
    score: Math.min(10, Math.max(4, topic.score + (index % 3) - 1)),
    strong_points: index % 2 ? ['Задал уточняющие вопросы', 'Подтвердил договорённость о следующем шаге'] : ['Спокойно объяснил варианты', 'Зафиксировал запрос клиента'],
    mistakes: index % 3 === 0 ? ['Не уточнил бюджет на старте разговора'] : index % 3 === 1 ? ['Не проверил удобное время для обратной связи'] : [],
    missed_opportunities: index % 2 ? ['Можно было выяснить срок принятия решения'] : [],
    recommendation: topic.next,
    fields: { client_name: `Компания ${['Север', 'Вектор', 'Маяк', 'Горизонт'][index % 4]}`, products: topic.subject, next_step: topic.next },
  };
});

export function getDemoLogs(days = 30, managerNum?: string): CallLog[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return baseCalls.filter((call) => new Date(call.call_date).getTime() >= cutoff && (!managerNum || call.manager_num === managerNum));
}

export function getDemoCalls(days = 30, managerNum?: string): Call[] {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return demoCalls.filter((call) => new Date(call.call_date).getTime() >= cutoff && (!managerNum || call.manager_num === managerNum));
}

export function getDemoCall(linkedid: string): Call | undefined {
  return demoCalls.find((call) => call.linkedid === linkedid);
}

export function getDemoLog(linkedid: string): CallLog | undefined {
  return baseCalls.find((call) => call.linkedid === linkedid);
}
