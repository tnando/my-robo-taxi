import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UnlinkConfirmDialog } from '@/features/settings/components/UnlinkConfirmDialog';

// jsdom doesn't implement HTMLDialogElement.showModal/close
beforeEach(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute('open');
  });
});

describe('UnlinkConfirmDialog', () => {
  it('renders dialog content when open', () => {
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(screen.getByText('Unlink Tesla account?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Unlink' })).toBeInTheDocument();
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

  it('calls showModal when open becomes true', () => {
    render(
      <UnlinkConfirmDialog open loading={false} onConfirm={vi.fn()} onCancel={vi.fn()} />,
    );

    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });
});
