import { describe, it, expect } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Toaster, toast, useToastStore } from '@/components/ui/Toast';

describe('Input a11y', () => {
  it('associates the label with the input', () => {
    render(<Input label="Email address" />);
    const input = screen.getByLabelText('Email address');
    expect(input).toBeInTheDocument();
  });

  it('links the error via aria-describedby and sets aria-invalid', () => {
    render(<Input label="Email" error="Enter a valid email" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorNode = document.getElementById(describedBy!.split(' ').pop()!);
    expect(errorNode).toHaveTextContent('Enter a valid email');
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a valid email');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    render(<Input label="Password" type="password" />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(input).toHaveAttribute('type', 'text');
  });
});

describe('Button', () => {
  it('sets aria-busy and disables while loading', () => {
    render(<Button isLoading>Save</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
  });
});

function ModalHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit product">
        <input aria-label="Name" />
        <button>Save</button>
      </Modal>
    </>
  );
}

describe('Modal a11y', () => {
  it('is labelled by its title and returns focus to the opener on close', async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAccessibleName('Edit product');
    // focus moved into the dialog
    expect(dialog.contains(document.activeElement)).toBe(true);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.activeElement).toBe(opener); // focus restored
  });
});

describe('Toast a11y', () => {
  it('renders errors in an assertive alert region and success in a polite status region', () => {
    useToastStore.setState({ toasts: [] });
    render(<Toaster />);
    act(() => {
      toast.error('Could not save');
      toast('Saved');
    });
    const alert = screen.getByRole('alert');
    const status = screen.getByRole('status');
    expect(within(alert).getByText('Could not save')).toBeInTheDocument();
    expect(within(status).getByText('Saved')).toBeInTheDocument();
  });
});
