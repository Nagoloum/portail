import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { FiCopy } from 'react-icons/fi';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { formatDateFr } from '../utils/format';

interface GeneratedLinkCardProps {
  link: string;
  pin: string;
  expiresAt: string;
}

export function GeneratedLinkCard({ link, pin, expiresAt }: GeneratedLinkCardProps) {
  const linkCopy = useCopyToClipboard();
  const pinCopy = useCopyToClipboard();
  const shortLink = link.replace(/^https?:\/\//, '');

  return (
    <VStack align="stretch" gap="3" bg="accentBg" borderRadius="lg" p="4">
      <VStack align="stretch" gap="1">
        <Text fontSize="xs" fontWeight="600" color="gray.solid" textTransform="uppercase" letterSpacing="wide">
          Lien a transmettre au client
        </Text>
        <HStack justify="space-between" bg="white" borderWidth="1px" borderColor="border" borderRadius="md" p="2">
          <Text fontFamily="mono" fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
            {shortLink}
          </Text>
          <Button size="sm" variant="ghost" onClick={() => linkCopy.copy(link)} flexShrink={0}>
            <FiCopy /> {linkCopy.copied ? 'Copie' : 'Copier'}
          </Button>
        </HStack>
      </VStack>

      <HStack justify="space-between" bg="white" borderWidth="1px" borderColor="border" borderRadius="md" p="2">
        <VStack align="flex-start" gap="0">
          <Text fontSize="xs" color="gray.solid">
            Code PIN (affiche une seule fois)
          </Text>
          <Text fontFamily="mono" fontSize="lg" fontWeight="600" letterSpacing="widest">
            {pin}
          </Text>
        </VStack>
        <Button size="sm" variant="ghost" onClick={() => pinCopy.copy(pin)}>
          <FiCopy /> {pinCopy.copied ? 'Copie' : 'Copier'}
        </Button>
      </HStack>

      <Text fontSize="xs" color="gray.solid">
        Expire le {formatDateFr(expiresAt)}, protege par un code a 4 chiffres. Transmettez le PIN par un
        canal different du lien (SMS plutot que le meme email, par exemple).
      </Text>
    </VStack>
  );
}
