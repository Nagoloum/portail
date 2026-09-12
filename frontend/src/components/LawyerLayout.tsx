import { Box, Button, Container, HStack, Text } from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ReactNode } from 'react';
import { FiFolder, FiLogOut } from 'react-icons/fi';
import { clearLawyerToken } from '../api/client';

export function LawyerLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  return (
    <Box minH="100dvh" bg="accentBg">
      <Box bg="white" borderBottomWidth="1px" borderColor="border" position="sticky" top="0" zIndex="10">
        <Container maxW="4xl" py="4" px={{ base: '4', md: '6' }}>
          <HStack justify="space-between" gap="3">
            <HStack gap="2.5" minW="0">
              {/* Functional mark, not an illustration: the brand tone is
                  formal and technical - no characters, no mascot. */}
              <Box
                w="8"
                h="8"
                borderRadius="md"
                bg="primary"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="sm"
                flexShrink={0}
              >
                <FiFolder aria-hidden />
              </Box>
              <Text
                fontWeight="600"
                fontSize="md"
                letterSpacing="tight"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                Portail de depot
              </Text>
            </HStack>
            <Button
              variant="ghost"
              size="sm"
              flexShrink={0}
              onClick={() => {
                clearLawyerToken();
                navigate('/login');
              }}
            >
              <FiLogOut aria-hidden />
              <Box as="span" display={{ base: 'none', sm: 'inline' }}>
                Se deconnecter
              </Box>
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
