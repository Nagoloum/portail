import { Box, Button, Heading, HStack, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { FiCheck, FiPlus } from 'react-icons/fi';
import { createRequest, listRequests } from '../api/requests';
import { CreateRequestResult } from '../api/types';
import { LawyerLayout } from '../components/LawyerLayout';
import { RequestCard } from '../components/RequestCard';
import { EmptyState } from '../components/EmptyState';
import { Alert } from '../components/Alert';
import { TextField } from '../components/TextField';
import { GeneratedLinkCard } from '../components/GeneratedLinkCard';
import { Modal } from '../components/Modal';
import { Reveal } from '../components/Reveal';

type Step = 'form' | 'created';

export function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: requests, isLoading, isError } = useQuery({ queryKey: ['requests'], queryFn: listRequests });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('form');
  const [title, setTitle] = useState('');
  const [requiredCount, setRequiredCount] = useState(1);
  const [expiresInDays, setExpiresInDays] = useState(7);
  const [created, setCreated] = useState<CreateRequestResult | null>(null);

  const mutation = useMutation({
    mutationFn: () => createRequest({ title, requiredCount, expiresInDays }),
    onSuccess: (result) => {
      setCreated(result);
      setStep('created');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
    },
  });

  const openForm = () => {
    setTitle('');
    setRequiredCount(1);
    setExpiresInDays(7);
    setCreated(null);
    mutation.reset();
    setStep('form');
    setOpen(true);
  };

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
          <Button onClick={openForm}>
            <FiPlus aria-hidden /> Creer une demande
          </Button>
        </HStack>

        {isLoading && (
          <HStack justify="center" py="12" color="gray.solid">
            <Spinner size="sm" /> <Text fontSize="sm">Chargement...</Text>
          </HStack>
        )}

        {isError && <Alert>Impossible de charger vos demandes. Reessayez.</Alert>}

        {!isLoading && !isError && requests?.length === 0 && (
          <EmptyState
            title="Aucune demande en cours"
            description="Creez une demande pour recevoir les pieces de votre client."
            action={
              <Button onClick={openForm}>
                <FiPlus aria-hidden /> Creer une demande
              </Button>
            }
          />
        )}

        {!isLoading && !isError && requests && requests.length > 0 && (
          <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
            {requests.map((request, i) => (
              <Reveal key={request.id} delayMs={i * 40}>
                <RequestCard request={request} />
              </Reveal>
            ))}
          </SimpleGrid>
        )}
      </VStack>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={step === 'form' ? 'Nouvelle demande' : 'Demande creee'}
        description={step === 'form' ? 'Le lien et le code PIN sont generes a la creation.' : undefined}
      >
        {step === 'form' ? (
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
                  label="Pieces attendues"
                  type="number"
                  min={1}
                  max={50}
                  value={requiredCount}
                  onChange={(e) => setRequiredCount(Number(e.target.value))}
                  fieldProps={{ flex: '1', minW: '36' }}
                />
                <TextField
                  label="Validite (jours)"
                  type="number"
                  min={1}
                  max={90}
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                  fieldProps={{ flex: '1', minW: '36' }}
                />
              </HStack>

              {mutation.isError && <Alert>La creation a echoue. Reessayez.</Alert>}

              <HStack justify="flex-end" gap="2" wrap="wrap">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? 'Creation...' : 'Creer la demande'}
                </Button>
              </HStack>
            </VStack>
          </form>
        ) : (
          created && (
            <VStack align="stretch" gap="4">
              <VStack gap="2" py="1">
                <Box
                  w="12"
                  h="12"
                  borderRadius="full"
                  bg="successBg"
                  color="success"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xl"
                  animation="portail-confirm-pop 0.45s cubic-bezier(0.22, 1, 0.36, 1)"
                >
                  <FiCheck aria-hidden />
                </Box>
                <Text fontSize="sm" color="gray.solid" textAlign="center">
                  Le code PIN n'est affiche qu'une seule fois.
                </Text>
              </VStack>

              <GeneratedLinkCard link={created.link} pin={created.pin} expiresAt={created.expiresAt} />

              <Button alignSelf="flex-end" onClick={() => setOpen(false)}>
                Termine
              </Button>
            </VStack>
          )
        )}
      </Modal>
    </LawyerLayout>
  );
}
