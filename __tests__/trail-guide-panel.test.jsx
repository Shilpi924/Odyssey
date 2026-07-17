import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrailGuidePanel from '@/components/search/TrailGuidePanel';

afterEach(() => vi.unstubAllGlobals());

describe('TrailGuidePanel', () => {
  it('submits only a canonical trail ID and renders returned source links', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      answer: 'A permit is required [source-1].',
      citations: [{
        id: 'source-1',
        title: 'Half Dome catalog record',
        url: 'https://www.nps.gov/example',
        provider: 'NPS',
        kind: 'catalog',
      }],
      alerts: [],
      grounding: 'supported',
      warnings: [],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<TrailGuidePanel trailId="half-dome-jmt" trailName="Half Dome" />);

    fireEvent.change(screen.getByLabelText('Question about Half Dome'), { target: { value: 'Do I need a permit?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));

    await waitFor(() => expect(screen.getByText('A permit is required [source-1].')).toBeVisible());
    expect(screen.getByRole('link', { name: '[source-1] Half Dome catalog record' })).toHaveAttribute('href', 'https://www.nps.gov/example');
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request).toEqual({ trailId: 'half-dome-jmt', question: 'Do I need a permit?' });
  });

  it('shows a safe error when the optional service is unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Trail Guide is not configured' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })));
    render(<TrailGuidePanel trailId="half-dome-jmt" trailName="Half Dome" />);
    fireEvent.change(screen.getByLabelText('Question about Half Dome'), { target: { value: 'Is it open?' } });
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Trail Guide is not configured');
  });
});
