import type { FC } from 'react';

type Tab = 'profile' | 'referral' | 'devices' | 'traffic';

interface Props {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: FC<{ active: boolean }> }[] = [
  {
    id: 'profile',
    label: 'Профиль',
    icon: ({ active }) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="8" r="3.5" stroke={active ? '#3b82f6' : '#8b9aaa'} strokeWidth="1.8" />
        <path
          d="M5 19c0-3.314 3.134-6 7-6s7 2.686 7 6"
          stroke={active ? '#3b82f6' : '#8b9aaa'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'referral',
    label: 'Рефералка',
    icon: ({ active }) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="9" cy="8" r="3" stroke={active ? '#3b82f6' : '#8b9aaa'} strokeWidth="1.8" />
        <circle cx="17" cy="8" r="2.5" stroke={active ? '#3b82f6' : '#8b9aaa'} strokeWidth="1.6" />
        <path
          d="M3 18c0-2.761 2.686-5 6-5s6 2.239 6 5"
          stroke={active ? '#3b82f6' : '#8b9aaa'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M19 18c0-1.657-1.343-3-3-3"
          stroke={active ? '#3b82f6' : '#8b9aaa'}
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'devices',
    label: 'Устройства',
    icon: ({ active }) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <rect x="3" y="6" width="12" height="9" rx="2" stroke={active ? '#3b82f6' : '#8b9aaa'} strokeWidth="1.8" />
        <path d="M7 18h4M9 15v3" stroke={active ? '#3b82f6' : '#8b9aaa'} strokeWidth="1.8" strokeLinecap="round" />
        <rect x="16" y="10" width="5" height="7" rx="1.5" stroke={active ? '#3b82f6' : '#8b9aaa'} strokeWidth="1.6" />
        <circle cx="18.5" cy="15.5" r="0.5" fill={active ? '#3b82f6' : '#8b9aaa'} />
      </svg>
    ),
  },
  {
    id: 'traffic',
    label: 'Трафик',
    icon: ({ active }) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path
          d="M5 12.5c0-3.866 3.134-7 7-7s7 3.134 7 7"
          stroke={active ? '#3b82f6' : '#8b9aaa'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M3 16.5c0-5.247 4.029-9.5 9-9.5s9 4.253 9 9.5"
          stroke={active ? '#3b82f6' : '#8b9aaa'}
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.5" fill={active ? '#3b82f6' : '#8b9aaa'} />
      </svg>
    ),
  },
];

export const BottomNav: FC<Props> = ({ active, onChange }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-bg-card border-t border-bg-border z-50 pb-safe">
    <div className="flex">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-2.5 transition-colors ${
              isActive ? 'text-accent-blue-light' : 'text-text-secondary'
            }`}
          >
            <div
              className={`rounded-xl p-1.5 transition-colors ${
                isActive ? 'bg-accent-blue-dim' : ''
              }`}
            >
              <Icon active={isActive} />
            </div>
            <span className="text-[10px] font-medium leading-none">{tab.label}</span>
          </button>
        );
      })}
    </div>
  </nav>
);
