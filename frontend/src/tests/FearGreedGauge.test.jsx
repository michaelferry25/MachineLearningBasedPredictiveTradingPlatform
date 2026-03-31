import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FearGreedGauge from '../components/FearGreedGauge';

// Mock the global fetch API
global.fetch = vi.fn();

describe('FearGreedGauge Component', () => {
  it('shows loading state initially', () => {
    // Prevent fetch from resolving immediately
    fetch.mockImplementationOnce(() => new Promise(() => {}));
    
    render(<FearGreedGauge />);
    expect(screen.getByText(/Market Fear & Greed/i)).toBeInTheDocument();
    expect(screen.getByText(/Loading\.\.\./i)).toBeInTheDocument();
  });

  it('renders gauge data after successful fetch', async () => {
    const mockData = {
      score: 75,
      label: 'Greed',
      components: {
        vix_level: 18.5,
        vix_score: 30,
        vix_momentum: -2.1,
        vix_momentum_score: 40,
        spy_trend: 1.5,
        spy_trend_score: 80,
        spy_momentum: 0.8,
        spy_momentum_score: 70
      }
    };

    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockData)
    });

    render(<FearGreedGauge />);

    // Wait for the loading state to disappear and data to render
    await waitFor(() => {
      expect(screen.queryByText(/Loading\.\.\./i)).not.toBeInTheDocument();
    });

    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getAllByText('Greed')).toHaveLength(2);
    expect(screen.getByText('What drives this?')).toBeInTheDocument();
  });

  it('handles fetch errors silently', async () => {
    fetch.mockRejectedValueOnce(new Error('API Down'));

    const { container } = render(<FearGreedGauge />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading\.\.\./i)).not.toBeInTheDocument();
    });

    // When the fetch fails, data is null, so it returns null and renders nothing
    expect(container).toBeEmptyDOMElement();
  });
});
