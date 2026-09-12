import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';
import { FiArrowLeft, FiSearch } from 'react-icons/fi';
import { Reveal } from '../components/Reveal';

/**
 * Catches two very different visitors, so it says nothing about which
 * one you are: a lawyer who mistyped a path, and someone probing for a
 * deposit link. It therefore never hints at whether a link exists,
 * expired, or was never issued - that answer belongs behind the PIN.
 */
export function NotFoundPage() {
  return (
    <Box minH="100dvh" bg="accentBg" display="flex" alignItems="center" justifyContent="center" px="4">
      <Reveal w="full" maxW="sm">
        <VStack
          gap="5"
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
            bg="accentBg"
            color="primary"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="xl"
          >
            <FiSearch aria-hidden />
          </Box>

          <VStack gap="1.5">
            <Text fontSize="2xl" fontWeight="600" letterSpacing="tight" lineHeight="1">
              404
            </Text>
            <Text fontWeight="600">Cette page n'existe pas</Text>
            <Text fontSize="sm" color="gray.solid">
              Le lien est peut-etre incomplet. Verifiez l'adresse recue, ou demandez-en une nouvelle a votre
              avocat.
            </Text>
          </VStack>

          <RouterLink to="/">
            <Button variant="outline" size="sm">
              <HStack gap="1.5">
                <FiArrowLeft aria-hidden />
                <Text as="span">Retour a l'accueil</Text>
              </HStack>
            </Button>
          </RouterLink>
        </VStack>
      </Reveal>
    </Box>
  );
}
