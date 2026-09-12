import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import axios from 'axios';
import { useState } from 'react';
import { FiClock } from 'react-icons/fi';
import { Dropzone } from '../components/Dropzone';
import { CountPill } from '../components/CountPill';
import { Alert } from '../components/Alert';
import { FileRow, UploadItem } from '../components/FileRow';
import { StatusBadge } from '../components/StatusBadge';
import { Reveal } from '../components/Reveal';
import { uploadFile } from '../api/public';
import { PublicRequestView } from '../api/types';
import { formatDateFr } from '../utils/format';

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

interface PublicDepositPageProps {
  token: string;
  view: PublicRequestView;
  onViewChange: (view: PublicRequestView) => void;
}

/**
 * Maps a status code to a sentence written here. The server's own
 * `message` is deliberately ignored: it is written for an API client,
 * can name an internal rule or entity, and would be shown verbatim to a
 * client who can do nothing with it. One status, one sentence.
 */
function uploadErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    switch (err.response?.status) {
      case 422:
        return 'Format refuse. PDF, JPG ou PNG uniquement.';
      case 413:
        return 'Fichier trop volumineux. 20 Mo maximum.';
      case 409:
      case 410:
        return 'Ce depot n\'accepte plus de pieces.';
      case 401:
      case 403:
        return 'Session expiree. Ressaisissez le code PIN.';
      default:
        if (!err.response) return 'Connexion interrompue. Reessayez.';
    }
  }
  return 'Le depot a echoue. Reessayez.';
}

export function PublicDepositPage({ token, view, onViewChange }: PublicDepositPageProps) {
  const [uploads, setUploads] = useState<Record<string, UploadItem & { file: File }>>({});

  const accepting = view.status === 'PENDING';

  const startUpload = (id: string, file: File) => {
    setUploads((prev) => ({
      ...prev,
      [id]: { id, file, name: file.name, size: file.size, progress: 0, status: 'uploading' },
    }));

    uploadFile(token, file, (progress) => {
      setUploads((prev) => (prev[id] ? { ...prev, [id]: { ...prev[id], progress } } : prev));
    })
      .then((updatedView) => {
        onViewChange(updatedView);
        setUploads((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      })
      .catch((err) => {
        setUploads((prev) => ({
          ...prev,
          [id]: { ...prev[id], status: 'error', errorMessage: uploadErrorMessage(err) },
        }));
      });
  };

  const handleFiles = (files: File[]) => {
    for (const file of files) {
      const id = `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      if (!ALLOWED_TYPES.includes(file.type)) {
        setUploads((prev) => ({
          ...prev,
          [id]: {
            id,
            file,
            name: file.name,
            size: file.size,
            progress: 0,
            status: 'error',
            errorMessage: 'Format refuse. PDF, JPG ou PNG uniquement.',
          },
        }));
        continue;
      }
      if (file.size > MAX_SIZE) {
        setUploads((prev) => ({
          ...prev,
          [id]: { id, file, name: file.name, size: file.size, progress: 0, status: 'error', errorMessage: 'Fichier trop volumineux. 20 Mo maximum.' },
        }));
        continue;
      }
      startUpload(id, file);
    }
  };

  const pendingItems = Object.values(uploads);

  return (
    <Box minH="100dvh" bg="accentBg" py={{ base: '6', md: '10' }} px="4">
      <Reveal maxW="lg" mx="auto">
        <VStack align="stretch" gap="5">
          <VStack align="stretch" gap="2" bg="white" borderWidth="1px" borderColor="border" borderRadius="lg" p="5">
            <HStack justify="space-between" align="flex-start" wrap="wrap" gap="2">
              <Heading size="md">{view.title}</Heading>
              <StatusBadge status={view.status} />
            </HStack>
            <HStack gap="2" wrap="wrap">
              <CountPill uploaded={view.uploadedCount} required={view.requiredCount} />
              <HStack gap="1.5" color="gray.solid" fontSize="xs">
                <FiClock aria-hidden />
                <Text>Expire le {formatDateFr(view.expiresAt)}</Text>
              </HStack>
            </HStack>
          </VStack>

          {view.status === 'COMPLETE' && (
            <Alert tone="success">Toutes les pieces demandees ont ete deposees.</Alert>
          )}
          {view.status === 'EXPIRED' && (
            <Alert>Ce lien a expire. Contactez votre avocat pour en obtenir un nouveau.</Alert>
          )}

          {accepting && <Dropzone onFiles={handleFiles} />}

          {(view.files.length > 0 || pendingItems.length > 0) && (
            <VStack align="stretch" gap="2">
              <Text fontWeight="600" fontSize="sm">
                Pieces deposees
              </Text>
              {pendingItems.map((item) => (
                <FileRow key={item.id} item={item} onRetry={() => startUpload(item.id, item.file)} />
              ))}
              {view.files.map((file) => (
                <FileRow
                  key={file.id}
                  item={{ id: file.id, name: file.originalName, size: file.size, progress: 100, status: 'done' }}
                />
              ))}
            </VStack>
          )}
        </VStack>
      </Reveal>
    </Box>
  );
}
