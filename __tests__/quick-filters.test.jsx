import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickFilters from '@/components/ui/QuickFilters';

function FilterHarness({ initial = [] }) {
  const [filters, setFilters] = useState(initial);
  return <QuickFilters activeFilters={filters} onFilter={setFilters} />;
}

describe('QuickFilters', () => {
  it('keeps filter choices hidden until requested', () => {
    render(<FilterHarness />);

    const trigger = screen.getByRole('button', { name: 'Filters' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('group', { name: 'Trail filters' })).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('group', { name: 'Trail filters' })).toBeVisible();
  });

  it('allows one difficulty plus independent feature filters', () => {
    render(<FilterHarness />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }));

    const easy = screen.getByRole('button', { name: 'Easy' });
    const moderate = screen.getByRole('button', { name: 'Moderate' });
    const scenic = screen.getByRole('button', { name: 'Scenic' });

    fireEvent.click(easy);
    expect(easy).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(moderate);
    expect(easy).toHaveAttribute('aria-pressed', 'false');
    expect(moderate).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(scenic);
    expect(moderate).toHaveAttribute('aria-pressed', 'true');
    expect(scenic).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Filters (2 active)' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(moderate).toHaveAttribute('aria-pressed', 'false');
    expect(scenic).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects parent-controlled resets', () => {
    const onFilter = vi.fn();
    const { rerender } = render(<QuickFilters activeFilters={['easy']} onFilter={onFilter} />);
    fireEvent.click(screen.getByRole('button', { name: 'Filters (1 active)' }));
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'true');

    rerender(<QuickFilters activeFilters={[]} onFilter={onFilter} />);
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'false');
  });
});
