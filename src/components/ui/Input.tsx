'use client';

import type { InputHTMLAttributes } from 'react';

/** Props for the Input component. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Error message to display below the input. */
  error?: string;
}

/**
 * Styled form input matching the sign-up mock:
 * dark surface background, subtle border, gold focus ring.
 */
export function Input({ error, className = '', ...props }: InputProps) {
  return (
    <div>
      <input
        className={`w-full bg-bg-surface border border-border-default rounded-xl py-4 px-5 text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-gold/40 transition-colors ${className}`}
        {...props}
      />
      {error && (
        <span className="text-battery-low text-xs mt-1 block">{error}</span>
      )}
    </div>
  );
}
