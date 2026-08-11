import { useEffect, useState } from 'react';
import { MessageSquare, Settings, Users, Zap } from 'lucide-react';
import { useDashboardStore } from './store';

function App() {
  const [activeTab, setActiveTab] = useState('inbox');
  const {
    conversations,
    activeConversationId,
    messages,
    setConversations,
    setActiveConversation,
    setMessages,
  } = useDashboardStore();

  useEffect(() => {
    if (activeTab === 'inbox') {
      fetch('http://localhost:3001/api/conversations')
        .then((res) => res.json())
        .then((data) => setConversations(data.conversations || []))
        .catch(console.error);
    }
  }, [activeTab, setConversations]);

  const handleSelectConversation = (id: string) => {
    setActiveConversation(id);
    fetch(`http://localhost:3001/api/conversations/${id}/messages`)
      .then((res) => res.json())
      .then((data) => setMessages(data.messages || []))
      .catch(console.error);
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Sidebar */}
      <div className="w-20 bg-slate-900 flex flex-col items-center py-6 text-slate-400">
        <div className="w-10 h-10 bg-blue-600 rounded-xl mb-10 flex items-center justify-center text-white font-bold text-xl">
          N
        </div>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`p-3 mb-4 rounded-xl ${activeTab === 'inbox' ? 'bg-slate-800 text-white' : 'hover:text-white transition'}`}
        >
          <MessageSquare size={24} />
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`p-3 mb-4 rounded-xl ${activeTab === 'users' ? 'bg-slate-800 text-white' : 'hover:text-white transition'}`}
        >
          <Users size={24} />
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`p-3 mb-4 rounded-xl ${activeTab === 'ai' ? 'bg-slate-800 text-white' : 'hover:text-white transition'}`}
        >
          <Zap size={24} />
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`p-3 mt-auto rounded-xl ${activeTab === 'settings' ? 'bg-slate-800 text-white' : 'hover:text-white transition'}`}
        >
          <Settings size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shadow-sm">
          <h1 className="text-xl font-semibold text-slate-800 capitalize">
            {activeTab === 'ai' ? 'AI & Integrations' : activeTab}
          </h1>
        </header>

        <main className="flex-1 p-8 overflow-auto">
          {activeTab === 'inbox' && (
            <div className="flex h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="w-1/3 border-r border-slate-200 p-4 overflow-y-auto">
                <h2 className="font-semibold text-slate-700 mb-4">Активные диалоги</h2>
                {conversations.length === 0 && (
                  <p className="text-sm text-slate-400">Пока нет диалогов</p>
                )}
                {conversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv.id)}
                    className={`p-3 mb-2 rounded-lg cursor-pointer border ${
                      activeConversationId === conv.id
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-slate-800 text-sm">
                        Room: {conv.id.substring(0, 8)}...
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">
                      {conv.messages?.[0]?.content || 'Нет сообщений'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex-1 flex flex-col bg-slate-50">
                {activeConversationId ? (
                  <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-4">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl max-w-[80%] text-sm ${
                          msg.sender?.name === 'AI Agent'
                            ? 'bg-white border border-slate-200 self-start'
                            : 'bg-blue-600 text-white self-end'
                        }`}
                      >
                        {msg.sender?.name && (
                          <div className="text-[10px] opacity-70 mb-1">{msg.sender.name}</div>
                        )}
                        {msg.content}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-slate-400">
                    Выберите диалог для ответа
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="max-w-2xl">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                <h2 className="text-lg font-semibold text-slate-800 mb-2">Настройка базы знаний (RAG)</h2>
                <p className="text-slate-500 mb-4 text-sm">
                  Загрузите инструкции, чтобы ИИ автоматически отвечал на частые вопросы.
                </p>
                <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                  + Добавить документ
                </button>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-slate-500">
              Список пользователей появится после привязки к API.
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-slate-500">
              Настройки проекта, setup-токены и MCP — следующим шагом к бэкенду.
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
