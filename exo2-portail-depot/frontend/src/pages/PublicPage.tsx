import { Box, Spinner, Text, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPublicSession, getStatus } from '../api/public';
import { PublicRequestView } from '../api/types';
import { PublicUnlockPage } from './PublicUnlockPage';
import { PublicDepositPage } from './PublicDepositPage';

export function PublicPage() {
  const { token } = useParams<{ token: string }>();
  const [view, setView] = useState<PublicRequestView | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    if (!token) return;
    if (!getPublicSession(token)) {
      setCheckingSession(false);
      return;
    }
    getStatus(token)
      .then(setView)
      .catch(() => setView(null))
      .finally(() => setCheckingSession(false));
  }, [token]);

  if (!token) {
    return null;
  }

  if (checkingSession) {
    return (
      <Box minH="100dvh" bg="accentBg" display="flex" alignItems="center" justifyContent="center">
        <VStack color="gray.solid">
          <Spinner size="sm" />
          <Text fontSize="sm">Chargement...</Text>
        </VStack>
      </Box>
    );
  }

  if (!view) {
    return <PublicUnlockPage token={token} onUnlocked={setView} />;
  }

  return <PublicDepositPage token={token} view={view} onViewChange={setView} />;
}
