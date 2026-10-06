import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  FiCopy,
  FiMaximize2,
  FiMessageCircle,
  FiMinimize2,
  FiMinusCircle,
  FiSend,
  FiX,
} from 'react-icons/fi';

const STARTER_MESSAGES = [
  'Year 20 ending equity',
  'BlueCAP top entity',
  'Rahman monthly income',
  'Dashboard summary',
];

const FOLLOW_UP_MESSAGES = {
  crazyfox: [
    'Show the Year 20 formula',
    'Compare start and ending AUM',
    'Explain the profit drivers',
    'What assumptions matter most?',
  ],
  bluecap: [
    'Break down BlueCAP revenue',
    'Compare entity margins',
    'Show inter-entity dependencies',
    'Which entity is strongest?',
  ],
  rahman: [
    'Review Rahman monthly income',
    'Show trust payout assumptions',
    'Compare custodian balances',
    'Explain beneficiary payouts',
  ],
  general: [
    'Summarize the current dashboard',
    'Show the key assumptions',
    'Find the biggest risk',
    'What should I inspect next?',
  ],
};

const INITIAL_MESSAGES = [
  {
    role: 'assistant',
    content: 'Hi, I can answer questions using this project data and run calculations from the current numbers.',
  },
];

function cleanPromptText(text) {
  return text
    .replace(/^[-*•\d.)\s]+/, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getAssistantFollowUpQuestion(content = '') {
  const lines = content
    .split('\n')
    .map((line) => cleanPromptText(line))
    .filter(Boolean);

  const questionLine = [...lines]
    .reverse()
    .find((line) => /[?？]$/.test(line) && line.length >= 12 && line.length <= 140);

  return questionLine || '';
}

function mergeSuggestedPrompts(primaryPrompt, fallbackPrompts) {
  const prompts = primaryPrompt ? [primaryPrompt, ...fallbackPrompts] : fallbackPrompts;
  const seenPrompts = new Set();

  return prompts.filter((prompt) => {
    const key = prompt.toLowerCase();
    if (seenPrompts.has(key)) return false;
    seenPrompts.add(key);
    return true;
  }).slice(0, 5);
}

function getSuggestedPrompts(messages, currentPath) {
  const hasUserMessage = messages.some((message) => message.role === 'user');
  if (!hasUserMessage) {
    return { label: 'Try asking', prompts: STARTER_MESSAGES };
  }

  const lastAssistantMessage = [...messages].reverse().find((message) => message.role === 'assistant');
  const assistantFollowUp = getAssistantFollowUpQuestion(lastAssistantMessage?.content);
  const context = `${currentPath} ${lastAssistantMessage?.content || ''}`.toLowerCase();
  const buildGroup = (prompts) => ({
    label: 'Suggested next',
    prompts: mergeSuggestedPrompts(assistantFollowUp, prompts),
  });

  if (context.includes('bluecap')) {
    return buildGroup(FOLLOW_UP_MESSAGES.bluecap);
  }

  if (context.includes('rahman') || context.includes('trust') || context.includes('beneficiary')) {
    return buildGroup(FOLLOW_UP_MESSAGES.rahman);
  }

  if (
    context.includes('crazyfox') ||
    context.includes('aum') ||
    context.includes('equity') ||
    context.includes('portfolio')
  ) {
    return buildGroup(FOLLOW_UP_MESSAGES.crazyfox);
  }

  return buildGroup(FOLLOW_UP_MESSAGES.general);
}

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function ChatMessageContent({ content }) {
  const lines = content.split('\n');
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    elements.push(
      <ul key={`list-${elements.length}`} className="my-2 list-disc space-y-1 pl-5">
        {listItems.map((item, index) => (
          <li key={index}>{renderInline(item)}</li>
        ))}
      </ul>
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    if (trimmed === '---') {
      flushList();
      elements.push(<hr key={`hr-${index}`} className="my-3 border-slate-700/70" />);
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h4 key={`h-${index}`} className="mb-2 mt-3 text-sm font-semibold text-cyan-100">
          {renderInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }

    flushList();
    elements.push(
      <p key={`p-${index}`} className="mb-2 last:mb-0">
        {renderInline(trimmed)}
      </p>
    );
  });

  flushList();
  return <div>{elements}</div>;
}

export default function ProjectChatbot() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorDetails, setErrorDetails] = useState(null);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);
  const suggestedPromptGroup = getSuggestedPrompts(messages, location.pathname);

  useEffect(() => {
    if (!isOpen || !scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [isOpen, messages, isSending, errorMessage]);

  const sendQuestion = async (questionText, source = 'custom') => {
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
          source,
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

  const copyLastAnswer = async () => {
    const lastAnswer = [...messages].reverse().find((message) => message.role === 'assistant');
    if (!lastAnswer || !navigator.clipboard) return;
    await navigator.clipboard.writeText(lastAnswer.content);
  };

  return (
    <div className="fixed bottom-4 right-4 z-[3000] font-sans">
      {isOpen ? (
        <div
          className={`flex w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-cyan-400/20 bg-slate-950/95 shadow-2xl shadow-black/60 ring-1 ring-white/5 backdrop-blur ${
            isExpanded ? 'h-[82vh] max-w-[720px]' : 'h-[70vh] max-h-[720px] max-w-[500px]'
          }`}
        >
          <div className="border-b border-slate-800 bg-slate-950/90 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300 shadow-lg shadow-cyan-950/40">
                  <FiMessageCircle size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white">CrazyFox AI</div>
                  <div className="truncate text-xs text-slate-400">Live project data + Gemini calculations</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={copyLastAnswer}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-200"
                  aria-label="Copy last answer"
                  title="Copy last answer"
                >
                  <FiCopy size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsExpanded((current) => !current)}
                  className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-900 hover:text-slate-200"
                  aria-label={isExpanded ? 'Compact chatbot' : 'Expand chatbot'}
                  title={isExpanded ? 'Compact' : 'Expand'}
                >
                  {isExpanded ? <FiMinimize2 size={16} /> : <FiMaximize2 size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMessages(INITIAL_MESSAGES);
                    setErrorMessage('');
                    setErrorDetails(null);
                  }}
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
            <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />
              Connected to CrazyFox data
            </div>
          </div>

          <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' ? (
                  <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                    <FiMessageCircle size={14} />
                  </div>
                ) : null}
                <div
                  className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-cyan-400 text-slate-950 shadow-cyan-950/20'
                      : 'rounded-bl-md border border-slate-800 bg-slate-900/90 text-slate-100 shadow-black/20'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ChatMessageContent content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-300">
                  <FiMessageCircle size={14} />
                </div>
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-xs text-slate-400">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-300" />
                  Reading project data...
                </div>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-900 bg-slate-950/90 px-4 py-3">
            <div className="mb-3">
              <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {suggestedPromptGroup.label}
              </div>
              <div className="flex flex-wrap justify-center gap-2 px-2">
                {suggestedPromptGroup.prompts.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => void sendQuestion(starter, 'suggestion')}
                    className="max-w-full rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3.5 py-1.5 text-xs font-semibold text-cyan-50 transition-colors hover:border-cyan-300/70 hover:bg-cyan-400/20 hover:text-white"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage ? (
              <div className="mb-3 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
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

            <form onSubmit={handleSubmit} className="flex items-end gap-2">
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
                className="max-h-28 min-h-[44px] flex-1 resize-none rounded-xl border border-cyan-500/40 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20"
              />
              <button
                type="submit"
                disabled={isSending || !inputValue.trim()}
                className="flex h-[44px] w-[44px] shrink-0 items-center justify-center rounded-xl bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-950/40 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
                title="Send"
              >
                <FiSend size={17} />
              </button>
            </form>
          </div>
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
