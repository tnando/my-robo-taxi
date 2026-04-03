import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

import { Skeleton } from '@/components/ui/Skeleton';

describe('Skeleton', () => {
  it('renders with role="status" and aria-label', () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector('[role="status"]');
    expect(el).toBeTruthy();
    expect(el?.getAttribute('aria-label')).toBe('Loading');
  });

  it('applies custom className', () => {
    const { container } = render(<Skeleton className="h-4 w-24" />);
    const el = container.firstChild as HTMLElement;
    expect(el.className).toContain('h-4');
    expect(el.className).toContain('w-24');
  });

  it('contains shimmer animation child', () => {
    const { container } = render(<Skeleton />);
    const shimmer = container.querySelector('.animate-shimmer');
    expect(shimmer).toBeTruthy();
  });
});
