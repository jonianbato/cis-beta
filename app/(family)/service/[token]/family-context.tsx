"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  BookOpen,
  FileText,
  House,
  Info,
  LifeBuoy,
  ReceiptText,
} from "lucide-react";
import {
  AppLayout,
  type AppUser,
  type NavItem,
  type NotificationDataProps,
} from "osp-ui-kit";
import { getServiceHome, type ServiceHome } from "./actions";
import { Verification } from "./verification";

/** The steps after the toe tag, as the bell lists them while they wait. */
const PENDING_STEPS: { id: "embalm" | "casket"; title: string }[] = [
  { id: "embalm", title: "Confirm embalming outcome & casket design" },
  { id: "casket", title: "Confirm casket before viewing" },
];

export const FAMILY_DOCS = [
  {
    id: "dc",
    name: "Death certificate",
    sub: "Municipal Form 103, signed by attending physician",
  },
  {
    id: "id",
    name: "Contracting party's valid ID",
    sub: "Government-issued, front and back",
  },
  { id: "rel", name: "Proof of relationship", sub: "Birth or marriage certificate" },
];

type FamilySession = {
  token: string;
  /** What the family typed, re-sent with every call so the server re-checks it. */
  lastName: string;
  home: ServiceHome;
  refresh: () => Promise<void>;
  signOut: () => void;
};

const FamilyContext = createContext<FamilySession | null>(null);

/** The verified session. Only the pages inside the shell can reach it. */
export function useFamily(): FamilySession {
  const session = useContext(FamilyContext);
  if (!session) throw new Error("useFamily is used outside the family shell.");
  return session;
}

/**
 * Holds the family's session across the service home and its sections, so
 * moving between them keeps it. Until the toe tag is confirmed only the
 * verification flow shows; after that the sections open inside the app's own
 * layout, with its sidebar, bottom bar and profile.
 */
export function FamilyProvider({
  token,
  children,
}: {
  token: string;
  children: ReactNode;
}) {
  const [lastName, setLastName] = useState("");
  const [home, setHome] = useState<ServiceHome | null>(null);

  const refresh = useCallback(async () => {
    const result = await getServiceHome(token, lastName);
    if (result.ok) setHome(result.home);
  }, [token, lastName]);

  const signOut = useCallback(() => {
    setHome(null);
    setLastName("");
  }, []);

  const session = useMemo<FamilySession | null>(
    () => (home ? { token, lastName, home, refresh, signOut } : null),
    [token, lastName, home, refresh, signOut],
  );

  if (!session)
    return (
      <Verification
        token={token}
        onOpened={(name, opened) => {
          setLastName(name);
          setHome(opened);
        }}
      />
    );

  return (
    <FamilyContext.Provider value={session}>
      <FamilyShell session={session}>{children}</FamilyShell>
    </FamilyContext.Provider>
  );
}

function FamilyShell({
  session,
  children,
}: {
  session: FamilySession;
  children: ReactNode;
}) {
  const { token, home } = session;
  const base = `/service/${token}`;

  const navItems = useMemo<NavItem[]>(
    () => [
      { label: "Home", icon: House, href: base, bottomNav: true, bottomNavOrder: 0 },
      { label: "Memorial Service Info", icon: Info, href: `${base}/info` },
      { label: "SOA", icon: ReceiptText, href: `${base}/soa` },
      { label: "Documents", icon: FileText, href: `${base}/documents` },
      { label: "Obituary", icon: BookOpen, href: `${base}/obituary` },
      { label: "Support", icon: LifeBuoy, href: `${base}/support` },
    ],
    [base],
  );

  // The contracting party is who the link was sent to, so the shell's header
  // and profile show them.
  const profile = Object.fromEntries(home.profile);
  const user: AppUser = {
    id: home.caseId,
    displayName: profile.Name,
    position: `Contracting party · ${profile.Relationship ?? "Family"}`,
    status: "Active",
  };

  // What still waits on the family: the next step, and any document unsent.
  const nextStep = PENDING_STEPS.find((step) => !home.done[step.id]);
  const notifications: NotificationDataProps[] = [
    ...(nextStep
      ? [
          {
            id: 1,
            title: "Action needed",
            description: nextStep.title,
            type: "approval" as const,
            timestamp: "Now",
            read: false,
          },
        ]
      : []),
    ...FAMILY_DOCS.filter((doc) => !home.docs[doc.id]).map((doc, index) => ({
      id: 10 + index,
      title: "Document required",
      description: doc.name,
      type: "document" as const,
      timestamp: "Pending",
      read: false,
    })),
  ];

  return (
    <AppLayout
      appName="One St. Peter"
      appSubtitle="Family Service Link"
      navItems={navItems}
      user={user}
      notifications={notifications}
      // The shell routes to /login after signing out; leaving the page for the
      // link itself keeps the family on their own service instead.
      onSignOut={() => {
        session.signOut();
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the kit's sign-out contract: a router push would lose to its own /login redirect
        window.location.assign(base);
      }}>
      {children}
    </AppLayout>
  );
}
