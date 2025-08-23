"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type InputCurrencyProps = {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
  className?: string;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  autoFocus?: boolean;
};

/**
 * Input angka sederhana (hanya digit). Tampilan tanpa pemisah ribuan.
 * Gunakan parseCurrencyToInt() saat submit untuk mengubah ke number.
 */
export const InputCurrency = React.forwardRef<HTMLInputElement, InputCurrencyProps>(
  (
    {
      value,
      onValueChange,
      placeholder,
      id,
      name,
      disabled,
      className,
      onKeyDown,
      autoFocus,
    },
    ref
  ) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const digits = e.target.value.replace(/[^\d]/g, "");
      onValueChange(digits || "0");
    };

    return (
      <Input
        ref={ref}
        id={id}
        name={name}
        disabled={disabled}
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? "0"}
        inputMode="numeric"
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className={cn("text-right", className)}
      />
    );
  }
);

InputCurrency.displayName = "InputCurrency";
