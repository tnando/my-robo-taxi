'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

/** Visual variants for the Button component. */
export type ButtonVariant = 'primary' | 'secondary' | 'social';

/** Props for the Button component. */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant. */
  variant?: ButtonVariant;
  /** Optional icon to render before the label. */
  icon?: ReactNode;
  /** Button content. */
  children: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-gold text-bg-primary font-semibold hover:bg-gold-light',
  secondary:
    'border border-border-default text-text-primary font-medium hover:bg-bg-surface',
  social:
    'border border-border-default text-text-primary font-medium hover:bg-bg-surface',
};

/**
 * Shared button primitive with three variants:
 * - `primary`: Gold filled CTA (Create Account, Add Your Tesla)
 * - `secondary`: Outline on dark bg (Enter Invite Code)
 * - `social`: Outline with icon (Google, Apple, Email auth buttons)
 */
export function Button({
  variant = 'primary',
  icon,
  children,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl transition-colors text-base ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
