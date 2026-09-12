import { Box, Button, Text, VStack } from '@chakra-ui/react';
import axios from 'axios';
import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import { PinInput } from '../components/PinInput';
import { Card } from '../components/Card';
import { Alert } from '../components/Alert';
import { Reveal } from '../components/Reveal';
import { unlock } from '../api/public';
import { PublicRequestView } from '../api/types';

interface PublicUnlockPageProps {
  token: string;
  onUnlocked: (view: PublicRequestView) => void;
}

type ScreenError = { kind: 'not_found' | 'expired' | 'locked' | 'invalid' | 'unknown'; message: string };

function toScreenError(err: unknown): ScreenError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status;
    if (status === 404) return { kind: 'not_found', message: 'Ce lien de depot n\'existe pas.' };
    if (status === 410) return { kind: 'expired', message: 'Ce lien a expire.' };
    if (status === 423) return { kind: 'locked', message: 'Trop de tentatives. Reessayez dans quelques minutes.' };
    if (status === 401) return { kind: 'invalid', message: 'Code PIN invalide.' };
  }
  return { kind: 'unknown', message: 'Une erreur est survenue, reessayez.' };
}

export function PublicUnlockPage({ token, onUnlocked }: PublicUnlockPageProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ScreenError | null>(null);

  const submit = async (value: string) => {
    setLoading(true);
    setError(null);
    try {
      const view = await unlock(token, value);
      onUnlocked(view);
    } catch (err) {
      setError(toScreenError(err));
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const blocked = error?.kind === 'not_found' || error?.kind === 'expired' || error?.kind === 'locked';

  return (
    <Box minH="100dvh" bg="accentBg" display="flex" alignItems="center" justifyContent="center" px="4">
      <Reveal w="full" maxW="sm">
        <Card p={{ base: '6', md: '8' }}>
          <VStack align="stretch" gap="5">
            <VStack align="stretch" gap="3">
              <Box
                w="10"
                h="10"
                borderRadius="md"
                bg="accentBg"
                color="primary"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="lg"
              >
                <FiLock aria-hidden />
              </Box>
              <VStack align="stretch" gap="1">
                <Text fontSize="lg" fontWeight="600">
                  Depot de pieces
                </Text>
                <Text fontSize="sm" color="gray.solid">
                  Saisissez le code a 4 chiffres transmis par votre avocat.
                </Text>
              </VStack>
            </VStack>

            {!blocked && (
              <VStack align="center" gap="3">
                <PinInput value={pin} onChange={setPin} onComplete={submit} disabled={loading} error={error?.kind === 'invalid'} />
                <Button onClick={() => submit(pin)} disabled={pin.length !== 4 || loading} w="full">
                  {loading ? 'Verification...' : 'Valider le code'}
                </Button>
              </VStack>
            )}

            {error && (
              <Alert tone={error.kind === 'locked' ? 'warning' : 'danger'}>{error.message}</Alert>
            )}
          </VStack>
        </Card>
      </Reveal>
    </Box>
  );
}
