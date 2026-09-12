import { HStack, Text } from '@chakra-ui/react';
import { FiPaperclip } from 'react-icons/fi';

/**
 * The neutral "3 pieces" pill shown next to the status badges in the
 * brief's UI kit. Deliberately colourless: the status badge carries the
 * semantic colour, this one carries a fact. Two coloured pills side by
 * side would compete.
 */
export function CountPill({ uploaded, required }: { uploaded: number; required: number }) {
  const complete = uploaded >= required;

  return (
    <HStack
      as="span"
      display="inline-flex"
      gap="1.5"
      bg="accentBg"
      color={complete ? 'primary' : 'gray.solid'}
      borderRadius="full"
      px="3"
      py="1"
      fontSize="xs"
      fontWeight="600"
      w="fit-content"
      whiteSpace="nowrap"
    >
      <FiPaperclip aria-hidden />
      <Text as="span">
        {uploaded} sur {required} piece{required > 1 ? 's' : ''}
      </Text>
    </HStack>
  );
}
