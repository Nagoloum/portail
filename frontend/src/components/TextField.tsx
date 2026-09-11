import { Input, InputProps, Text, VStack } from '@chakra-ui/react';

interface TextFieldProps extends InputProps {
  label: string;
  error?: string;
}

export function TextField({ label, error, ...inputProps }: TextFieldProps) {
  return (
    <VStack align="stretch" gap="1.5" w="full">
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
