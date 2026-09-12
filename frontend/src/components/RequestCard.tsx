import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiArrowRight, FiCheck, FiClock, FiCopy } from 'react-icons/fi';
import { RequestSummary } from '../api/types';
import { StatusBadge } from './StatusBadge';
import { CountPill } from './CountPill';
import { formatDateFr, formatExpiry } from '../utils/format';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

/** White, 1px border, 12px radius, no shadow - per the charte. */
export function RequestCard({ request }: { request: RequestSummary }) {
  const { copy, copied } = useCopyToClipboard();

  return (
    <Box
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      p="5"
      display="flex"
      flexDirection="column"
      gap="3"
      transition="border-color 0.15s ease"
      _hover={{ borderColor: 'accentSoft' }}
    >
      <HStack justify="space-between" align="flex-start" gap="3">
        <VStack align="flex-start" gap="1" minW="0">
          <RouterLink to={`/dossiers/${request.id}`}>
            <HStack gap="1.5" color="text" _hover={{ color: 'primary' }} transition="color 0.15s ease">
              <Text fontWeight="600" fontSize="md">
                {request.title}
              </Text>
              <FiArrowRight aria-hidden />
            </HStack>
          </RouterLink>
          <HStack gap="1.5" color="gray.solid" fontSize="xs">
            <FiClock aria-hidden />
            <Text>
              Cree le {formatDateFr(request.createdAt)}, {formatExpiry(request.status, request.expiresAt).toLowerCase()}
            </Text>
          </HStack>
        </VStack>
        <StatusBadge status={request.status} />
      </HStack>

      <CountPill uploaded={request.uploadedCount} required={request.requiredCount} />

      <Button variant="outline" size="sm" alignSelf="flex-start" onClick={() => copy(request.link)}>
        {copied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
        {copied ? 'Lien copie' : 'Copier le lien'}
      </Button>
    </Box>
  );
}
