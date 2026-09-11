import { Box, HStack, Text } from '@chakra-ui/react';
import { RequestStatus } from '../api/types';

const CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'En attente', color: 'warning', bg: 'warningBg' },
  COMPLETE: { label: 'Complete', color: 'success', bg: 'successBg' },
  EXPIRED: { label: 'Expiree', color: 'danger', bg: 'dangerBg' },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, color, bg } = CONFIG[status];
  return (
    <HStack
      as="span"
      gap="1.5"
      bg={bg}
      color={color}
      borderRadius="full"
      px="3"
      py="1"
      fontSize="xs"
      fontWeight="600"
      display="inline-flex"
      w="fit-content"
    >
      <Box as="span" w="1.5" h="1.5" borderRadius="full" bg="currentColor" />
      <Text as="span">{label}</Text>
    </HStack>
  );
}
