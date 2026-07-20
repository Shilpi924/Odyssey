'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession, signIn, signOut } from 'next-auth/react';
import { applyDisplayPreferences } from '@/components/ThemeProvider';
import LocalDataControls from '@/components/privacy/LocalDataControls';
import { DEFAULT_THEME, THEMES, resolveTheme } from '@/lib/theme';

function PillButton({ label, selected, onClick, color = 'indigo' }) {
  const colors = {
    indigo: selected ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    emerald: selected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    blue: selected ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/30 ring-2 ring-blue-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    purple: selected ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/30 ring-2 ring-purple-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    amber: selected ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-amber-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    teal: selected ? 'bg-teal-500 text-white shadow-lg shadow-teal-500/30 ring-2 ring-teal-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    rose: selected ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/30 ring-2 ring-rose-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    orange: selected ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    pink: selected ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30 ring-2 ring-pink-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
    cyan: selected ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400' : 'bg-slate-700 text-slate-300 hover:bg-slate-600',
  };
  return (
    <button type="button" aria-pressed={selected} onClick={onClick} className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${colors[color]}`}>
      {label}
    </button>
  );
}

function SubSection({ icon, title, color, children }) {
  const borderColor = {
    emerald: 'border-emerald-500/30 bg-emerald-950/30',
    orange: 'border-orange-500/30 bg-orange-950/30',
    rose: 'border-rose-500/30 bg-rose-950/30',
    purple: 'border-purple-500/30 bg-purple-950/30',
    teal: 'border-teal-500/30 bg-teal-950/30',
    pink: 'border-pink-500/30 bg-pink-950/30',
    blue: 'border-blue-500/30 bg-blue-950/30',
    cyan: 'border-cyan-500/30 bg-cyan-950/30',
  };
  const textColor = {
    emerald: 'text-emerald-300',
    orange: 'text-orange-300',
    rose: 'text-rose-300',
    purple: 'text-purple-300',
    teal: 'text-teal-300',
    pink: 'text-pink-300',
    blue: 'text-blue-300',
    cyan: 'text-cyan-300',
  };
  return (
    <section className={`rounded-2xl border ${borderColor[color]} p-6 space-y-7`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <h2 className={`text-xl font-semibold ${textColor[color]}`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

function SubGroup({ label, children }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">{label}</p>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

export default function Personalize() {
  const [prefs, setPrefs] = useState({
    interests: ['Hiking'], // Default to hiking
    hiking: { difficulty: [], features: [], length: '', elevation: '' },
    food: { cuisines: [], diningStyle: '', mealTime: [], atmosphere: [], diet: [] },
    places: { types: [], vibe: [] },
    family: { activities: [], ages: [] },
    wellness: { types: [], frequency: '', environment: '' },
    activityLevel: '',
    travelWith: '',
    groupDynamics: '',
    accessibility: [],
    theme: DEFAULT_THEME,
    themeMode: 'manual',
    highContrast: false,
    reducedMotion: false,
  });

  const { data: session, status } = useSession();
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const beginGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthMessage('Opening Google sign-in…');
    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: `${window.location.origin}/personalize`,
      });
      if (result?.error) throw new Error(result.error);
      if (!result?.url || result.url === window.location.href) throw new Error('No OAuth redirect was returned');
      window.location.assign(result.url);
    } catch (authError) {
      console.error('Google sign-in could not start:', authError);
      setAuthMessage('Google sign-in could not start. Confirm that the OAuth callback URL is configured, then try again.');
      setAuthBusy(false);
    }
  };

  useEffect(() => {
    const authError = new URLSearchParams(window.location.search).get('error');
    if (!authError) return;
    const messages = {
      OAuthSignin: 'Google sign-in could not be started.',
      OAuthCallback: 'Google returned an invalid sign-in response.',
      OAuthCreateAccount: 'Odyssey could not create the account.',
      AccessDenied: 'Google sign-in was cancelled or access was denied.',
      Configuration: 'Google sign-in is not configured correctly for this environment.',
    };
    setAuthMessage(`${messages[authError] || 'Google sign-in did not complete.'} Please try again.`); // eslint-disable-line react-hooks/set-state-in-effect
  }, []);

  useEffect(() => {
    const loadPrefs = async () => {
      let data = null;
      if (session?.user) {
        try {
          const res = await fetch('/api/user/preferences');
          if (res.ok) {
            const json = await res.json();
            if (json.preferences && Object.keys(json.preferences).length > 0) {
              data = json.preferences;
              // Sync to local storage for search/page.js to easily read
              localStorage.setItem('userPreferences', JSON.stringify(data));
            }
          }
        } catch (e) {
          console.error('Failed to load prefs from DB', e);
        }
      } 
      
      if (!data) {
        const saved = localStorage.getItem('userPreferences');
        if (saved) {
          try {
            data = JSON.parse(saved);
          } catch (e) {
            console.error('Failed to parse saved preferences', e);
          }
        }
      }

      if (data) {
        setPrefs(prev => ({ ...prev, ...data }));
        applyDisplayPreferences(data);
      }
    };

    loadPrefs();
  }, [session?.user]);

  const selectTheme = (theme) => {
    if (!session?.user) return;
    setPrefs(prev => {
      const next = { ...prev, theme };
      applyDisplayPreferences(next);
      return next;
    });
  };

  const setDisplayPreference = (field, value) => {
    if (!session?.user) return;
    setPrefs(prev => {
      const next = { ...prev, [field]: value };
      applyDisplayPreferences(next);
      return next;
    });
  };

  const toggleInterest = (interest) => {
    // Hiking is always selected, can't be deselected
    if (interest === 'Hiking') return;
    
    setPrefs(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const toggleMulti = (section, field, value) => {
    setPrefs(prev => {
      const cur = prev[section][field];
      return { ...prev, [section]: { ...prev[section], [field]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] } };
    });
  };

  const toggleAccessibility = (acc) => {
    setPrefs(prev => ({
      ...prev,
      accessibility: prev.accessibility.includes(acc)
        ? prev.accessibility.filter(a => a !== acc)
        : [...prev.accessibility, acc],
    }));
  };

  const setSingle = (section, field, value) => {
    setPrefs(prev => ({ ...prev, [section]: { ...prev[section], [field]: prev[section][field] === value ? '' : value } }));
  };

  const setTop = (field, value) => setPrefs(prev => ({ ...prev, [field]: prev[field] === value ? '' : value }));

  const selected = (interest) => prefs.interests.includes(interest);

  const handleSave = async () => {
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
    if (session?.user) {
      try {
        const resolvedTheme = resolveTheme(prefs, {
          hour: new Date().getHours(),
          systemDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
        });
        await fetch('/api/user/preferences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preferences: prefs, resolvedTheme })
        });
      } catch (e) {
        console.error('Failed to save to DB', e);
      }
    }
    window.location.assign('/');
  };

  return (
    <div data-ready="true" className="min-h-screen bg-slate-900 font-sans p-6 sm:p-8 flex flex-col items-center pb-24">
      <div className="w-full max-w-3xl bg-slate-800/50 backdrop-blur-md rounded-3xl border border-slate-700 p-8 sm:p-12 mt-12 shadow-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">Personalize Your Experience</h1>
          <p className="text-slate-400">Tell us what you love, and we&apos;ll curate the perfect recommendations.</p>
        </div>

        <div className="space-y-8">

          {/* ── APPEARANCE ── */}
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[.16em] text-[var(--app-primary)]">Appearance</p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--app-text)]">Choose your trail colors</h2>
                <p className="mt-1 text-sm text-[var(--app-muted)]">Your theme follows you across devices.</p>
              </div>
              {session?.user && <span className="rounded-full border border-[var(--app-border)] px-3 py-1 text-xs text-[var(--app-muted)]">Live preview</span>}
            </div>

            {session?.user ? (
              <div className="mt-6">
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-black/10 p-1.5" aria-label="Theme behavior">
                  {[
                    ['manual', 'Always'],
                    ['system', 'Match device'],
                    ['scheduled', 'Day & night'],
                  ].map(([mode, label]) => <button key={mode} type="button" onClick={() => setDisplayPreference('themeMode', mode)} className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${(prefs.themeMode || 'manual') === mode ? 'bg-[var(--app-surface-raised)] text-[var(--app-text)] shadow-sm' : 'text-[var(--app-muted)]'}`}>{label}</button>)}
                </div>
                <p className="mt-2 text-xs text-[var(--app-muted)]">{prefs.themeMode === 'scheduled' ? 'Uses your location for local sunrise and sunset; falls back to 7 AM–6 PM.' : prefs.themeMode === 'system' ? 'Follows your device light or dark appearance.' : 'Uses your selected palette at all times.'}</p>
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  {THEMES.map(theme => {
                  const active = (prefs.theme || DEFAULT_THEME) === theme.id;
                  return (
                    <button key={theme.id} type="button" onClick={() => selectTheme(theme.id)} aria-pressed={active} className={`rounded-xl border p-4 text-left transition-all ${active ? 'border-[var(--app-primary)] ring-2 ring-[var(--app-primary)]/20' : 'border-[var(--app-border)] hover:-translate-y-0.5'}`}>
                      <span className="flex gap-1.5">{theme.colors.map(color => <span key={color} className="h-7 w-7 rounded-full border border-black/10" style={{ backgroundColor: color }} />)}</span>
                      <span className="mt-3 flex items-center justify-between"><span><span className="block font-semibold text-[var(--app-text)]">{theme.name}</span><span className="mt-0.5 block text-xs text-[var(--app-muted)]">{theme.description}</span></span>{active && <span className="text-[var(--app-primary)]">✓</span>}</span>
                    </button>
                  );
                  })}
                </div>
                <div className="mt-5 grid sm:grid-cols-2 gap-3">
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] p-4"><span><span className="block text-sm font-semibold text-[var(--app-text)]">Higher contrast</span><span className="mt-1 block text-xs text-[var(--app-muted)]">Stronger borders and clearer muted text</span></span><input type="checkbox" checked={Boolean(prefs.highContrast)} onChange={(e) => setDisplayPreference('highContrast', e.target.checked)} className="h-5 w-5 accent-[var(--app-primary)]" /></label>
                  <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] p-4"><span><span className="block text-sm font-semibold text-[var(--app-text)]">Reduce motion</span><span className="mt-1 block text-xs text-[var(--app-muted)]">Minimize animation and map transitions</span></span><input type="checkbox" checked={Boolean(prefs.reducedMotion)} onChange={(e) => setDisplayPreference('reducedMotion', e.target.checked)} className="h-5 w-5 accent-[var(--app-primary)]" /></label>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-[var(--app-border)] bg-black/10 p-4">
                <div className="flex gap-1.5">{THEMES.map(theme => <span key={theme.id} className="h-8 w-8 rounded-full border border-white/10" style={{ background: `linear-gradient(135deg, ${theme.colors[0]} 50%, ${theme.colors[1]} 50%)` }} />)}</div>
                <div className="sm:text-right"><p className="text-sm font-medium text-[var(--app-text)]">Sign in to unlock themes</p><button type="button" disabled={authBusy} onClick={beginGoogleSignIn} className="mt-1 text-sm font-semibold text-[var(--app-primary)] disabled:opacity-50">{authBusy ? 'Opening Google…' : 'Continue with Google →'}</button></div>
              </div>
            )}
          </section>

          {/* ── HIKING (Primary) ── */}
          <SubSection icon="🥾" title="Your hiking preferences" color="emerald">
            <SubGroup label="Difficulty">
              {[['🌿 Easy','Easy'],['🥾 Moderate','Moderate'],['⛰️ Strenuous','Strenuous'],['🧗 Expert / Scramble','Expert'],['🚫 None / Any','None']].map(([label, value]) => (
                <PillButton key={value} label={label} selected={prefs.hiking.difficulty.includes(value)} onClick={() => toggleMulti('hiking','difficulty',value)} color="emerald" />
              ))}
            </SubGroup>
            <SubGroup label="Trail Features">
              {[['🌳 Shaded / Forest','Shaded'],['☀️ Open / Sunny','Sunny'],['💧 Near Water / Waterfall','Water'],['🏔️ Summit Views','Summit'],['🐾 Dog-Friendly','DogFriendly'],['🔄 Loop Trail','Loop'],['📸 Scenic / Photogenic','Scenic'],['🚗 Easy Parking','EasyParking'],['🌸 Wildflowers','Wildflowers'],['🧊 Snow / Alpine','Alpine'],['🚫 None / Any','None']].map(([label, value]) => (
                <PillButton key={value} label={label} selected={prefs.hiking.features.includes(value)} onClick={() => toggleMulti('hiking','features',value)} color="teal" />
              ))}
            </SubGroup>
            <SubGroup label="Preferred Trail Length">
              {[['< 2 miles','short'],['2–5 miles','medium'],['5–10 miles','long'],['10+ miles','verylong'],['🚫 None / Any','None']].map(([label, value]) => (
                <PillButton key={value} label={label} selected={prefs.hiking.length===value} onClick={() => setSingle('hiking','length',value)} color="blue" />
              ))}
            </SubGroup>
            <SubGroup label="Elevation Gain">
              {[['Flat (< 200 ft)','flat'],['Gentle (200–800 ft)','gentle'],['Moderate (800–2000 ft)','moderate'],['Steep (2000+ ft)','steep'],['🚫 None / Any','None']].map(([label, value]) => (
                <PillButton key={value} label={label} selected={prefs.hiking.elevation===value} onClick={() => setSingle('hiking','elevation',value)} color="amber" />
              ))}
            </SubGroup>
          </SubSection>

          {/* ── SUPPORTING FEATURES ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center"><span className="mr-2">✨</span> Supporting features (optional)</h2>
            <div className="flex flex-wrap gap-3">
              {['🍔 Eat nearby','🏛️ Places to visit after the hike','👨‍👩‍👧‍👦 Family-friendly activities','💆 Recovery and wellness'].map(interest => (
                <PillButton key={interest} label={interest} selected={selected(interest)} onClick={() => toggleInterest(interest)} color="indigo" />
              ))}
            </div>
          </section>

          {/* ── FOOD & DRINK ── */}
          {selected('🍔 Eat nearby') && (
            <SubSection icon="🍽️" title="Food preferences for after your hike" color="rose">
              <SubGroup label="Diet & Preferences">
                {[['🥕 Vegetarian','Vegetarian'],['🌿 Vegan','Vegan'],['🌾 Gluten-Free','GlutenFree'],['🌶️ Spicy','Spicy'],['🙂 Mild','Mild'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.food.diet.includes(value)} onClick={() => toggleMulti('food','diet',value)} color="emerald" />
                ))}
              </SubGroup>
              <SubGroup label="Dining Style">
                {[['🍽️ Sit-down Restaurant','Restaurant'],['🥡 Takeout / Quick','Takeout'],['🍺 Casual / Pub','Pub'],['🍷 Fine Dining','FineDining'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.food.diningStyle===value} onClick={() => setSingle('food','diningStyle',value)} color="amber" />
                ))}
              </SubGroup>
            </SubSection>
          )}

          {/* ── PLACES TO VISIT ── */}
          {selected('🏛️ Places to visit after the hike') && (
            <SubSection icon="🏛️" title="Places you'd like to visit" color="orange">
              <SubGroup label="Type of place">
                {[['🏛️ Museums','Museums'],['🌳 Parks & Gardens','Parks'],['🛍️ Shopping','Shopping'],['🎭 Entertainment','Entertainment'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.places.types.includes(value)} onClick={() => toggleMulti('places','types',value)} color="orange" />
                ))}
              </SubGroup>
              <SubGroup label="Vibe">
                {[['👶 Kid-Friendly','Kids'],['🤳 Instagrammable','Insta'],['📚 Educational','Educational'],['🌙 Evening / Nightlife','Night'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.places.vibe.includes(value)} onClick={() => toggleMulti('places','vibe',value)} color="amber" />
                ))}
              </SubGroup>
            </SubSection>
          )}

          {/* ── FAMILY ACTIVITIES ── */}
          {selected('👨‍👩‍👧‍👦 Family-friendly activities') && (
            <SubSection icon="👨‍👩‍👧‍👦" title="Family-friendly options" color="purple">
              <SubGroup label="Activities">
                {[['🎢 Theme Parks','ThemeParks'],['🦠 Zoos & Aquariums','Zoos'],['🎨 Arts & Crafts','Arts'],['🏃 Sports','Sports'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.family.activities.includes(value)} onClick={() => toggleMulti('family','activities',value)} color="purple" />
                ))}
              </SubGroup>
              <SubGroup label="Age groups">
                {[['👶 Toddlers (0-3)','Toddlers'],['👦 Kids (4-12)','Kids'],['🧑 Teens (13-17)','Teens'],['👴 Adults','Adults'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.family.ages.includes(value)} onClick={() => toggleMulti('family','ages',value)} color="teal" />
                ))}
              </SubGroup>
            </SubSection>
          )}

          {/* ── WELLNESS ── */}
          {selected('💆 Recovery and wellness') && (
            <SubSection icon="💆" title="Wellness & recovery options" color="teal">
              <SubGroup label="Wellness Type">
                {[['💆 Spas & Massage','Spa'],['🧘 Yoga & Meditation','Yoga'],['🏋️ Fitness Centers','Fitness'],['♨️ Hot Springs','HotSprings'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.wellness.types.includes(value)} onClick={() => toggleMulti('wellness','types',value)} color="teal" />
                ))}
              </SubGroup>
              <SubGroup label="Environment">
                {[['🌿 Nature / Outdoor','Outdoor'],['🏠 Indoor','Indoor'],['🌊 Waterfront','Waterfront'],['🚫 None / Any','None']].map(([label, value]) => (
                  <PillButton key={value} label={label} selected={prefs.wellness.environment===value} onClick={() => setSingle('wellness','environment',value)} color="amber" />
                ))}
              </SubGroup>
            </SubSection>
          )}

          {/* ── Group Dynamics (Free Text) ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center"><span className="mr-2">📝</span> Specific Group Dynamics</h2>
            <p className="text-slate-400 text-sm mb-3">Tell us exactly who&apos;s coming (e.g. &quot;My 80-year-old mom and my hyperactive dog&quot;)</p>
            <textarea
              className="w-full bg-slate-700/50 border border-slate-600 rounded-xl p-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Who are you traveling with?"
              value={prefs.groupDynamics}
              onChange={(e) => setPrefs(prev => ({ ...prev, groupDynamics: e.target.value }))}
            />
          </section>

          {/* ── Accessibility ── */}
          <section>
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center"><span className="mr-2">♿</span> Accessibility Needs</h2>
            <div className="flex flex-wrap gap-3">
              {['Maximum incline: gentle','Maximum distance: 3 miles','Frequent benches / rest stops','Accessible restroom required','Shade preferred','Avoid narrow paths','Avoid rocky surfaces','Mobility aid used','Child carrier / stroller','Hearing accessibility needs','Visual accessibility needs','None / Any'].map(acc => (
                <PillButton key={acc} label={acc} selected={prefs.accessibility?.includes(acc)} onClick={() => toggleAccessibility(acc)} color="cyan" />
              ))}
            </div>
          </section>
        </div>

        {/* Auth Section */}
        <div className="mt-12 bg-slate-800/80 rounded-2xl p-6 border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-white font-semibold">Account</h3>
            <p className="text-slate-400 text-sm">
              {session?.user ? `Signed in as ${session.user.name || session.user.email}` : 'Sign in to sync your profile across devices.'}
            </p>
            {authMessage && <p role="status" className="mt-2 max-w-xl text-xs leading-relaxed text-amber-200">{authMessage}</p>}
          </div>
          {session?.user ? (
            <button type="button" onClick={() => signOut()} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors whitespace-nowrap">
              Sign Out
            </button>
          ) : (
            <button type="button" disabled={authBusy} onClick={beginGoogleSignIn} className="px-4 py-2 bg-white hover:bg-gray-100 text-black font-medium rounded-lg text-sm transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50">
              <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {authBusy ? 'Opening Google…' : 'Sign in with Google'}
            </button>
          )}
        </div>

        <LocalDataControls signedIn={Boolean(session?.user)} />

        <div className="mt-8 flex justify-between items-center border-t border-slate-700 pt-8">
          <Link href="/">
            <button className="text-slate-400 hover:text-white font-medium transition-colors">Cancel</button>
          </Link>
          <button
            onClick={handleSave}
            className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 transform hover:-translate-y-1"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}
