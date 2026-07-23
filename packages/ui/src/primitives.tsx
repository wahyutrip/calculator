'use client';

import * as React from 'react';
import { cn } from './cn.js';

/* ── Button ─────────────────────────────────────────────────────────────── */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', className, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={cn('mm-btn', `mm-btn--${variant}`, className)} {...rest} />
  );
});

/* ── IconButton ─────────────────────────────────────────────────────────── */

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control is unusable to a screen reader without it. */
  label: string;
  tone?: 'default' | 'danger';
}

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton({ label, tone = 'default', className, type = 'button', children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn('mm-iconbtn', tone === 'danger' && 'mm-iconbtn--danger', className)}
        {...rest}
      >
        <span aria-hidden="true">{children}</span>
      </button>
    );
  },
);

/* ── Select ─────────────────────────────────────────────────────────────── */

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: React.ReactNode;
  options: readonly SelectOption[];
  hint?: string | null;
  error?: string | null;
}

/**
 * A native select. Radix would give a prettier menu, but the native control is
 * genuinely better on touch — it opens the platform picker users already know,
 * and it cannot be scrolled off-screen by a mobile keyboard.
 */
export function Select({ id, label, options, hint, error, className, ...rest }: SelectProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className={cn('mm-field', className)}>
      <label htmlFor={id} className="mm-label">
        {label}
      </label>
      <div className={cn('mm-ctrl', 'mm-ctrl--select', error && 'mm-ctrl--bad')}>
        <select
          id={id}
          className="mm-input mm-select"
          aria-invalid={error ? true : undefined}
          aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="mm-select-caret" aria-hidden="true">
          ▾
        </span>
      </div>
      {error ? (
        <span id={errorId} className="mm-error" role="alert">
          {error}
        </span>
      ) : null}
      {hint && !error ? (
        <span id={hintId} className="mm-hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

/* ── Card ───────────────────────────────────────────────────────────────── */

export function Card({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mm-card', className)} {...rest} />;
}

/* ── Badge ──────────────────────────────────────────────────────────────── */

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: 'neutral' | 'bull' | 'bear' | 'warning';
}

export function Badge({ tone = 'neutral', className, ...rest }: BadgeProps) {
  return <span className={cn('mm-badge', `mm-badge--${tone}`, className)} {...rest} />;
}

/* ── Callout ────────────────────────────────────────────────────────────── */

export interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'info' | 'warning' | 'danger';
  mark?: string;
}

export function Callout({ tone = 'warning', mark, className, children, ...rest }: CalloutProps) {
  const glyph = mark ?? (tone === 'info' ? 'i' : '!');
  return (
    <div className={cn('mm-callout', `mm-callout--${tone}`, className)} {...rest}>
      <span className="mm-callout-mark" aria-hidden="true">
        {glyph}
      </span>
      <span>{children}</span>
    </div>
  );
}
