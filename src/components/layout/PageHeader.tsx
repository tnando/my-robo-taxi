'use client';

import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

/** Props for the PageHeader component. */
export interface PageHeaderProps {
  /** Page title text. */
  title: string;
  /** Optional subtitle displayed below the title. */
  subtitle?: string;
  /** Show a back navigation arrow. Defaults to false. */
  showBack?: boolean;
  /** Optional right-side action element. */
  action?: ReactNode;
}

/**
 * Page heading with optional back button and subtitle.
 * Used at the top of DriveHistory, DriveSummary, Invites, Settings pages.
 */
export function PageHeader({ title, subtitle, showBack = false, action }: PageHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex items-start gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="mt-1 text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Go back"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-2xl font-semibold text-text-primary tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-text-secondary text-sm font-light mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
