import { Box, Text, VStack } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiPlus } from 'react-icons/fi';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

/** Never leave a blank screen unexplained - see brief "etat vide". */
export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <VStack
      gap="4"
      py="16"
      px="6"
      textAlign="center"
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      borderStyle="dashed"
    >
      <Box
        w="12"
        h="12"
        borderRadius="full"
        bg="accentBg"
        color="primary"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xl"
      >
        <FiPlus />
      </Box>
      <VStack gap="1">
        <Text fontWeight="600" fontSize="md">
          {title}
        </Text>
        <Text color="gray.solid" fontSize="sm" maxW="sm">
          {description}
        </Text>
      </VStack>
      {action}
    </VStack>
  );
}
