import { Box, Button, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { FiArrowLeft, FiCheck, FiCopy, FiClock, FiInbox, FiLink } from 'react-icons/fi';
import { getRequest } from '../api/requests';
import { LawyerLayout } from '../components/LawyerLayout';
import { StatusBadge } from '../components/StatusBadge';
import { CountPill } from '../components/CountPill';
import { Alert } from '../components/Alert';
import { Card } from '../components/Card';
import { FileRow } from '../components/FileRow';
import { useCopyToClipboard } from '../hooks/useCopyToClipboard';
import { formatDateFr, formatExpiry } from '../utils/format';

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

        {isError && <Alert>Cette demande est introuvable.</Alert>}

        {request && (
          <>
            <HStack justify="space-between" align="flex-start" wrap="wrap" gap="3">
              <VStack align="flex-start" gap="1.5">
                <Heading size="lg">{request.title}</Heading>
                <HStack gap="1.5" color="gray.solid" fontSize="sm">
                  <FiClock aria-hidden />
                  <Text>
                    Cree le {formatDateFr(request.createdAt)},{' '}
                    {formatExpiry(request.status, request.expiresAt).toLowerCase()}
                  </Text>
                </HStack>
              </VStack>
              <StatusBadge status={request.status} />
            </HStack>

            <Card p="4">
              <HStack justify="space-between" wrap="wrap" gap="2">
                <VStack align="flex-start" gap="0" minW="0">
                  <HStack gap="1.5" color="gray.solid">
                    <FiLink aria-hidden />
                    <Text fontSize="xs">Lien public</Text>
                  </HStack>
                  <Text fontFamily="mono" fontSize="sm" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap">
                    {request.link.replace(/^https?:\/\//, '')}
                  </Text>
                </VStack>
                <Button size="sm" variant="outline" onClick={() => linkCopy.copy(request.link)} flexShrink={0}>
                  {linkCopy.copied ? <FiCheck aria-hidden /> : <FiCopy aria-hidden />}
                  {linkCopy.copied ? 'Copie' : 'Copier le lien'}
                </Button>
              </HStack>
            </Card>

            <VStack align="stretch" gap="3">
              <HStack justify="space-between" wrap="wrap" gap="2">
                <Text fontWeight="600" fontSize="sm">
                  Pieces deposees
                </Text>
                <CountPill uploaded={request.uploadedCount} required={request.requiredCount} />
              </HStack>

              {request.files.length === 0 ? (
                <VStack
                  bg="accentBg"
                  borderRadius="md"
                  px="4"
                  py="8"
                  gap="2"
                  textAlign="center"
                  fontSize="sm"
                  color="gray.solid"
                >
                  <Box fontSize="xl" color="secondary">
                    <FiInbox aria-hidden />
                  </Box>
                  <Text>Aucune piece deposee pour le moment.</Text>
                  <Text fontSize="xs">Le client depose ses pieces depuis le lien ci-dessus.</Text>
                </VStack>
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
            </VStack>
          </>
        )}
      </VStack>
    </LawyerLayout>
  );
}
