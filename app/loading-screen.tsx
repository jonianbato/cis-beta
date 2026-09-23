"use client";

import { Flex, HStack, Skeleton, Spinner, VStack } from "@chakra-ui/react";

/** Shown while the shell decides whether it can render. Ported from cisv3. */
export default function LoadingScreen() {
  return (
    <Flex height="100vh" bg="gray.50">
      {/* Sidebar skeleton */}
      <VStack
        w="260px"
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        p={4}
        gap={4}
        align="stretch"
      >
        <Skeleton height="40px" width="70%" />
        <Skeleton height="30px" />
        <Skeleton height="30px" />
        <Skeleton height="30px" />
        <Skeleton height="30px" />
      </VStack>

      {/* Main skeleton */}
      <VStack flex="1" gap={4} p={6} align="stretch">
        <HStack justify="space-between">
          <Skeleton height="30px" width="200px" />
          <HStack>
            <Skeleton height="30px" width="100px" />
            <Skeleton height="30px" width="100px" />
          </HStack>
        </HStack>

        <Skeleton height="40px" width="250px" />

        <Flex gap={4} wrap="wrap">
          <Skeleton height="120px" flex="1" minW="200px" />
          <Skeleton height="120px" flex="1" minW="200px" />
          <Skeleton height="120px" flex="1" minW="200px" />
        </Flex>

        <VStack gap={3} align="stretch" mt={4}>
          <Skeleton height="20px" />
          <Skeleton height="20px" />
          <Skeleton height="20px" />
        </VStack>

        <Flex justify="center" mt={6}>
          <Spinner color="green.500" />
        </Flex>
      </VStack>
    </Flex>
  );
}
