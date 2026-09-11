import { Box, HStack, Spinner, Text, VStack } from '@chakra-ui/react';
import { FiAlertCircle, FiCheck, FiRefreshCw } from 'react-icons/fi';
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

export function FileRow({ item, onRetry }: { item: UploadItem; onRetry?: () => void }) {
  return (
    <HStack
      justify="space-between"
      align="center"
      bg="white"
      borderWidth="1px"
      borderColor="border"
      borderRadius="md"
      px="3"
      py="2.5"
      gap="3"
    >
      <HStack gap="3" minW="0" flex="1">
        <Box
          bg="accentBg"
          color="primary"
          fontSize="xs"
          fontWeight="600"
          borderRadius="sm"
          px="2"
          py="1"
          flexShrink={0}
        >
          {extensionBadge(item.name)}
        </Box>
        <VStack align="flex-start" gap="0.5" minW="0" flex="1">
          <Text fontSize="sm" fontWeight="500" overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" w="full">
            {item.name}
          </Text>
          {item.status === 'error' ? (
            <Text fontSize="xs" color="danger">
              {item.errorMessage ?? 'Echec du depot'}
            </Text>
          ) : item.status === 'uploading' ? (
            <Box w="full" maxW="180px" h="1.5" bg="border" borderRadius="full" overflow="hidden">
              <Box h="full" bg="primary" borderRadius="full" width={`${item.progress}%`} transition="width 0.2s ease" />
            </Box>
          ) : (
            <Text fontSize="xs" color="gray.solid">
              {formatBytes(item.size)}
            </Text>
          )}
        </VStack>
      </HStack>

      <Box flexShrink={0}>
        {item.status === 'uploading' && <Spinner size="sm" color="primary" />}
        {item.status === 'done' && (
          <Box color="success" fontSize="lg">
            <FiCheck />
          </Box>
        )}
        {item.status === 'error' && (
          <HStack
            as="button"
            onClick={onRetry}
            color="danger"
            fontSize="sm"
            gap="1"
            _hover={{ color: 'primary' }}
          >
            <FiAlertCircle /> <FiRefreshCw />
          </HStack>
        )}
      </Box>
    </HStack>
  );
}
