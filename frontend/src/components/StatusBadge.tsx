import { HStack, Text } from '@chakra-ui/react';
import { IconType } from 'react-icons';
import { FiCheck, FiClock, FiSlash } from 'react-icons/fi';
import { RequestStatus } from '../api/types';

/**
 * Semantic colour on semantic background, never a raw colour - the three
 * pairs come straight from the charte. The icon doubles the meaning so
 * the status survives a colour-blind reading or a greyscale print.
 */
const CONFIG: Record<RequestStatus, { label: string; color: string; bg: string; Icon: IconType }> = {
  PENDING: { label: 'En attente', color: 'warning', bg: 'warningBg', Icon: FiClock },
  COMPLETE: { label: 'Complete', color: 'success', bg: 'successBg', Icon: FiCheck },
  EXPIRED: { label: 'Expiree', color: 'danger', bg: 'dangerBg', Icon: FiSlash },
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  const { label, color, bg, Icon } = CONFIG[status];
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
      whiteSpace="nowrap"
    >
      <Icon aria-hidden />
      <Text as="span">{label}</Text>
    </HStack>
  );
}
