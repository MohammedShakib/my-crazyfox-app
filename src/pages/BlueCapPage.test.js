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
    expect(screen.getByText('2030 Total Revenue')).toBeInTheDocument();
    expect(screen.getByText('Funding and Allocation Plan')).toBeInTheDocument();
    expect(screen.queryByText('2025 Revenue Target')).not.toBeInTheDocument();
    expect(screen.queryByText('Yearly Ecosystem Rollups')).not.toBeInTheDocument();
    expect(screen.getAllByText('Cumulative Net Profit').length).toBeGreaterThan(0);
  });

  test('shows BlueBird yearly breakdown with business-line expansion through 2030', async () => {
    fetchMock.mockImplementation(() => createJsonResponse(defaultScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    const [blueBirdsButton] = await screen.findAllByRole('button', {
      name: /Toggle BlueBirds yearly breakdown/i,
    });
    await userEvent.click(blueBirdsButton);

    const entityPanel = document.getElementById('bluecap-entity-bluebirds');
    expect(entityPanel).not.toBeNull();

    const panelQueries = within(entityPanel);
    expect(panelQueries.getAllByText('2023').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2026').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('2030').length).toBeGreaterThan(0);
    expect(panelQueries.getByText('BlueBird business mix from eggs, milk, meat, and raw chicken lines.')).toBeInTheDocument();
    expect(panelQueries.getAllByText('Milk Production').length).toBeGreaterThan(0);
    expect(panelQueries.getAllByText('Raw Chicken & Cuttings').length).toBeGreaterThan(0);
  });

  test('extends standard entity projections to 2030 and exposes base controls inside the dropdown', async () => {
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
    expect(panelQueries.getAllByText('2030').length).toBeGreaterThan(0);
    expect(await screen.findByLabelText('2025 base revenue for Atech')).toHaveValue(150);
    expect(await screen.findByLabelText('Base margin for Atech')).toHaveValue(40);
  });

  test('persists edited yearly injection and base revenue values', async () => {
    fetchMock
      .mockImplementationOnce(() => createJsonResponse(defaultScenario))
      .mockImplementationOnce(() => createJsonResponse(defaultScenario));

    render(
      <MemoryRouter>
        <BlueCapPage />
      </MemoryRouter>
    );

    const [atechButton] = await screen.findAllByRole('button', {
      name: /Toggle Atech yearly breakdown/i,
    });
    await userEvent.click(atechButton);

    const revenueInput = await screen.findByLabelText('2025 base revenue for Atech');
    await userEvent.clear(revenueInput);
    await userEvent.type(revenueInput, '200');

    const [injectionInput] = await screen.findAllByLabelText('Capital injection for 2026');
    await userEvent.clear(injectionInput);
    await userEvent.type(injectionInput, '650');

    await userEvent.click(screen.getByRole('button', { name: /save scenario/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const [, requestConfig] = fetchMock.mock.calls[1];
    const savedPayload = JSON.parse(requestConfig.body);
    const savedAtech = savedPayload.entities.find((entity) => entity.id === 'atech');

    expect(fetchMock.mock.calls[1][0]).toBe('/api/updateBlueCapData');
    expect(requestConfig.method).toBe('POST');
    expect(savedAtech.year4TargetRevenueCrore).toBe(200);
    expect(savedPayload.config.yearlyCapitalInjectionsCrore['2026']).toBe(650);
    expect(await screen.findByText('BlueCAP scenario saved.')).toBeInTheDocument();
  });
});
