"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Box, Flex, Input, Link, Stack, Text } from "@chakra-ui/react";
import { Card, Page, PrimaryMdButton, SecondaryMdButton } from "osp-ui-kit";
import { Camera, CameraOff, ImageUp, QrCode } from "lucide-react";
import { useQrScanner } from "@/lib/use-qr-scanner";

/** Anything the browser can actually open from the result card. */
function asOpenableUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export default function ScanQrPage() {
  const [result, setResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const scanner = useQrScanner({ videoRef, onScan: setResult });
  const isBusy = scanner.status !== "idle";
  const resultUrl = result ? asOpenableUrl(result) : null;

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clearing the value lets the same file be picked twice in a row.
    event.target.value = "";
    if (file) void scanner.scanImage(file);
  };

  const scanAgain = () => {
    setResult(null);
    scanner.start();
  };

  return (
    <Page.Root
      title="Scan QR"
      subtitle="Point the camera at a QR code to read it."
      headerButton="back-mobile">
      <Page.MainContent>
        <Stack gap="6" maxW="480px" w="full" mx="auto">
          <Box
            position="relative"
            w="full"
            aspectRatio="1"
            bg="bg.emphasized"
            borderRadius="l3"
            overflow="hidden">
            <video
              ref={videoRef}
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                // The element stays mounted so the ref is ready before start().
                display: scanner.status === "scanning" ? "block" : "none",
              }}
            />

            {scanner.status !== "scanning" && (
              <Flex
                position="absolute"
                inset="0"
                direction="column"
                align="center"
                justify="center"
                gap="3"
                color="fg.muted">
                <QrCode size={48} />
                <Text fontSize="sm">
                  {scanner.status === "starting"
                    ? "Starting the camera…"
                    : "The camera is off."}
                </Text>
              </Flex>
            )}

            {scanner.status === "scanning" && (
              <Box
                position="absolute"
                // A viewfinder, not a crop: detection still reads the whole frame.
                inset="15%"
                border="2px solid"
                borderColor="whiteAlpha.800"
                borderRadius="l2"
                pointerEvents="none"
              />
            )}
          </Box>

          <Flex gap="3" wrap="wrap">
            {isBusy ? (
              <SecondaryMdButton
                flex="1"
                minW="40"
                leftIcon={<CameraOff size={18} />}
                onClick={scanner.stop}>
                Stop camera
              </SecondaryMdButton>
            ) : (
              <PrimaryMdButton
                flex="1"
                minW="40"
                leftIcon={<Camera size={18} />}
                disabled={scanner.isSupported === false}
                onClick={scanner.start}>
                Start scanning
              </PrimaryMdButton>
            )}

            <SecondaryMdButton
              flex="1"
              minW="40"
              leftIcon={<ImageUp size={18} />}
              disabled={scanner.isSupported === false}
              onClick={() => fileInputRef.current?.click()}>
              Scan an image
            </SecondaryMdButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleFile}
            />
          </Flex>

          {scanner.isSupported === false && (
            <Text fontSize="sm" color="fg.error">
              This browser cannot decode QR codes. Open the page in Chrome or
              Edge, or type the code in below.
            </Text>
          )}

          {scanner.error && (
            <Text fontSize="sm" color="fg.error">
              {scanner.error}
            </Text>
          )}

          {result && (
            <Card.Root title="Scanned code">
              <Card.MainContent>
                {/* TODO: hand the value to whatever the chapel flow needs
                    (look up a plan, check a member in) instead of echoing it. */}
                <Text wordBreak="break-all" fontFamily="mono" fontSize="sm">
                  {result}
                </Text>
                {resultUrl && (
                  <Link
                    href={resultUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    fontSize="sm">
                    Open link
                  </Link>
                )}
              </Card.MainContent>
              <Card.ButtonSection>
                <PrimaryMdButton onClick={scanAgain}>Scan again</PrimaryMdButton>
              </Card.ButtonSection>
            </Card.Root>
          )}

          <Stack gap="2">
            <Text fontSize="sm" color="fg.muted">
              Can&apos;t scan? Enter the code manually.
            </Text>
            <Flex gap="3" wrap="wrap">
              <Input
                flex="1"
                minW="40"
                value={manualCode}
                placeholder="Code"
                onChange={(event) => setManualCode(event.target.value)}
              />
              <SecondaryMdButton
                disabled={manualCode.trim() === ""}
                onClick={() => {
                  scanner.stop();
                  setResult(manualCode.trim());
                  setManualCode("");
                }}>
                Use code
              </SecondaryMdButton>
            </Flex>
          </Stack>
        </Stack>
      </Page.MainContent>
    </Page.Root>
  );
}
