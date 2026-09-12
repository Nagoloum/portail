import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { FiCheck, FiClock, FiCopy, FiLink, FiLock } from 'react-icons/fi';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { formatDateFr } from '../utils/format';

interface GeneratedLinkCardProps {
  link: string;
  pin: string;
  expiresAt: string;
}

/** Monospace, truncated, copy action - per the brief's "lien genere". */
export function GeneratedLinkCard({ link, pin, expiresAt }: GeneratedLinkCardProps) {
  const linkCopy = useCopyToClipboard();
  const pinCopy = useCopyToClipboard();
  const shortLink = link.replace(/^https?:\/\//, '');

  return (
    <VStack align="stretch" gap="3" bg="accentBg" borderRadius="lg" p="4">
      <VStack align="stretch" gap="1">
        <HStack gap="1.5" color="gray.solid">
          <FiLink aria-hidden />
          <Text fontSize="xs" fontWeight="600" textTransform="uppercase" letterSpacing="wide">
            Lien a transmettre au client
          </Text>
        </HStack>
        <HStack justify="space-between" bg="white" borderWidth="1px" borderColor="border" borderRadius="md" p="2" gap="2">
          <Text fontFamily="mono" fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {shortLink}
          </Text>
          <Button size="sm" variant="ghost" onClick={() => linkCopy.copy(link)} flexShrink={0}>
            {linkCopy.copied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
            {linkCopy.copied ? 'Copie' : 'Copier'}
          </Button>
        </HStack>
      </VStack>

      <HStack justify="space-between" bg="white" borderWidth="1px" borderColor="border" borderRadius="md" p="2" gap="2">
        <HStack gap="2.5" minW="0">
          <Box color="primary" fontSize="lg" flexShrink={0}>
            <FiLock aria-hidden />
          </Box>
          <VStack align="flex-start" gap="0">
            <Text fontSize="xs" color="gray.solid">
              Code PIN
            </Text>
            <Text fontFamily="mono" fontSize="lg" fontWeight="600" letterSpacing="widest">
              {pin}
            </Text>
          </VStack>
        </HStack>
        <Button size="sm" variant="ghost" onClick={() => pinCopy.copy(pin)} flexShrink={0}>
          {pinCopy.copied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
          {pinCopy.copied ? 'Copie' : 'Copier'}
        </Button>
      </HStack>

      <HStack gap="1.5" align="flex-start" color="gray.solid" fontSize="xs">
        <Box pt="0.5" flexShrink={0}>
          <FiClock aria-hidden />
        </Box>
        <Text>
          Expire le {formatDateFr(expiresAt)}. Transmettez le PIN par un autre canal que le lien.
        </Text>
      </HStack>
    </VStack>
  );
}
