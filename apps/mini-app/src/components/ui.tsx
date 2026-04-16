import type { FC, ReactNode, ButtonHTMLAttributes } from 'react';

// ===== Card =====
export const Card: FC<{ children: ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`bg-bg-card rounded-card p-4 ${className}`}>{children}</div>
);

// ===== Logo Header =====
export const LogoHeader: FC = () => (
  <Card className="flex items-center gap-3 mb-3">
    <div className="w-10 h-10 rounded-xl bg-accent-blue flex items-center justify-center flex-shrink-0">
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
        <path
          d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9zm0 2c3.86 0 7 3.14 7 7a6.96 6.96 0 01-1.24 3.99L8.01 6.24A6.96 6.96 0 0112 5zm0 14c-3.86 0-7-3.14-7-7a6.96 6.96 0 011.24-3.99l9.75 9.75A6.96 6.96 0 0112 19z"
          fill="white"
        />
      </svg>
    </div>
    <span className="text-text-primary font-bold text-xl tracking-tight">yumoff.</span>
  </Card>
);

// ===== StatusBadge =====
type BadgeVariant = 'active' | 'inactive' | 'warning' | 'pending';

const badgeStyles: Record<BadgeVariant, string> = {
  active: 'bg-status-active-bg text-status-active',
  inactive: 'bg-status-inactive-bg text-status-inactive',
  warning: 'bg-status-warning-bg text-status-warning',
  pending: 'bg-bg-elevated text-text-secondary',
};

export const StatusBadge: FC<{ variant: BadgeVariant; label: string }> = ({ variant, label }) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-badge text-xs font-semibold uppercase tracking-wide ${badgeStyles[variant]}`}
  >
    {label}
  </span>
);

// ===== Button =====
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: ReactNode;
}

const btnVariants = {
  primary: 'bg-accent-blue hover:bg-accent-blue-light text-white',
  secondary: 'bg-bg-elevated border border-bg-border text-text-primary hover:bg-bg-elevated/80',
  danger: 'bg-status-inactive-bg text-status-inactive border border-status-inactive/20',
  ghost: 'text-text-secondary hover:text-text-primary',
};

const btnSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-5 py-3 text-base font-semibold w-full',
};

export const Button: FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  className = '',
  disabled,
  ...rest
}) => (
  <button
    className={`rounded-btn font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed
      ${btnVariants[variant]} ${btnSizes[size]} ${className}`}
    disabled={disabled || loading}
    {...rest}
  >
    {loading ? (
      <span className="flex items-center justify-center gap-2">
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        {children}
      </span>
    ) : (
      children
    )}
  </button>
);

// ===== Field =====
export const Field: FC<{ label: string; value: ReactNode; className?: string }> = ({
  label,
  value,
  className = '',
}) => (
  <div className={className}>
    <p className="text-text-secondary text-xs mb-1">{label}</p>
    <div className="bg-bg-elevated rounded-btn px-3 py-2.5 text-text-primary text-sm font-mono">
      {value}
    </div>
  </div>
);

// ===== Divider =====
export const Divider: FC = () => (
  <div className="h-px bg-bg-border my-3" />
);

// ===== Spinner =====
export const Spinner: FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`flex items-center justify-center ${className}`}>
    <svg className="animate-spin w-6 h-6 text-accent-blue" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  </div>
);

// ===== ProgressBar =====
export const ProgressBar: FC<{ percent: number; className?: string }> = ({
  percent,
  className = '',
}) => {
  const clamped = Math.min(100, Math.max(0, percent));
  const color =
    clamped > 85 ? 'bg-status-inactive' : clamped > 60 ? 'bg-status-warning' : 'bg-accent-blue';

  return (
    <div className={`h-1.5 bg-bg-elevated rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full rounded-full transition-all ${color}`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
};

// ===== SectionTitle =====
export const SectionTitle: FC<{ children: ReactNode; badge?: string }> = ({
  children,
  badge,
}) => (
  <div className="flex items-center justify-between mb-3">
    <h2 className="text-text-primary font-bold text-base">{children}</h2>
    {badge && (
      <span className="text-xs bg-bg-elevated text-text-secondary px-2 py-0.5 rounded-full">
        {badge}
      </span>
    )}
  </div>
);
