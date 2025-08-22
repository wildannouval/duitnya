"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatIDR, parseCurrencyToInt } from "@/lib/money";

export function InputCurrency({
  value,            // string angka mentah, ex: "150000"
  onValueChange,    // (val: string) -> void  (tetap mentah)
  placeholder,
  id,
  name,
  disabled,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder?: string;
  id?: string;
  name?: string;
  disabled?: boolean;
}) {
  const [display, setDisplay] = React.useState(value);
  const [focused, setFocused] = React.useState(false);

  React.useEffect(() => {
    if (!focused) {
      const n = parseCurrencyToInt(value);
      setDisplay(n ? formatIDR(n) : "");
    } else {
      setDisplay(value);
    }
  }, [value, focused]);

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const n = parseCurrencyToInt(raw);
    onValueChange(String(n));
  }

  return (
    <Input
      id={id}
      name={name}
      disabled={disabled}
      inputMode="numeric"
      placeholder={placeholder ?? "Mis. 150000"}
      value={display}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onChange={onChange}
    />
  );
}
