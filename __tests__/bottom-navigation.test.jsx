import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

const navigation = vi.hoisted(() => ({
  pathname: '/search',
  params: 'q=Mount+Diablo&difficulty=Moderate',
  push: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => navigation.pathname,
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => new URLSearchParams(navigation.params),
}));

import BottomNavigation from '@/components/layout/BottomNavigation';

afterEach(() => {
  cleanup();
  navigation.pathname = '/search';
  navigation.params = 'q=Mount+Diablo&difficulty=Moderate';
  navigation.push.mockReset();
});

describe('BottomNavigation', () => {
  it('shows five clear destinations and keeps tracking trail-specific', () => {
    render(<BottomNavigation />);

    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav.querySelectorAll('button')).toHaveLength(5);
    expect(screen.getByRole('button', { name: 'Activity' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Discover' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Map' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: 'Track' })).not.toBeInTheDocument();
  });

  it('preserves search context when opening the map', () => {
    render(<BottomNavigation />);

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(navigation.push).toHaveBeenCalledWith('/search?q=Mount+Diablo&difficulty=Moderate&view=map#trail-map');
  });

  it('marks Map active only for the explicit map view', () => {
    navigation.params = 'q=Mount+Diablo&view=map';
    render(<BottomNavigation />);

    expect(screen.getByRole('button', { name: 'Map' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Discover' })).not.toHaveAttribute('aria-current');
  });
});
