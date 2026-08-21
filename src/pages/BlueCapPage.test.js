import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BlueCapPage from './BlueCapPage';
import defaultScenario from '../data/bluecapDefaultScenario.json';

const createJsonResponse = (payload) =>
  Promise.resolve({
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  });

describe('BlueCapPage', () => {
  let fetchMock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('loads persisted scenario data on mount', async () => {
    fetchMock.mockImplementation(() => createJsonResponse(defaultScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'BlueCAP' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/getBlueCapData');
    expect(screen.getByLabelText('Initial Capital')).toHaveValue(500);
    expect(screen.getByText('2025 Total Revenue')).toBeInTheDocument();
    expect(screen.getAllByText('2,375.00 Cr BDT').length).toBeGreaterThan(0);
  });

  test('shows yearly entity activity in collapsible calendar-year panels with active entities only', async () => {
    fetchMock.mockImplementation(() => createJsonResponse(defaultScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    const activityButton = await screen.findByRole('button', { name: /2022 Activity/i });
    expect(activityButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(activityButton);

    expect(activityButton).toHaveAttribute('aria-expanded', 'true');

    const yearPanel = document.getElementById('bluecap-activity-1');
    expect(yearPanel).not.toBeNull();

    const panelQueries = within(yearPanel);
    expect(panelQueries.getAllByText('Atech').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('Hyundai Bangladesh').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('37.50 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('200.00 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.queryByText('BlueSky')).not.toBeInTheDocument();
    expect(panelQueries.queryByText('0.00 Cr BDT')).not.toBeInTheDocument();
  });

  test('recalculates immediately and persists edited entity targets', async () => {
    const updatedScenario = {
      ...defaultScenario,
      entities: defaultScenario.entities.map((entity) =>
        entity.id === 'atech'
          ? { ...entity, year4TargetRevenueCrore: 200 }
          : entity
      ),
    };

    fetchMock
      .mockImplementationOnce(() => createJsonResponse(defaultScenario))
      .mockImplementationOnce(() => createJsonResponse(updatedScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    const revenueInput = await screen.findByLabelText('Year 4 revenue target for Atech');
    await userEvent.clear(revenueInput);
    await userEvent.type(revenueInput, '200');

    expect(screen.getAllByText('2,425.00 Cr BDT').length).toBeGreaterThan(0);
    expect(screen.getAllByText('547.50 Cr BDT').length).toBeGreaterThan(0);

    await userEvent.click(screen.getByRole('button', { name: /save scenario/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [, requestConfig] = fetchMock.mock.calls[1];
    const savedPayload = JSON.parse(requestConfig.body);
    const savedAtech = savedPayload.entities.find((entity) => entity.id === 'atech');

    expect(fetchMock.mock.calls[1][0]).toBe('/api/updateBlueCapData');
    expect(requestConfig.method).toBe('POST');
    expect(savedAtech.year4TargetRevenueCrore).toBe(200);
    expect(await screen.findByText('BlueCAP scenario saved.')).toBeInTheDocument();
  });
});
