import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import axios from 'axios';
import { useState } from 'react';
import { Dropzone } from '../components/Dropzone';
import { FileRow, UploadItem } from '../components/FileRow';
import { StatusBadge } from '../components/StatusBadge';
import { RevealOnMount } from '../components/RevealOnMount';
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

function uploadErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    if (err.response?.status === 422) return err.response.data?.message ?? 'Type de fichier non autorise';
    if (err.response?.status === 409 || err.response?.status === 410) return 'Ce depot n\'accepte plus de pieces';
    if (err.response?.status === 413) return 'Fichier trop volumineux (20 Mo maximum)';
  }
  return 'Echec du depot, reessayez';
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
            errorMessage: 'Format non autorise (PDF, JPG ou PNG uniquement)',
          },
        }));
        continue;
      }
      if (file.size > MAX_SIZE) {
        setUploads((prev) => ({
          ...prev,
          [id]: { id, file, name: file.name, size: file.size, progress: 0, status: 'error', errorMessage: 'Fichier trop volumineux (20 Mo maximum)' },
        }));
        continue;
      }
      startUpload(id, file);
    }
  };

  const pendingItems = Object.values(uploads);

  return (
    <Box minH="100dvh" bg="accentBg" py={{ base: '6', md: '10' }} px="4">
      <RevealOnMount maxW="lg" mx="auto">
        <VStack align="stretch" gap="5">
          <VStack align="stretch" gap="2" bg="white" borderWidth="1px" borderColor="border" borderRadius="lg" p="5">
            <HStack justify="space-between" align="flex-start" wrap="wrap" gap="2">
              <Heading size="md">{view.title}</Heading>
              <StatusBadge status={view.status} />
            </HStack>
            <Text fontSize="sm" color="gray.solid">
              {view.uploadedCount} piece{view.uploadedCount > 1 ? 's' : ''} sur {view.requiredCount} - expire le{' '}
              {formatDateFr(view.expiresAt)}
            </Text>
          </VStack>

          {view.status === 'COMPLETE' && (
            <Box bg="successBg" color="success" borderRadius="md" px="4" py="3" fontSize="sm" textAlign="center">
              Toutes les pieces demandees ont ete deposees. Merci.
            </Box>
          )}
          {view.status === 'EXPIRED' && (
            <Box bg="dangerBg" color="danger" borderRadius="md" px="4" py="3" fontSize="sm" textAlign="center">
              Ce lien a expire. Contactez votre avocat pour en obtenir un nouveau.
            </Box>
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
      </RevealOnMount>
    </Box>
  );
}
