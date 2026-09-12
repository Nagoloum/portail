import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { Component, ErrorInfo, ReactNode } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';

/**
 * Last line of defence for the interface. Without it, a render error
 * unmounts the tree and the client is left staring at a white page -
 * the worst possible outcome for someone who was mid-upload.
 *
 * The error itself never reaches the screen: it goes to the console for
 * whoever is debugging, while the user gets a plain sentence and a way
 * out. A stack trace on screen tells a client nothing and tells an
 * attacker about our internals.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  state = { crashed: false };

  static getDerivedStateFromError() {
    return { crashed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ui] rendu interrompu', error, info.componentStack);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <Box minH="100dvh" bg="accentBg" display="flex" alignItems="center" justifyContent="center" px="4">
        <VStack
          gap="4"
          maxW="sm"
          textAlign="center"
          bg="white"
          borderWidth="1px"
          borderColor="border"
          borderRadius="lg"
          px="6"
          py="10"
        >
          <Box
            w="12"
            h="12"
            borderRadius="full"
            bg="warningBg"
            color="warning"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xl"
          >
            <FiAlertTriangle aria-hidden />
          </Box>
          <VStack gap="1">
            <Text fontWeight="600">L'affichage a ete interrompu</Text>
            <Text fontSize="sm" color="gray.solid">
              Rechargez la page. Vos pieces deja deposees sont conservees.
            </Text>
          </VStack>
          <Button onClick={() => window.location.reload()}>Recharger</Button>
        </VStack>
      </Box>
    );
  }
}
