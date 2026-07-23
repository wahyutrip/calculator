'use client';

import * as React from 'react';
import { cn } from './cn.js';
import { digitsOnly, formatGrouped, parseNumericInput } from './format.js';

export interface NumericInputProps {
  id: string;
  label: React.ReactNode;
  /** Raw value. Formatted strings are never parsed back into state. */
  value: number | null;
  onChange: (value: number | null) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  max?: number;
  /** Snap the committed value on blur (used for IDX tick alignment). */
  snapOnBlur?: (value: number) => number;
  error?: string | null;
  hint?: string | null;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  invalidTone?: 'bear' | 'info';
  autoFocus?: boolean;
  labelSuffix?: React.ReactNode;
}

/**
 * The highest-traffic component in the product.
 *
 * Groups thousands AS THE USER TYPES while preserving the caret. Naive
 * reformatting sends the caret to the end on every keystroke, which makes the
 * field unusable — so the caret is tracked by DIGIT INDEX (separators shift
 * character positions, digits do not) and restored after render.
 */
export const NumericInput = React.forwardRef<HTMLInputElement, NumericInputProps>(
  function NumericInput(props, forwardedRef) {
    const {
      id,
      label,
      value,
      onChange,
      prefix,
      suffix,
      min,
      max,
      snapOnBlur,
      error,
      hint,
      placeholder,
      className,
      inputClassName,
      invalidTone = 'bear',
      autoFocus,
      labelSuffix,
    } = props;

    const innerRef = React.useRef<HTMLInputElement | null>(null);
    const caretDigitsRef = React.useRef<number | null>(null);

    const setRefs = React.useCallback(
      (el: HTMLInputElement | null) => {
        innerRef.current = el;
        if (typeof forwardedRef === 'function') forwardedRef(el);
        else if (forwardedRef) forwardedRef.current = el;
      },
      [forwardedRef],
    );

    const display = value === null ? '' : formatGrouped(value);

    React.useLayoutEffect(() => {
      const el = innerRef.current;
      const target = caretDigitsRef.current;
      caretDigitsRef.current = null;
      if (!el || target === null || document.activeElement !== el) return;
      // Walk the formatted string counting digits until the same digit index is
      // reached, then place the caret there.
      let pos = 0;
      let seen = 0;
      while (pos < el.value.length && seen < target) {
        if (/\d/.test(el.value.charAt(pos))) seen += 1;
        pos += 1;
      }
      el.setSelectionRange(pos, pos);
    });

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const el = e.currentTarget;
      const selectionStart = el.selectionStart ?? el.value.length;
      caretDigitsRef.current = digitsOnly(el.value.slice(0, selectionStart)).length;
      // Non-digits are stripped here, so pasting "Rp 10.000.000" needs no
      // special-case paste handler.
      onChange(parseNumericInput(el.value));
    }

    function handleBlur() {
      if (value === null) return;
      let next = value;
      // Clamp rather than reject — pasting 15 digits should give the maximum with
      // a message, not a crash.
      if (min !== undefined && next < min) next = min;
      if (max !== undefined && next > max) next = max;
      // Snap on BLUR only. Snapping mid-typing makes the field fight the user:
      // typing "1" in an empty field would instantly become something else.
      if (snapOnBlur) next = snapOnBlur(next);
      if (next !== value) onChange(next);
    }

    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const describedBy = [error ? errorId : null, hint ? hintId : null]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={cn('mm-field', className)}>
        <label htmlFor={id} className="mm-label">
          {label}
          {labelSuffix ? <span className="mm-label-suffix">{labelSuffix}</span> : null}
        </label>
        <div
          className={cn(
            'mm-ctrl',
            error && (invalidTone === 'bear' ? 'mm-ctrl--bad' : 'mm-ctrl--info'),
          )}
        >
          {prefix ? <span className="mm-affix">{prefix}</span> : null}
          <input
            ref={setRefs}
            id={id}
            /*
             * text, not number: type="number" cannot contain thousand separators
             * and brings scroll-wheel increments and spinners we do not want.
             * inputMode still gives phones the number pad.
             */
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={cn('mm-input', inputClassName)}
            value={display}
            placeholder={placeholder}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy || undefined}
            autoFocus={autoFocus}
          />
          {suffix ? <span className="mm-affix mm-affix--end">{suffix}</span> : null}
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
  },
);
