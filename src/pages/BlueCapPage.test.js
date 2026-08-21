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
    expect(screen.queryByText('2025 Revenue Target')).not.toBeInTheDocument();
    expect(screen.queryByText('Profit Margin')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cumulative Net Profit').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2,375.00 Cr BDT').length).toBeGreaterThan(0);
    expect(screen.queryByText('Yearly Ecosystem Rollups')).not.toBeInTheDocument();
    expect(screen.queryByText('Yearly Entity Revenue and Profit')).not.toBeInTheDocument();
  });

  test('shows per-entity yearly breakdown from launch year onward', async () => {
    fetchMock.mockImplementation(() => createJsonResponse(defaultScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    const [blueBirdsButton] = await screen.findAllByRole('button', {
      name: /Toggle BlueBirds yearly breakdown/i,
    });
    expect(blueBirdsButton).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(blueBirdsButton);

    expect(blueBirdsButton).toHaveAttribute('aria-expanded', 'true');

    const entityPanel = document.getElementById('bluecap-entity-bluebirds');
    expect(entityPanel).not.toBeNull();

    const panelQueries = within(entityPanel);
    expect(panelQueries.getAllByText('2023').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2024').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2025').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2026').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2030').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('146.00 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('109.50 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('684.38 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('963.60 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('1,102.19 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('75%').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('78.12%').length).toBeGreaterThan(0);
    expect(panelQueries.queryByText('2022')).not.toBeInTheDocument();
  });

  test('extends standard entity projections to 2030 as well', async () => {
    fetchMock.mockImplementation(() => createJsonResponse(defaultScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    expect((await screen.findAllByText('2022-2030')).length).toBeGreaterThan(0);

    const [atechButton] = await screen.findAllByRole('button', {
      name: /Toggle Atech yearly breakdown/i,
    });
    await userEvent.click(atechButton);

    const entityPanel = document.getElementById('bluecap-entity-atech');
    expect(entityPanel).not.toBeNull();

    const panelQueries = within(entityPanel);
    expect(panelQueries.getAllByText('2026').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2030').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('241.58 Cr BDT').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('96.63 Cr BDT').length).toBeGreaterThan(0);
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

    const [atechButton] = await screen.findAllByRole('button', {
      name: /Toggle Atech yearly breakdown/i,
    });
    await userEvent.click(atechButton);

    const revenueInput = await screen.findByLabelText('2025 revenue target for Atech');
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
