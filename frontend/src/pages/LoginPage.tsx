import { Box, Button, Text, VStack } from '@chakra-ui/react';
import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { setLawyerToken } from '../api/client';
import { TextField } from '../components/TextField';
import { Card } from '../components/Card';
import { RevealOnMount } from '../components/RevealOnMount';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('avocat@demo.dev');
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
      <RevealOnMount w="full" maxW="sm">
        <Card p={{ base: '6', md: '8' }}>
          <form onSubmit={handleSubmit}>
            <VStack align="stretch" gap="5">
              <VStack align="stretch" gap="1">
                <Text fontSize="lg" fontWeight="600">
                  Portail de depot de pieces
                </Text>
                <Text fontSize="sm" color="gray.solid">
                  Espace avocat
                </Text>
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

              {error && (
                <Box bg="dangerBg" color="danger" borderRadius="md" px="3" py="2" fontSize="sm">
                  {error}
                </Box>
              )}

              <Button type="submit" w="full" disabled={loading}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>

              <Text fontSize="xs" color="gray.solid" textAlign="center">
                Demo: avocat@demo.dev / Demo1234!
              </Text>
            </VStack>
          </form>
        </Card>
      </RevealOnMount>
    </Box>
  );
}
