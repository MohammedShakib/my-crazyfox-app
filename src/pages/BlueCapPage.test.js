import { render, screen, waitFor } from '@testing-library/react';
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
    expect(screen.getAllByText('2,375.00 Cr BDT').length).toBeGreaterThan(0);
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
