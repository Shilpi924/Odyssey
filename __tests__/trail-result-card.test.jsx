import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrailResultCard from '@/components/search/TrailResultCard';

const trail = {
  placeId: 'mount-diablo-mary-bowerman-trail',
  name: 'Mary Bowerman Trail',
  vicinity: 'Summit Area, CA',
  sourceKind: 'official',
  sourceAttribution: 'Source: California State Parks',
  sourceUrl: 'https://www.parks.ca.gov/',
  geometrySource: { provider: 'ca-state-parks-arcgis' },
  access: { status: 'Unknown' },
  difficulty: 'Easy',
  difficultyMethod: 'odyssey-official-description-v1',
  length: '0.7 miles',
  routeType: 'Loop',
  features: ['Accessible first 0.2 mi', 'Scenic'],
};

function CardHarness({ onSave, onStartHike, onViewMap, onDownloadOffline, trailData = trail, distanceFromUser }) {
  const [selected, setSelected] = useState(false);
  return (
    <TrailResultCard
      trail={trailData}
      index={0}
      isSelected={selected}
      onSelect={() => setSelected(value => !value)}
      onSave={onSave}
      onDownloadOffline={onDownloadOffline}
      onStartHike={onStartHike}
      onViewMap={onViewMap}
      isSaved={false}
      routeStatus="loaded"
      distanceFromUser={distanceFromUser}
    />
  );
}

describe('TrailResultCard', () => {
  it('shows a simple summary before progressively revealing actions and source data', () => {
    const onSave = vi.fn();
    const onStartHike = vi.fn();
    const onViewMap = vi.fn();
    const onDownloadOffline = vi.fn();
    render(<CardHarness onSave={onSave} onStartHike={onStartHike} onViewMap={onViewMap} onDownloadOffline={onDownloadOffline} />);

    const article = screen.getByRole('article', { name: 'Mary Bowerman Trail' });
    const trigger = screen.getByRole('button', { name: 'View details' });
    expect(article).toBeVisible();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'California State Parks' })).toBeVisible();
    expect(screen.getByText('No verified reviews available')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Start hike' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Accessible first 0.2 mi')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View map' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start hike' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download offline' })).toBeVisible();

    const sourceSummary = screen.getByText('Source & access', { exact: true });
    const sourceDetails = sourceSummary.closest('details');
    expect(sourceDetails).not.toHaveAttribute('open');
    fireEvent.click(sourceSummary);
    expect(sourceDetails).toHaveAttribute('open');
    expect(screen.getByText('Source: California State Parks')).toBeVisible();
    expect(screen.getByText('Route geometry: California State Parks')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'View map' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start hike' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save trail' }));
    fireEvent.click(screen.getByRole('button', { name: 'Download offline' }));
    expect(onViewMap).toHaveBeenCalledOnce();
    expect(onStartHike).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
    expect(onDownloadOffline).toHaveBeenCalledOnce();
  });

  it('separates trail length, distance from the user, and verified reviews', () => {
    render(<CardHarness
      distanceFromUser="12.4"
      trailData={{ ...trail, rating: 4.8, userRatingsTotal: 27 }}
    />);

    expect(screen.getByText('Trail 0.7 miles')).toBeVisible();
    expect(screen.getByText('12.4 mi from you · straight-line')).toBeVisible();
    expect(screen.getByText('★ 4.8 · 27 verified reviews')).toBeVisible();
  });

  it('shows the exact OpenStreetMap source before details are expanded', () => {
    const communityTrail = {
      ...trail,
      placeId: 'osm-way-123',
      name: 'Old Moraga Ranch Trail',
      sourceKind: 'community',
      sourceAttribution: '© OpenStreetMap contributors',
      sourceUrl: 'https://www.openstreetmap.org/way/123',
    };
    render(<CardHarness trailData={communityTrail} />);

    expect(screen.getByText('OpenStreetMap', { exact: true })).toBeVisible();
    const sourceLink = screen.getByRole('link', { name: 'OpenStreetMap contributors' });
    expect(sourceLink).toBeVisible();
    expect(sourceLink).toHaveAttribute('href', communityTrail.sourceUrl);
    expect(screen.getByText(/Community mapped/)).toBeVisible();
  });
});
