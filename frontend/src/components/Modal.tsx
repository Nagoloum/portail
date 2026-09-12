import { Box, Dialog, HStack, Portal, Text } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { FiX } from 'react-icons/fi';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * The one overlay style of the app, built on Chakra v3's Dialog
 * primitives: same card vocabulary as everywhere else (white, 1px
 * border, 12px radius) over a tinted backdrop, and the charte's easing
 * on entry.
 *
 * Dialog.Root gives us what a hand-rolled overlay would get wrong:
 * focus trapping, focus restoration on close, Escape, scroll lock and
 * the aria wiring between title, description and content.
 */
export function Modal({ open, onClose, title, description, children }: ModalProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(e) => {
        if (!e.open) onClose();
      }}
      placement="center"
      motionPreset="none"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop
          bg="rgba(0, 0, 0, 0.45)"
          backdropFilter="blur(2px)"
          animation="portail-overlay-in 0.2s cubic-bezier(0.22, 1, 0.36, 1)"
        />
        <Dialog.Positioner p="4">
          <Dialog.Content
            bg="white"
            borderWidth="1px"
            borderColor="border"
            borderRadius="lg"
            boxShadow="none"
            w="full"
            maxW="md"
            animation="portail-dialog-in 0.28s cubic-bezier(0.22, 1, 0.36, 1)"
          >
            <HStack justify="space-between" align="flex-start" gap="3" px="5" pt="5" pb="1">
              <Box minW="0">
                <Dialog.Title asChild>
                  <Text fontWeight="600" fontSize="md">
                    {title}
                  </Text>
                </Dialog.Title>
                {description && (
                  <Dialog.Description asChild>
                    <Text fontSize="sm" color="gray.solid" mt="1">
                      {description}
                    </Text>
                  </Dialog.Description>
                )}
              </Box>
              <Dialog.CloseTrigger asChild>
                <Box
                  as="button"
                  aria-label="Fermer"
                  color="gray.solid"
                  borderRadius="full"
                  p="1.5"
                  lineHeight="0"
                  flexShrink={0}
                  transition="background-color 0.15s ease, color 0.15s ease"
                  _hover={{ bg: 'accentBg', color: 'primary' }}
                >
                  <FiX />
                </Box>
              </Dialog.CloseTrigger>
            </HStack>

            <Box px="5" pb="5" pt="3">
              {children}
            </Box>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  );
}
