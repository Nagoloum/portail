import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiCopy } from 'react-icons/fi';
import { RequestSummary } from '../api/types';
import { StatusBadge } from './StatusBadge';
import { formatDateFr, formatExpiry } from '../utils/format';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';

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
    >
      <HStack justify="space-between" align="flex-start">
        <VStack align="flex-start" gap="0.5">
          <RouterLink to={`/requests/${request.id}`}>
            <Text fontWeight="600" fontSize="md" _hover={{ color: 'primary' }}>
              {request.title}
            </Text>
          </RouterLink>
          <Text fontSize="xs" color="gray.solid">
            Cree le {formatDateFr(request.createdAt)}, {formatExpiry(request.status, request.expiresAt).toLowerCase()}
          </Text>
        </VStack>
        <StatusBadge status={request.status} />
      </HStack>

      <Text fontSize="sm" color="gray.solid">
        {request.uploadedCount} piece{request.uploadedCount > 1 ? 's' : ''} sur {request.requiredCount}
      </Text>

      <Button
        variant="outline"
        size="sm"
        alignSelf="flex-start"
        onClick={() => copy(request.link)}
      >
        <FiCopy /> {copied ? 'Lien copie' : 'Copier le lien'}
      </Button>
    </Box>
  );
}
