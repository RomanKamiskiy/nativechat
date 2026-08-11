import { useState } from 'react';
import { MessageSquare, Settings, Users, Zap } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('inbox');

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
              <div className="w-1/3 border-r border-slate-200 p-4">
                <h2 className="font-semibold text-slate-700 mb-4">Активные диалоги</h2>
                <div className="p-3 bg-slate-50 rounded-lg cursor-pointer border border-slate-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-medium text-slate-800">Demo User</span>
                    <span className="text-xs text-slate-400">12:30</span>
                  </div>
                  <p className="text-sm text-slate-500 truncate">Нужна помощь с оплатой тарифа...</p>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50">
                Выберите диалог для ответа
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
