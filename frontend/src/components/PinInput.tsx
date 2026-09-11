import { HStack, Input } from '@chakra-ui/react';
import { useRef } from 'react';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  length?: number;
  error?: boolean;
  disabled?: boolean;
}

export function PinInput({ value, onChange, onComplete, length = 4, error, disabled }: PinInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.split('');

  const setDigit = (index: number, digit: string) => {
    const next = digits.slice(0, length);
    while (next.length < length) next.push('');
    next[index] = digit;
    const joined = next.join('').slice(0, length);
    onChange(joined);
    if (joined.length === length && joined.split('').every((d) => d !== '')) {
      onComplete?.(joined);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    setDigit(index, digit);
    if (digit && index < length - 1) {
      refs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (pasted) {
      e.preventDefault();
      onChange(pasted.padEnd(length, ''));
      if (pasted.length === length) {
        onComplete?.(pasted);
        refs.current[length - 1]?.focus();
      } else {
        refs.current[pasted.length]?.focus();
      }
    }
  };

  return (
    <HStack gap="2">
      {Array.from({ length }).map((_, i) => (
        <Input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={digits[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          textAlign="center"
          fontSize="xl"
          fontWeight="600"
          w="12"
          h="14"
          borderRadius="md"
          borderColor={error ? 'danger' : 'border'}
          _focus={{
            borderColor: error ? 'danger' : 'primary',
            boxShadow: `0 0 0 1px var(--chakra-colors-${error ? 'danger' : 'primary'})`,
          }}
        />
      ))}
    </HStack>
  );
}
