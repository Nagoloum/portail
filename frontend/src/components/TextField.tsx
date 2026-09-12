import { Input, InputProps, StackProps, Text, VStack } from '@chakra-ui/react';

interface TextFieldProps extends InputProps {
  label: string;
  error?: string;
  /**
   * Layout for the field as a whole. Kept separate on purpose: passing
   * `flex` straight through to the Input made it a flex child of its own
   * column wrapper, which collapsed its height - two number fields side
   * by side ended up half as tall as the text field above them.
   */
  fieldProps?: StackProps;
}

export function TextField({ label, error, fieldProps, ...inputProps }: TextFieldProps) {
  return (
    <VStack align="stretch" gap="1.5" w="full" {...fieldProps}>
      <Text as="label" fontSize="sm" fontWeight="500">
        {label}
      </Text>
      <Input
        borderColor={error ? 'danger' : 'border'}
        borderRadius="md"
        _focus={{
          borderColor: error ? 'danger' : 'primary',
          boxShadow: `0 0 0 1px var(--chakra-colors-${error ? 'danger' : 'primary'})`,
        }}
        {...inputProps}
      />
      {error && (
        <Text fontSize="xs" color="danger">
          {error}
        </Text>
      )}
    </VStack>
  );
}
