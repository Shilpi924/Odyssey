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

function CardHarness({ onSave, onStartHike, onViewMap }) {
  const [selected, setSelected] = useState(false);
  return (
    <TrailResultCard
      trail={trail}
      index={0}
      isSelected={selected}
      onSelect={() => setSelected(value => !value)}
      onSave={onSave}
      onStartHike={onStartHike}
      onViewMap={onViewMap}
      isSaved={false}
      routeStatus="loaded"
    />
  );
}

describe('TrailResultCard', () => {
  it('shows a simple summary before progressively revealing actions and source data', () => {
    const onSave = vi.fn();
    const onStartHike = vi.fn();
    const onViewMap = vi.fn();
    render(<CardHarness onSave={onSave} onStartHike={onStartHike} onViewMap={onViewMap} />);

    const article = screen.getByRole('article', { name: 'Mary Bowerman Trail' });
    const trigger = screen.getByRole('button', { name: 'View details' });
    expect(article).toBeVisible();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Source: California State Parks')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Start hike' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(screen.getByRole('button', { name: 'Hide details' })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Accessible first 0.2 mi')).toBeVisible();
    expect(screen.getByRole('button', { name: 'View map' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Start hike' })).toBeVisible();

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
    expect(onViewMap).toHaveBeenCalledOnce();
    expect(onStartHike).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledOnce();
  });
});
