import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFolder } from 'react-icons/fi';
import { login } from '../api/auth';
import { setLawyerToken } from '../api/client';
import { TextField } from '../components/TextField';
import { Card } from '../components/Card';
import { Alert } from '../components/Alert';
import { Reveal } from '../components/Reveal';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { accessToken } = await login(email, password);
      setLawyerToken(accessToken);
      navigate('/');
    } catch {
      setError('Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100dvh" bg="accentBg" display="flex" alignItems="center" justifyContent="center" px="4">
      <Reveal w="full" maxW="sm">
        <Card p={{ base: '6', md: '8' }}>
          <form onSubmit={handleSubmit}>
            <VStack align="stretch" gap="5">
              <VStack align="stretch" gap="3">
                <Box
                  w="10"
                  h="10"
                  borderRadius="md"
                  bg="primary"
                  color="white"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="lg"
                >
                  <FiFolder aria-hidden />
                </Box>
                <VStack align="stretch" gap="1">
                  <Text fontSize="lg" fontWeight="600">
                    Portail de depot de pieces
                  </Text>
                  <Text fontSize="sm" color="gray.solid">
                    Espace avocat
                  </Text>
                </VStack>
              </VStack>

              <TextField
                label="Adresse email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
              <TextField
                label="Mot de passe"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              {error && <Alert>{error}</Alert>}

              <Button type="submit" w="full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>
              {/* The demo credentials live in the README and in the
                  install.sh summary, not on the login screen: printing a
                  working account on the page is the one piece of sensitive
                  text an interface should never carry. */}
            </VStack>
          </form>
        </Card>
      </Reveal>
    </Box>
  );
}
