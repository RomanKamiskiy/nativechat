import { useEffect, useState } from 'react';
import {
  ChatWidget,
  type AgentConfigPublic,
  type SetupBudgetPublic,
} from '@nativechat/react-sdk';
import { MessageCircle, X } from 'lucide-react';
import { getDemoApiUrl, getDemoWsUrl } from './demoApi';

type Session = {
  token: string;
  conversationId: string;
  projectId: string;
  agent: AgentConfigPublic;
  setup: SetupBudgetPublic;
};

function App() {
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const apiUrl = getDemoApiUrl();
  const wsUrl = getDemoWsUrl();

  useEffect(() => {
    fetch(`${apiUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Same project as RAG knowledge so “тариф Pro” answers from the KB
        projectId: 'operator-relay-test',
        userId: 'acme-visitor-' + Math.floor(Math.random() * 10000),
        name: 'Acme Visitor',
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.token && data.conversationId && data.projectId) {
          setSession({
            token: data.token,
            conversationId: data.conversationId,
            projectId: data.projectId,
            agent: data.agent,
            setup: data.setup,
          });
        }
      })
      .catch(console.error);
  }, [apiUrl]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Навигация */}
      <nav className="bg-white border-b border-slate-200 px-6 md:px-8 py-4 flex justify-between items-center gap-4">
        <div className="text-2xl font-display font-bold text-indigo-600 tracking-tight">
          AcmeCorp
        </div>
        <div className="hidden sm:flex gap-6 text-sm font-medium text-slate-600">
          <a href="#products" className="hover:text-indigo-600 transition-colors">
            Продукты
          </a>
          <a href="#pricing" className="hover:text-indigo-600 transition-colors">
            Цены
          </a>
          <a href="#about" className="hover:text-indigo-600 transition-colors">
            О нас
          </a>
        </div>
        <button
          type="button"
          className="bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          Войти
        </button>
      </nav>

      {/* Главный экран */}
      <main className="max-w-5xl mx-auto px-6 md:px-8 py-16 md:py-24 text-center">
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight mb-6 text-slate-900">
          Будущее аналитики <span className="text-indigo-600">уже здесь</span>
        </h1>
        <p className="text-lg md:text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
          Автоматизируйте рутину, увеличивайте продажи и общайтесь с клиентами на
          совершенно новом уровне с помощью нашей платформы.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            type="button"
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
          >
            Начать бесплатно
          </button>
          <button
            type="button"
            className="bg-white text-slate-700 border border-slate-200 px-8 py-3 rounded-xl font-semibold text-lg hover:bg-slate-50 transition"
          >
            Смотреть демо
          </button>
        </div>

        {/* Фейковый интерфейс продукта */}
        <div
          id="products"
          className="mt-16 bg-white p-2 rounded-2xl shadow-2xl border border-slate-100 max-w-4xl mx-auto"
        >
          <div className="bg-slate-50 rounded-xl h-72 md:h-96 flex flex-col items-center justify-center border border-slate-100 gap-3 px-6">
            <span className="text-slate-400 font-medium">Интерфейс вашего продукта</span>
            <span className="text-slate-300 text-sm">
              Нажмите синюю кнопку справа внизу — откроется чат Nativiq
            </span>
          </div>
        </div>

        <section id="pricing" className="mt-24 text-left max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-3">Цены</h2>
          <p className="text-slate-600">
            Тариф Pro — 99$ в месяц с безлимитными чатами. Спросите об этом в виджете
            поддержки — RAG ответит из базы знаний.
          </p>
        </section>

        <section id="about" className="mt-16 text-left max-w-3xl mx-auto pb-24">
          <h2 className="font-display text-2xl font-bold text-slate-900 mb-3">О нас</h2>
          <p className="text-slate-600">
            AcmeCorp — демо-сайт клиента. Виджет в углу показывает, как Nativiq
            встраивается в чужой дизайн без перестройки всей страницы.
          </p>
        </section>
      </main>

      {/* Nativiq Widget Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isWidgetOpen && (
          <div className="mb-4 shadow-2xl rounded-2xl overflow-hidden border border-slate-200 bg-white origin-bottom-right">
            {session ? (
              <ChatWidget
                conversationId={session.conversationId}
                projectId={session.projectId}
                agent={session.agent}
                setup={session.setup}
                apiUrl={apiUrl}
                wsUrl={wsUrl}
                width="380px"
                height="600px"
                token={session.token}
                onAction={(action) => {
                  console.log('Widget Action Triggered:', action);
                  alert(
                    `Экшен из чата!\nТип: ${action.actionId}\nДанные: ${JSON.stringify(action.payload)}`
                  );
                }}
                onAgentChange={(agent) =>
                  setSession((s) => (s ? { ...s, agent } : s))
                }
                onSetupComplete={(setup) =>
                  setSession((s) => (s ? { ...s, setup } : s))
                }
              />
            ) : (
              <div className="w-[380px] h-[200px] flex items-center justify-center text-slate-500 text-sm">
                Подключение к серверу…
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          aria-label={isWidgetOpen ? 'Закрыть чат' : 'Открыть чат'}
          onClick={() => setIsWidgetOpen((open) => !open)}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-transform hover:scale-105 flex items-center justify-center"
        >
          {isWidgetOpen ? <X size={28} /> : <MessageCircle size={28} />}
        </button>
      </div>
    </div>
  );
}

export default App;
