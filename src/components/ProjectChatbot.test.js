import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ProjectChatbot from './ProjectChatbot';

const savedSessions = [
  {
    id: 'chat-recent',
    title: 'Year 20 ending equity',
    createdAt: 2000,
    updatedAt: 2000,
    messages: [
      {
        role: 'assistant',
        content: 'Hi, I can answer questions using this project data and run calculations from the current numbers.',
      },
      { role: 'user', content: 'Year 20 ending equity' },
      { role: 'assistant', content: 'The year 20 ending equity is available in the CrazyFox data.' },
    ],
  },
  {
    id: 'chat-older',
    title: 'Dashboard summary',
    createdAt: 1000,
    updatedAt: 1000,
    messages: [
      {
        role: 'assistant',
        content: 'Hi, I can answer questions using this project data and run calculations from the current numbers.',
      },
      { role: 'user', content: 'Dashboard summary' },
      { role: 'assistant', content: 'Here is the dashboard summary.' },
    ],
  },
];

function renderChatbot() {
  return render(
    <MemoryRouter>
      <button type="button">Outside dashboard control</button>
      <ProjectChatbot />
    </MemoryRouter>
  );
}

describe('ProjectChatbot', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('shows recent saved chats from local storage', async () => {
    window.localStorage.setItem('crazyfox-ai-chat-sessions', JSON.stringify(savedSessions));
    renderChatbot();

    await userEvent.click(screen.getByRole('button', { name: /open crazyfox ai chatbot/i }));
    await userEvent.click(screen.getByRole('button', { name: /show recent chats/i }));

    expect(screen.getByText('Recent chats')).toBeInTheDocument();
    expect(screen.getAllByText('Year 20 ending equity').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Dashboard summary').length).toBeGreaterThan(0);
  });

  test('minimizes from the header control', async () => {
    renderChatbot();

    await userEvent.click(screen.getByRole('button', { name: /open crazyfox ai chatbot/i }));
    expect(screen.getByText('CrazyFox AI')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /minimize chatbot/i }));

    expect(screen.queryByText('CrazyFox AI')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open crazyfox ai chatbot/i })).toBeInTheDocument();
  });

  test('closes when clicking outside the chat panel', async () => {
    renderChatbot();

    await userEvent.click(screen.getByRole('button', { name: /open crazyfox ai chatbot/i }));
    expect(screen.getByText('CrazyFox AI')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /outside dashboard control/i }));

    expect(screen.queryByText('CrazyFox AI')).not.toBeInTheDocument();
  });
});
