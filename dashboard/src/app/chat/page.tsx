'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Plus, Trash2, Pencil, MessageSquare, Check, X } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  text: string;
};

type Chat = {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
};

const WEBHOOK_URL = process.env.NEXT_PUBLIC_CHAT_WEBHOOK_URL || '';
const STORAGE_KEY = 'chats_v2';

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  text: 'Привет! Спрашивай о работе менеджеров: статистика, оценки, конкретные звонки.\n\nПримеры:\n• «Сколько звонков у Красновой за последнюю неделю?»\n• «Топ-3 ошибок у Козыревой за месяц»\n• «Как менеджеры отрабатывают возражение по цене?»',
};

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function createNewChat(): Chat {
  return {
    id: generateId(),
    title: 'Новый чат',
    messages: [INITIAL_MESSAGE],
    updatedAt: Date.now(),
  };
}

function loadChats(): Chat[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    return JSON.parse(saved);
  } catch {
    return [];
  }
}

function saveChats(chats: Chat[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
}

export default function ChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loaded = loadChats();
    if (loaded.length === 0) {
      const fresh = createNewChat();
      setChats([fresh]);
      setActiveId(fresh.id);
      saveChats([fresh]);
    } else {
      setChats(loaded);
      setActiveId(loaded[0].id);
    }
  }, []);

  const active = chats.find((c) => c.id === activeId);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [active?.messages, loading]);

  function updateActive(updater: (c: Chat) => Chat) {
    setChats((prev) => {
      const next = prev.map((c) => (c.id === activeId ? updater(c) : c));
      saveChats(next);
      return next;
    });
  }

  function newChat() {
    const fresh = createNewChat();
    const next = [fresh, ...chats];
    setChats(next);
    setActiveId(fresh.id);
    saveChats(next);
  }

  function deleteChat(id: string) {
    const next = chats.filter((c) => c.id !== id);
    if (next.length === 0) {
      const fresh = createNewChat();
      setChats([fresh]);
      setActiveId(fresh.id);
      saveChats([fresh]);
    } else {
      setChats(next);
      if (activeId === id) setActiveId(next[0].id);
      saveChats(next);
    }
  }

  function startRename(c: Chat) {
    setEditingId(c.id);
    setEditingTitle(c.title);
  }

  function saveRename() {
    if (!editingId) return;
    setChats((prev) => {
      const next = prev.map((c) =>
        c.id === editingId ? { ...c, title: editingTitle.trim() || c.title } : c
      );
      saveChats(next);
      return next;
    });
    setEditingId(null);
    setEditingTitle('');
  }

  async function send() {
    const text = input.trim();
    if (!text || loading || !active) return;

    const userMsg: Message = { role: 'user', text };
    const isFirstUserMsg = active.messages.filter((m) => m.role === 'user').length === 0;

    updateActive((c) => ({
      ...c,
      messages: [...c.messages, userMsg],
      title: isFirstUserMsg ? text.slice(0, 50) : c.title,
      updatedAt: Date.now(),
    }));

    setInput('');
    setLoading(true);

    if (!WEBHOOK_URL) {
      setTimeout(() => {
        updateActive((c) => ({
          ...c,
          messages: [
            ...c.messages,
            {
              role: 'assistant',
              text: 'Webhook для чата ещё не подключён.',
            },
          ],
        }));
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId: activeId }),
      });
      const data = await res.json();
      const reply = data.output || data.answer || data.response || JSON.stringify(data);
      updateActive((c) => ({
        ...c,
        messages: [...c.messages, { role: 'assistant', text: reply }],
        updatedAt: Date.now(),
      }));
    } catch (e) {
      updateActive((c) => ({
        ...c,
        messages: [
          ...c.messages,
          { role: 'assistant', text: 'Ошибка соединения: ' + (e as Error).message },
        ],
      }));
    } finally {
      setLoading(false);
    }
  }

  if (!active) {
    return <div className="p-8 text-gray-500">Загрузка...</div>;
  }

  const sortedChats = [...chats].sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      <aside className="w-64 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-3 border-b border-gray-200">
          <button
            onClick={newChat}
            className="w-full bg-blue-600 text-white rounded-md px-3 py-2 text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2"
          >
            <Plus size={14} />
            Новый чат
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sortedChats.map((c) => (
            <div
              key={c.id}
              className={`group rounded-md transition ${
                c.id === activeId ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              {editingId === c.id ? (
                <div className="flex items-center gap-1 p-2">
                  <input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename();
                      if (e.key === 'Escape') {
                        setEditingId(null);
                        setEditingTitle('');
                      }
                    }}
                    autoFocus
                    className="flex-1 text-sm border border-blue-300 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button onClick={saveRename} className="text-green-600 hover:bg-green-50 rounded p-1">
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditingTitle('');
                    }}
                    className="text-gray-400 hover:bg-gray-100 rounded p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => setActiveId(c.id)}
                  className="flex items-center gap-2 p-2 cursor-pointer"
                >
                  <MessageSquare
                    size={14}
                    className={c.id === activeId ? 'text-blue-600' : 'text-gray-400'}
                  />
                  <div
                    className={`flex-1 text-sm truncate ${
                      c.id === activeId ? 'text-blue-900 font-medium' : 'text-gray-700'
                    }`}
                    title={c.title}
                  >
                    {c.title}
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-0.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startRename(c);
                      }}
                      className="text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded p-1"
                      title="Переименовать"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Удалить чат «${c.title}»?`)) deleteChat(c.id);
                      }}
                      className="text-gray-400 hover:text-red-600 hover:bg-red-50 rounded p-1"
                      title="Удалить"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200 px-6 py-3">
          <h1 className="text-lg font-semibold text-gray-900 truncate">{active.title}</h1>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {active.messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  m.role === 'user' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {m.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div
                className={`max-w-[70%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-gray-100 rounded-lg px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                <span className="animate-pulse">●</span>
                <span className="animate-pulse delay-75">●</span>
                <span className="animate-pulse delay-150">●</span>
              </div>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Спроси о менеджере или звонке..."
              disabled={loading}
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-blue-600 text-white rounded-lg px-4 py-2 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium"
            >
              <Send size={16} />
              Отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
