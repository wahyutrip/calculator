import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NumericInput } from '../NumericInput.js';

/** Controlled harness — mirrors how the app actually drives the input. */
function Harness(props: {
  initial?: number | null;
  min?: number;
  max?: number;
  snapOnBlur?: (n: number) => number;
  onValue?: (n: number | null) => void;
}) {
  const [value, setValue] = React.useState<number | null>(props.initial ?? null);
  return (
    <NumericInput
      id="amount"
      label="Balance"
      value={value}
      onChange={(v) => {
        setValue(v);
        props.onValue?.(v);
      }}
      prefix="Rp"
      min={props.min}
      max={props.max}
      snapOnBlur={props.snapOnBlur}
    />
  );
}

const input = () => screen.getByLabelText('Balance') as HTMLInputElement;

describe('NumericInput', () => {
  it('groups thousands as the user types', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), '10000000');
    expect(input().value).toBe('10.000.000');
  });

  it('keeps the caret in place when a separator is inserted mid-typing', async () => {
    const user = userEvent.setup();
    render(<Harness initial={100000} />);
    const el = input();
    expect(el.value).toBe('100.000');

    // Put the caret right after the leading "1" (digit index 1) and type "2".
    el.setSelectionRange(1, 1);
    await user.type(el, '2', { initialSelectionStart: 1, initialSelectionEnd: 1 });

    expect(el.value).toBe('1.200.000');
    // Caret must sit after the "2" — digit index 2 — which is character index 3
    // in "1.200.000". A naive reformat would have parked it at the end.
    expect(el.selectionStart).toBe(3);
  });

  it('sanitises pasted values from spreadsheets and chat', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.click(input());
    await user.paste('Rp 10.000.000');
    expect(input().value).toBe('10.000.000');
    expect(onValue).toHaveBeenLastCalledWith(10_000_000);
  });

  it.each(['10,000,000', '10 000 000', 'Rp10000000'])('accepts pasted %s', async (pasted) => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(input());
    await user.paste(pasted);
    expect(input().value).toBe('10.000.000');
  });

  it('reports empty as null, never 0', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness initial={1000} onValue={onValue} />);
    await user.clear(input());
    expect(onValue).toHaveBeenLastCalledWith(null);
    expect(input().value).toBe('');
  });

  it('treats a typed zero as the value zero', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<Harness onValue={onValue} />);
    await user.type(input(), '0');
    expect(onValue).toHaveBeenLastCalledWith(0);
  });

  it('clamps to min and max on blur instead of rejecting', async () => {
    const user = userEvent.setup();
    render(<Harness min={100_000} max={1_000_000} />);
    await user.type(input(), '50');
    await user.tab();
    expect(input().value).toBe('100.000');

    await user.clear(input());
    await user.type(input(), '99999999');
    await user.tab();
    expect(input().value).toBe('1.000.000');
  });

  it('snaps on blur only — never while typing', async () => {
    const user = userEvent.setup();
    const snap = (n: number) => Math.round(n / 5) * 5;
    render(<Harness snapOnBlur={snap} />);
    await user.type(input(), '1003');
    // Still exactly what was typed: snapping mid-typing would fight the user.
    expect(input().value).toBe('1.003');
    await user.tab();
    expect(input().value).toBe('1.005');
  });

  it('does not snap an empty field on blur', async () => {
    const user = userEvent.setup();
    const snap = vi.fn((n: number) => n);
    render(<Harness snapOnBlur={snap} />);
    await user.click(input());
    await user.tab();
    expect(snap).not.toHaveBeenCalled();
    expect(input().value).toBe('');
  });

  it('exposes the number pad on phones without using type=number', () => {
    render(<Harness />);
    // type="number" cannot hold thousand separators, so inputMode carries this.
    expect(input()).toHaveAttribute('type', 'text');
    expect(input()).toHaveAttribute('inputmode', 'numeric');
  });

  it('wires an error to the input for assistive tech', () => {
    render(
      <NumericInput id="amount" label="Balance" value={null} onChange={() => {}} error="Balance wajib diisi" />,
    );
    const el = screen.getByLabelText('Balance');
    expect(el).toHaveAttribute('aria-invalid', 'true');
    expect(el).toHaveAccessibleDescription('Balance wajib diisi');
    expect(screen.getByRole('alert')).toHaveTextContent('Balance wajib diisi');
  });

  it('shows a hint only when there is no error', () => {
    const { rerender } = render(
      <NumericInput id="amount" label="Balance" value={null} onChange={() => {}} hint="modal, bukan equity" />,
    );
    expect(screen.getByText('modal, bukan equity')).toBeInTheDocument();

    rerender(
      <NumericInput
        id="amount"
        label="Balance"
        value={null}
        onChange={() => {}}
        hint="modal, bukan equity"
        error="Balance wajib diisi"
      />,
    );
    expect(screen.queryByText('modal, bukan equity')).not.toBeInTheDocument();
  });
});
