import React, { useRef, useEffect } from "react";
import clsx from "clsx";
import styles from "./OTPInput.module.scss";

export interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
}

export const OTPInput: React.FC<OTPInputProps> = ({
  value,
  onChange,
  length = 6,
  autoFocus = true,
  disabled = false,
  className,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Split value into array of length
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const val = e.target.value.replace(/\D/g, "");
    if (!val) {
      // Clear current digit
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));
      return;
    }

    // If multiple digits (e.g. autofill or fast typing)
    const newDigits = [...digits];
    let nextIdx = index;
    for (let i = 0; i < val.length && index + i < length; i++) {
      newDigits[index + i] = val[i];
      nextIdx = index + i + 1;
    }
    onChange(newDigits.join(""));

    if (nextIdx < length && inputsRef.current[nextIdx]) {
      inputsRef.current[nextIdx]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0 && inputsRef.current[index - 1]) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text/plain").replace(/\D/g, "").slice(0, length);
    if (pasted) {
      onChange(pasted);
      const targetIdx = Math.min(pasted.length, length - 1);
      inputsRef.current[targetIdx]?.focus();
    }
  };

  return (
    <div className={clsx(styles.otpContainer, className)} onPaste={handlePaste}>
      {digits.map((digit, i) => (
        <React.Fragment key={i}>
          {i === 3 && <div className={styles.separator}>—</div>}
          <input
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={clsx(styles.slot, digit && styles.filled)}
            aria-label={`Цифра ${i + 1}`}
          />
        </React.Fragment>
      ))}
    </div>
  );
};
