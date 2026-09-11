import { Box, BoxProps } from '@chakra-ui/react';

/** The one card style used across the app: white, 1px border, 12px radius, no shadow. */
export function Card(props: BoxProps) {
  return <Box bg="white" borderWidth="1px" borderColor="border" borderRadius="lg" {...props} />;
}
