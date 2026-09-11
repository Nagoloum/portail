import { Box, Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCopy } from 'react-icons/fi';
import { getRequest } from '../api/requests';
import { LawyerLayout } from '../components/LawyerLayout';
import { StatusBadge } from '../components/StatusBadge';
import { Card } from '../components/Card';
import { FileRow } from '../components/FileRow';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { formatBytes, formatDateFr, formatExpiry } from '../utils/format';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const linkCopy = useCopyToClipboard();
  const { data: request, isLoading, isError } = useQuery({
    queryKey: ['requests', id],
    queryFn: () => getRequest(id!),
    enabled: !!id,
    refetchInterval: 15_000, // picks up client uploads without a manual refresh
  });

  return (
    <LawyerLayout>
      <VStack align="stretch" gap="5">
        <RouterLink to="/">
          <HStack color="gray.solid" fontSize="sm" _hover={{ color: 'primary' }}>
            <FiArrowLeft /> <Text>Retour aux demandes</Text>
          </HStack>
        </RouterLink>

        {isLoading && (
          <HStack justify="center" py="12" color="gray.solid">
            <Spinner size="sm" /> <Text fontSize="sm">Chargement...</Text>
          </HStack>
        )}

        {isError && (
          <Box bg="dangerBg" color="danger" borderRadius="md" px="4" py="3" fontSize="sm">
            Demande introuvable.
          </Box>
        )}

        {request && (
          <>
            <HStack justify="space-between" align="flex-start" wrap="wrap" gap="3">
              <VStack align="flex-start" gap="1">
                <Heading size="lg">{request.title}</Heading>
                <Text fontSize="sm" color="gray.solid">
                  Cree le {formatDateFr(request.createdAt)}, {formatExpiry(request.status, request.expiresAt).toLowerCase()}
                </Text>
              </VStack>
              <StatusBadge status={request.status} />
            </HStack>

            <Card p="4">
              <HStack justify="space-between" wrap="wrap" gap="2">
                <VStack align="flex-start" gap="0">
                  <Text fontSize="xs" color="gray.solid">
                    Lien public
                  </Text>
                  <Text fontFamily="mono" fontSize="sm">
                    {request.link.replace(/^https?:\/\//, '')}
                  </Text>
                </VStack>
                <Button size="sm" variant="outline" onClick={() => linkCopy.copy(request.link)}>
                  <FiCopy /> {linkCopy.copied ? 'Copie' : 'Copier le lien'}
                </Button>
              </HStack>
            </Card>

            <VStack align="stretch" gap="3">
              <Text fontWeight="600" fontSize="sm">
                {request.uploadedCount} piece{request.uploadedCount > 1 ? 's' : ''} sur {request.requiredCount}
              </Text>

              {request.files.length === 0 ? (
                <Box bg="accentBg" borderRadius="md" px="4" py="6" textAlign="center" fontSize="sm" color="gray.solid">
                  Aucune piece deposee pour le moment.
                </Box>
              ) : (
                <VStack align="stretch" gap="2">
                  {request.files.map((file) => (
                    <FileRow
                      key={file.id}
                      item={{
                        id: file.id,
                        name: file.originalName,
                        size: file.size,
                        progress: 100,
                        status: 'done',
                      }}
                    />
                  ))}
                </VStack>
              )}
              {request.files.length > 0 && (
                <Text fontSize="xs" color="gray.solid">
                  Derniere piece: {formatBytes(request.files[request.files.length - 1].size)}
                </Text>
              )}
            </VStack>
          </>
        )}
      </VStack>
    </LawyerLayout>
  );
}
