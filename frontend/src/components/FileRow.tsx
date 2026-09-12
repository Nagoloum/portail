import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { FiCheck, FiRefreshCw } from 'react-icons/fi';
import { formatBytes } from '../utils/format';

export type UploadStatus = 'uploading' | 'done' | 'error';

export interface UploadItem {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: UploadStatus;
  errorMessage?: string;
}

function extensionBadge(name: string): string {
  const ext = name.split('.').pop()?.toUpperCase() ?? '';
  if (ext === 'JPEG') return 'JPG';
  return ext || 'FILE';
}

/** One row per piece, action on the right - per the brief's UI kit. */
export function FileRow({ item, onRetry }: { item: UploadItem; onRetry?: () => void }) {
  const failed = item.status === 'error';

  return (
    <HStack
      justify="space-between"
      align="center"
      bg="white"
      borderWidth="1px"
      borderColor={failed ? 'danger' : 'border'}
      borderRadius="md"
      px="3"
      py="2.5"
      gap="3"
    >
      <HStack gap="3" minW="0" flex="1">
        <Box
          bg={failed ? 'dangerBg' : 'accentBg'}
          color={failed ? 'danger' : 'primary'}
          fontSize="xs"
          fontWeight="600"
          letterSpacing="wide"
          borderRadius="sm"
          px="2"
          py="1"
          flexShrink={0}
          minW="9"
          textAlign="center"
        >
          {extensionBadge(item.name)}
        </Box>

        <VStack align="flex-start" gap="1" minW="0" flex="1">
          <Text fontSize="sm" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
            {item.name}
          </Text>

          {failed ? (
            <Text fontSize="xs" color="danger">
              {item.errorMessage ?? 'Echec du depot'}
            </Text>
          ) : item.status === 'uploading' ? (
            // Progress must be visible, and readable as a number - a bare
            // bar does not tell a client whether a 20 Mo file is moving.
            <HStack gap="2" w="full" maxW="220px">
              <Box h="1.5" flex="1" bg="border" borderRadius="full" overflow="hidden">
                <Box
                  h="full"
                  bg="primary"
                  borderRadius="full"
                  width={`${item.progress}%`}
                  transition="width 0.2s ease"
                />
              </Box>
              <Text fontSize="xs" color="gray.solid" fontVariantNumeric="tabular-nums" flexShrink={0}>
                {Math.round(item.progress)}%
              </Text>
            </HStack>
          ) : (
            <Text fontSize="xs" color="gray.solid">
              {formatBytes(item.size)}
            </Text>
          )}
        </VStack>
      </HStack>

      <Box flexShrink={0}>
        {item.status === 'done' && (
          <Box color="success" fontSize="lg" aria-label="Piece deposee" role="img">
            <FiCheck />
          </Box>
        )}
        {failed && (
          <HStack
            as="button"
            onClick={onRetry}
            color="danger"
            fontSize="xs"
            fontWeight="600"
            gap="1.5"
            borderRadius="full"
            px="2.5"
            py="1"
            _hover={{ bg: 'dangerBg' }}
            transition="background-color 0.15s ease"
          >
            <FiRefreshCw aria-hidden /> <Text as="span">Reessayer</Text>
          </HStack>
        )}
      </Box>
    </HStack>
  );
}
