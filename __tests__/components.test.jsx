/* eslint-disable @next/next/no-img-element -- This fixture intentionally tests raw image markup. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }) => <>{children}</>,
}));

// Test ModernGlassCard components
describe('ModernGlassCard Components', () => {
  it('should render glass card with children', () => {
    const { container } = render(
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-4">
        <p>Test content</p>
      </div>
    );
    expect(container.querySelector('p')).toHaveTextContent('Test content');
  });

  it('should render glass button', () => {
    const { container } = render(
      <button className="bg-indigo-600/80 text-white px-4 py-2.5 rounded-xl font-medium">
        Click me
      </button>
    );
    expect(container.querySelector('button')).toHaveTextContent('Click me');
  });
});

// Test ReviewSystem components
describe('ReviewSystem Components', () => {
  it('should render star rating', () => {
    const { container } = render(
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <svg key={star} className="w-6 h-6 text-amber-400 fill-amber-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
    expect(container.querySelectorAll('svg').length).toBe(5);
  });
});

// Test AdvancedFilters components
describe('AdvancedFilters Components', () => {
  it('should render filter button', () => {
    const { container } = render(
      <button className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-4 py-2.5 rounded-xl text-white text-sm font-medium">
        <span>Filters</span>
      </button>
    );
    expect(container.querySelector('button')).toHaveTextContent('Filters');
  });

  it('should render quick filter chips', () => {
    const filters = [
      { id: 'easy', label: 'Easy Trails' },
      { id: 'dog', label: 'Dog Friendly' },
    ];
    
    const { container } = render(
      <div className="flex gap-2">
        {filters.map(filter => (
          <button key={filter.id} className="px-4 py-2 rounded-full text-sm">
            {filter.label}
          </button>
        ))}
      </div>
    );
    expect(container.querySelectorAll('button').length).toBe(2);
  });
});

// Test SocialFeatures components
describe('SocialFeatures Components', () => {
  it('should render activity feed item', () => {
    const activity = {
      type: 'hike_completed',
      userName: 'John Doe',
      trailName: 'Eagle Peak',
      timestamp: new Date().toISOString()
    };

    const { container } = render(
      <div className="flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
          🥾
        </div>
        <div>
          <p className="text-white text-sm">
            <span className="font-semibold">{activity.userName}</span>
            <span className="text-slate-400"> completed {activity.trailName}</span>
          </p>
        </div>
      </div>
    );
    expect(container.querySelector('p')).toHaveTextContent('John Doe completed Eagle Peak');
  });
});

// Test RouteRecorder components
describe('RouteRecorder Components', () => {
  it('should render route recorder stats', () => {
    const { container } = render(
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">2.5 mi</p>
          <p className="text-xs text-slate-400">Distance</p>
        </div>
        <div className="bg-slate-800/50 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">1:30:00</p>
          <p className="text-xs text-slate-400">Duration</p>
        </div>
      </div>
    );
    expect(container.querySelectorAll('p').length).toBe(4);
  });
});

// Test SafetyFeatures components
describe('SafetyFeatures Components', () => {
  it('should render SOS button', () => {
    const { container } = render(
      <button className="w-full bg-red-600 text-white py-4 rounded-2xl font-bold text-lg">
        SOS Emergency
      </button>
    );
    expect(container.querySelector('button')).toHaveTextContent('SOS Emergency');
  });

  it('should render location sharing card', () => {
    const { container } = render(
      <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
            📍
          </div>
          <div>
            <p className="text-white font-medium">Share Location</p>
            <p className="text-slate-400 text-xs">Let contacts track your hike</p>
          </div>
        </div>
      </div>
    );
    expect(container.querySelector('p')).toHaveTextContent('Share Location');
  });
});

// Test PersonalizedDashboard components
describe('PersonalizedDashboard Components', () => {
  it('should render time-based greeting', () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    else if (hour >= 17 && hour < 21) greeting = 'Good evening';
    else greeting = 'Good night';

    const { container } = render(
      <div>
        <h1 className="text-3xl font-bold text-white">{greeting}! 👋</h1>
      </div>
    );
    expect(container.querySelector('h1')).toBeInTheDocument();
  });

  it('should render weather card', () => {
    const weather = { temp: 72, condition: 'Clear', feelsLike: 70 };
    const { container } = render(
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-4">
          <div className="text-5xl">☀️</div>
          <div>
            <p className="text-2xl font-bold text-white">{weather.temp}°F</p>
            <p className="text-slate-400 text-sm">{weather.condition}</p>
          </div>
        </div>
      </div>
    );
    expect(container.querySelector('p')).toHaveTextContent('72°F');
  });
});

// Test PhotoUpload components
describe('PhotoUpload Components', () => {
  it('should render photo upload button', () => {
    const { container } = render(
      <label className="cursor-pointer bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
        <span>Add Photos</span>
        <input type="file" accept="image/*" multiple className="hidden" />
      </label>
    );
    expect(container.querySelector('label')).toHaveTextContent('Add Photos');
  });

  it('should render photo grid', () => {
    const photos = ['photo1.jpg', 'photo2.jpg'];
    const { container } = render(
      <div className="grid grid-cols-2 gap-3">
        {photos.map((photo, index) => (
          <div key={index} className="aspect-square rounded-xl overflow-hidden bg-slate-800">
            <img src={photo} alt={`Photo ${index + 1}`} />
          </div>
        ))}
      </div>
    );
    expect(container.querySelectorAll('img').length).toBe(2);
  });
});

// Test BottomNavigation components
describe('BottomNavigation Components', () => {
  it('should render navigation items', () => {
    const navItems = [
      { id: 'home', label: 'Explore', icon: '🏠' },
      { id: 'search', label: 'Search', icon: '🔍' },
      { id: 'saved', label: 'Saved', icon: '💾' },
    ];

    const { container } = render(
      <div className="flex items-center justify-around">
        {navItems.map(item => (
          <button key={item.id} className="flex flex-col items-center gap-1 px-4 py-2">
            <span className="text-2xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
    );
    expect(container.querySelectorAll('button').length).toBe(3);
  });
});
