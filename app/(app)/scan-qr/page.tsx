import PersonnelScan from "./personnel-scan";

/**
 * The scan facility is the whole personnel flow rather than a single reader:
 * matching two documents against each other, and running a retrieval or
 * embalming step by step. All of it is client state, so the route itself is
 * only the mount point.
 */
export default function ScanQrPage() {
  return <PersonnelScan />;
}
