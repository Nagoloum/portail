import { Box, Text, VStack } from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { FiUploadCloud } from 'react-icons/fi';

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFiles, disabled }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return;
    onFiles(Array.from(fileList));
  };

  return (
    <Box
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => !disabled && inputRef.current?.click()}
      borderWidth="1px"
      borderStyle="dashed"
      borderColor={dragging ? 'primary' : 'border'}
      bg={dragging ? 'accentBg' : 'white'}
      borderRadius="lg"
      p="8"
      textAlign="center"
      cursor={disabled ? 'not-allowed' : 'pointer'}
      opacity={disabled ? 0.5 : 1}
      transition="background-color 0.15s ease, border-color 0.15s ease"
      _hover={disabled ? undefined : { bg: 'accentBg', borderColor: 'primary' }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="application/pdf,image/jpeg,image/png"
        hidden
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
      <VStack gap="2">
        <Box color="primary" fontSize="2xl">
          <FiUploadCloud />
        </Box>
        <Text fontWeight="600">Depose tes pieces ici</Text>
        <Text fontSize="xs" color="gray.solid">
          PDF, JPG ou PNG, 20 Mo maximum par fichier
        </Text>
      </VStack>
    </Box>
  );
}
