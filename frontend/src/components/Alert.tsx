import { Box, HStack, Text } from '@chakra-ui/react';
import { IconType } from 'react-icons';
import { FiAlertCircle, FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';

export type AlertTone = 'danger' | 'warning' | 'info' | 'success';

const TONES: Record<AlertTone, { fg: string; bg: string; Icon: IconType }> = {
  danger: { fg: 'danger', bg: 'dangerBg', Icon: FiAlertCircle },
  warning: { fg: 'warning', bg: 'warningBg', Icon: FiAlertTriangle },
  info: { fg: 'info', bg: 'infoBg', Icon: FiInfo },
  success: { fg: 'success', bg: 'successBg', Icon: FiCheckCircle },
};

/**
 * The single way this app tells the user something went wrong.
 *
 * It only ever renders text this codebase wrote. Server responses are
 * mapped to one of these messages by the caller and never rendered
 * verbatim: an API message can carry a field name, an entity name or a
 * stack fragment, which tells an attacker about the internals and tells
 * a client nothing useful.
 */
export function Alert({
  tone = 'danger',
  title,
  children,
}: {
  tone?: AlertTone;
  title?: string;
  children: React.ReactNode;
}) {
  const { fg, bg, Icon } = TONES[tone];

  return (
    <HStack
      role="status"
      align="flex-start"
      gap="2.5"
      bg={bg}
      color={fg}
      borderRadius="md"
      px="3.5"
      py="2.5"
      fontSize="sm"
    >
      <Box pt="0.5" flexShrink={0} fontSize="md" lineHeight="0">
        <Icon aria-hidden />
      </Box>
      <Box minW="0">
        {title && (
          <Text fontWeight="600" mb="0.5">
            {title}
          </Text>
        )}
        <Text>{children}</Text>
      </Box>
    </HStack>
  );
}
