import React, { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMessageCircle, FiSend, FiX, FiMinusCircle } from 'react-icons/fi';

const STARTER_MESSAGES = [
  'CrazyFox year 20 ending equity কত?',
  'BlueCAP-এর most profitable entity কোনটা?',
  'Rahman Trust monthly income calculate করো',
];

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: 'Hi, I can answer questions using this project data and run calculations from the current numbers.',
  },
];

export default function ProjectChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const inputRef = useRef(null);

  const sendQuestion = async (questionText) => {
    const question = questionText.trim();
    if (!question || isSending) return;

    const nextMessages = [...messages, { role: 'user', content: question }];
    setMessages(nextMessages);
    setInputValue('');
    setErrorMessage('');
    setErrorDetails(null);
    setIsSending(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          currentPage: location.pathname,
          history: nextMessages.slice(-8),
        }),
      });

      const responseText = await response.text();
      let payload = {};
      try {
        payload = responseText ? JSON.parse(responseText) : {};
      } catch (error) {
        payload = { raw: responseText };
      }

      if (!response.ok) {
        const requestError = new Error(payload.error || `Chatbot request failed with status ${response.status}`);
        requestError.details = {
          status: response.status,
          statusText: response.statusText,
          response: payload,
        };
        throw requestError;
      }

      setMessages((current) => [
        ...current,
        { role: 'assistant', content: payload.answer || 'I did not receive a usable answer.' },
      ]);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to reach the chatbot.');
      setErrorDetails(error.details || {
        stage: 'browser_fetch',
        name: error.name,
        message: error.message,
      });
      setMessages((current) => current.slice(0, -1));
      setInputValue(question);
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendQuestion(inputValue);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[3000] font-sans">
      {isOpen ? (
        <div className="w-[calc(100vw-2rem)] max-w-[420px] overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                <FiMessageCircle size={18} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white">CrazyFox AI</div>
                <div className="truncate text-xs text-slate-400">Project data + Gemini calculations</div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setMessages(INITIAL_MESSAGES)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-200"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <FiMinusCircle size={17} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-200"
                aria-label="Close chatbot"
                title="Close"
              >
                <FiX size={18} />
              </button>
            </div>
          </div>

          <div className="max-h-[56vh] min-h-[300px] space-y-3 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[86%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'bg-cyan-500 text-slate-950'
                      : 'border border-slate-800 bg-slate-900 text-slate-100'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-400">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                Thinking with project data...
              </div>
            ) : null}
          </div>

          {messages.length === 1 ? (
            <div className="flex gap-2 overflow-x-auto border-t border-slate-900 px-4 py-3">
              {STARTER_MESSAGES.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => void sendQuestion(starter)}
                  className="shrink-0 rounded-full border border-slate-800 px-3 py-1.5 text-xs text-slate-300 transition-colors hover:border-cyan-500/60 hover:text-white"
                >
                  {starter}
                </button>
              ))}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="border-t border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-200">
              <div className="font-medium">{errorMessage}</div>
              {errorDetails ? (
                <details className="mt-2">
                  <summary className="cursor-pointer text-rose-100/90">Show details</summary>
                  <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap rounded-lg border border-rose-500/20 bg-slate-950/70 p-2 text-[11px] leading-5 text-rose-100">
                    {JSON.stringify(errorDetails, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-800 p-3">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void sendQuestion(inputValue);
                }
              }}
              rows={1}
              placeholder="Ask about project data..."
              className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={isSending || !inputValue.trim()}
              className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Send message"
              title="Send"
            >
              <FiSend size={17} />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-500 text-slate-950 shadow-xl shadow-cyan-950/40 transition-transform hover:scale-105 hover:bg-cyan-300"
          aria-label="Open CrazyFox AI chatbot"
          title="Open CrazyFox AI"
        >
          <FiMessageCircle size={24} />
        </button>
      )}
    </div>
  );
}
