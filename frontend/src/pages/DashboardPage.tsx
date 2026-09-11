import { Box, Button, Heading, HStack, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { createRequest, listRequests } from '../api/requests';
import { CreateRequestResult } from '../api/types';
import { LawyerLayout } from '../components/LawyerLayout';
import { RequestCard } from '../components/RequestCard';
import { EmptyState } from '../components/EmptyState';
import { Card } from '../components/Card';
import { TextField } from '../components/TextField';
import { GeneratedLinkCard } from '../components/GeneratedLinkCard';
import { RevealOnMount } from '../components/RevealOnMount';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading, isError } = useQuery({ queryKey: ['requests'], queryFn: listRequests });

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [requiredCount, setRequiredCount] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [created, setCreated] = useState<CreateRequestResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => createRequest({ title, requiredCount, expiresInDays }),
    onSuccess: (result) => {
      setCreated(result);
      setTitle('');
      setFormOpen(false);
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    mutation.mutate();
  };

  return (
    <LawyerLayout>
      <VStack align="stretch" gap="6">
        <HStack justify="space-between" wrap="wrap" gap="3">
          <Heading size="lg">Vos demandes</Heading>
          {!formOpen && (
            <Button
              onClick={() => {
                setCreated(null);
                setFormOpen(true);
              }}
            >
              <FiPlus /> Creer une demande
            </Button>
          )}
        </HStack>

        {formOpen && (
          <RevealOnMount>
            <Card p="5">
              <form onSubmit={handleSubmit}>
                <VStack align="stretch" gap="4">
                  <TextField
                    label="Intitule du dossier"
                    placeholder="Dossier Martin, pieces 2026"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    required
                  />
                  <HStack gap="4" align="flex-start" wrap="wrap">
                    <TextField
                      label="Nombre de pieces attendues"
                      type="number"
                      min={1}
                      max={50}
                      value={requiredCount}
                      onChange={(e) => setRequiredCount(Number(e.target.value))}
                      w="auto"
                    />
                    <TextField
                      label="Duree de validite (jours)"
                      type="number"
                      min={1}
                      max={90}
                      value={expiresInDays}
                      onChange={(e) => setExpiresInDays(Number(e.target.value))}
                      w="auto"
                    />
                  </HStack>
                  {mutation.isError && (
                    <Text fontSize="sm" color="danger">
                      La creation a echoue, reessayez.
                    </Text>
                  )}
                  <HStack>
                    <Button type="submit" disabled={mutation.isPending}>
                      {mutation.isPending ? 'Creation...' : 'Creer la demande'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                      Annuler
                    </Button>
                  </HStack>
                </VStack>
              </form>
            </Card>
          </RevealOnMount>
        )}

        {created && (
          <RevealOnMount>
            <GeneratedLinkCard link={created.link} pin={created.pin} expiresAt={created.expiresAt} />
          </RevealOnMount>
        )}

        {isLoading && (
          <HStack justify="center" py="12" color="gray.solid">
            <Spinner size="sm" /> <Text fontSize="sm">Chargement des demandes...</Text>
          </HStack>
        )}

        {isError && (
          <Box bg="dangerBg" color="danger" borderRadius="md" px="4" py="3" fontSize="sm">
            Impossible de charger vos demandes. Verifiez votre connexion et reessayez.
          </Box>
        )}

        {!isLoading && !isError && requests && requests.length === 0 && (
          <EmptyState
            title="Aucune demande en cours"
            description="Cree une demande pour recevoir des pieces de ton client."
            action={<Button onClick={() => setFormOpen(true)}>Creer une demande</Button>}
          />
        )}

        {!isLoading && !isError && requests && requests.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            {requests.map((request, i) => (
              <RevealOnMount key={request.id} delayMs={i * 40}>
                <RequestCard request={request} />
              </RevealOnMount>
            ))}
          </SimpleGrid>
        )}
      </VStack>
    </LawyerLayout>
  );
}
