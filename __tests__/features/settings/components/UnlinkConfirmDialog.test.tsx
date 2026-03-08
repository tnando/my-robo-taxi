import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UnlinkConfirmDialog } from '@/features/settings/components/UnlinkConfirmDialog';

describe('UnlinkConfirmDialog', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <UnlinkConfirmDialog open={false} loading={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(container.innerHTML).toBe('');
  });

  it('renders dialog content when open', () => {
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText('Unlink Tesla account?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
  });

  it('uses alertdialog role with proper ARIA attributes', () => {
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'unlink-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'unlink-dialog-desc');
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onConfirm when Unlink is clicked', async () => {
    const onConfirm = vi.fn();
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={onConfirm} onCancel={vi.fn()} />,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Unlink' }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('shows loading text and disables buttons when loading', () => {
    render(
      <UnlinkConfirmDialog open loading onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: /unlinking/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('calls onCancel when Escape is pressed', async () => {
    const onCancel = vi.fn();
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await userEvent.keyboard('{Escape}');
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onCancel on Escape while loading', async () => {
    const onCancel = vi.fn();
    render(
      <UnlinkConfirmDialog open loading onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    await userEvent.keyboard('{Escape}');
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when backdrop is clicked', async () => {
    const onCancel = vi.fn();
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={onCancel} />,
    );

    // Click the overlay (outermost fixed div), not the panel
    const overlay = screen.getByRole('alertdialog').parentElement!;
    await userEvent.click(overlay);
    expect(onCancel).toHaveBeenCalledOnce();
  });
});
