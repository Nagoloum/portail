import { Box, Button, Container, HStack, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { clearLawyerToken } from '../api/client';

export function LawyerLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <Box minH="100dvh" bg="accentBg">
      <Box bg="white" borderBottomWidth="1px" borderColor="border">
        <Container maxW="4xl" py="4">
          <HStack justify="space-between">
            <Text fontWeight="600" fontSize="md" letterSpacing="tight">
              Portail de depot
            </Text>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearLawyerToken();
                navigate('/login');
              }}
            >
              Se deconnecter
            </Button>
          </HStack>
        </Container>
      </Box>
      <Container maxW="4xl" py={{ base: '6', md: '10' }} px={{ base: '4', md: '6' }}>
        {children}
      </Container>
    </Box>
  );
}
