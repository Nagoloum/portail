import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <Box minH="100dvh" bg="accentBg" display="flex" alignItems="center" justifyContent="center" px="4">
      <VStack gap="3" textAlign="center">
        <Text fontSize="2xl" fontWeight="600">
          404
        </Text>
        <Text color="gray.solid">Cette page n'existe pas.</Text>
        <RouterLink to="/">
          <Button variant="outline" size="sm">
            Retour a l'accueil
          </Button>
        </RouterLink>
      </VStack>
    </Box>
  );
}
