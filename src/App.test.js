import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AppRoutes } from './App';
import defaultScenario from './data/bluecapDefaultScenario.json';

const createJsonResponse = (payload) =>
  Promise.resolve({
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });

test('renders the selection page and navigates to BlueCAP', async () => {
  global.fetch = jest.fn(() => createJsonResponse(defaultScenario));

  render(
    <MemoryRouter initialEntries={['/']}>
      <AppRoutes />
    </MemoryRouter>
  );

  expect(screen.getByText('CrazyFox Simulation')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('link', { name: /bluecap/i }));

  expect(await screen.findByRole('heading', { name: 'BlueCAP' })).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledWith('/api/getBlueCapData');
});
