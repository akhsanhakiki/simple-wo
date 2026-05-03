/**
 * Must be used as an Astro island with `client:only="react"` (not `client:load`).
 * HeroUI Select/ComboBox wrap React Aria ListBox; SSR renders ListBox.Item without
 * list state context and throws (cannot read selectionManager of null).
 */
import {
  Button,
  Card,
  ComboBox,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  Radio,
  RadioGroup,
  Select,
  Surface,
  TextField,
  Spinner,
  Switch,
} from "@heroui/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { EmojiStyle, Theme, type EmojiClickData } from "emoji-picker-react";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";

import type { GuestOverviewStats } from "../lib/guest-overview-stats";
import {
  getShiftKeyFromTime,
  getShiftLabelFromInvitationTime,
  SHIFT_OPTIONS,
} from "../lib/guest-shift";
import { OverviewMetrics } from "./OverviewMetrics";

const EmojiPickerLazy = lazy(() => import("emoji-picker-react"));

const INVITATION_TYPE_LABELS: Record<string, string> = {
  physical: "Fisik",
  digital: "Digital",
};

const GUEST_TYPE_LABELS: Record<string, string> = {
  sekaliyan: "Sekaliyan",
  sendiri: "Sendiri",
};

type Guest = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  weddingLocation: string | null;
  invitationTime: string | null;
  invitationType: string | null;
  guestType: string | null;
  guestGroup: string | null;
};

function normalizePhoneForWa(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 9) return null;
  let n = digits;
  if (n.startsWith("62")) {
    /* Indonesia or already international */
  } else if (n.startsWith("0")) {
    n = `62${n.slice(1)}`;
  } else if (n.startsWith("8")) {
    n = `62${n}`;
  }
  if (n.length < 10) return null;
  return n;
}

function formatInvitationTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DEFAULT_INVITATION_TIME: Record<string, string> = {
  Semarang: "2026-07-25T00:00",
  Magetan: "2026-08-01T00:00",
};

const WA_INVITE_TEMPLATE_STORAGE_KEY = "simple-wo:wa-invite-template";

const ADMIN_COOKIE_NAME = "simple_wo_admin";
const ADMIN_COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 14;

/** Demo-only credentials (visible in the client bundle). Replace with real auth for production. */
const ADMIN_LOGIN_USERNAME = "admin";
const ADMIN_LOGIN_PASSWORD = "simplewo";

/** Legacy sessionStorage key; migrated once to cookie on load. */
const LEGACY_ADMIN_SESSION_STORAGE_KEY = "simple-wo:admin-session";

function readAdminCookie(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const prefix = `${ADMIN_COOKIE_NAME}=`;
    for (const part of document.cookie.split(";").map((c) => c.trim())) {
      if (!part.startsWith(prefix)) continue;
      const value = part.slice(prefix.length);
      if (value === "1" || decodeURIComponent(value) === "1") return true;
    }
    return false;
  } catch {
    return false;
  }
}

function writeAdminCookie(): void {
  const secure =
    typeof location !== "undefined" && location.protocol === "https:";
  document.cookie = `${ADMIN_COOKIE_NAME}=1; Path=/; Max-Age=${ADMIN_COOKIE_MAX_AGE_SEC}; SameSite=Lax${secure ? "; Secure" : ""}`;
}

function clearAdminCookie(): void {
  document.cookie = `${ADMIN_COOKIE_NAME}=; Path=/; Max-Age=0`;
}

/** Default WhatsApp body; use {{nama}}, {{lokasi}}, {{shift}}, {{tamu}}, {{undanganDigital}}. */
const DEFAULT_WA_INVITE_TEMPLATE = `Assalamualaikum warahmatullahi wabarakatuh,

Yth. {{nama}},

Dengan hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir pada acara pernikahan kami.

Lokasi acara: {{lokasi}}
Waktu (sesi undangan): {{shift}}
Undangan untuk: {{tamu}}{{undanganDigital}}

Kehadiran Bapak/Ibu/Saudara/i akan melengkapi sukacita kami.

Wassalamualaikum warahmatullahi wabarakatuh`;

function buildDigitalInviteMessage(g: Guest, template: string): string {
  const loc = g.weddingLocation?.trim() || "—";
  const shift = getShiftLabelFromInvitationTime(g.invitationTime);
  const tamu = GUEST_TYPE_LABELS[g.guestType ?? ""] ?? "—";
  const rawUrl =
    typeof import.meta.env.PUBLIC_DIGITAL_INVITATION_URL === "string"
      ? import.meta.env.PUBLIC_DIGITAL_INVITATION_URL.trim()
      : "";
  const undanganDigital = rawUrl ? `\n\nUndangan digital: ${rawUrl}` : "";
  const tpl = template.trim() === "" ? DEFAULT_WA_INVITE_TEMPLATE : template;
  return tpl
    .replaceAll("{{nama}}", g.name.trim())
    .replaceAll("{{lokasi}}", loc)
    .replaceAll("{{shift}}", shift)
    .replaceAll("{{tamu}}", tamu)
    .replaceAll("{{undanganDigital}}", undanganDigital);
}

function applyShiftToInvitationTime(
  currentInvitationTime: string,
  weddingLocation: string,
  shiftKey: string,
): string {
  const base =
    currentInvitationTime || DEFAULT_INVITATION_TIME[weddingLocation] || "";
  const d = base ? new Date(base) : new Date();
  const fallback = Number.isNaN(d.getTime()) ? new Date() : d;
  const opt = SHIFT_OPTIONS.find((s) => s.value === shiftKey);
  const [hours, minutes] = (opt?.startTime ?? "10:00").split(":").map(Number);
  fallback.setHours(hours, minutes, 0, 0);
  return toDatetimeLocal(fallback.toISOString());
}

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);
const TrashIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </svg>
);
const DotsIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="1" />
    <circle cx="12" cy="5" r="1" />
    <circle cx="12" cy="19" r="1" />
  </svg>
);
const WaIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
  </svg>
);

const CloseIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const WaToolbarBold = () => (
  <span className="text-[13px] font-bold leading-none" aria-hidden>
    B
  </span>
);
const WaToolbarItalic = () => (
  <span className="text-[13px] italic font-medium leading-none" aria-hidden>
    I
  </span>
);
const WaToolbarStrike = () => (
  <span
    className="text-[13px] line-through font-medium leading-none"
    aria-hidden
  >
    S
  </span>
);
const WaToolbarCode = () => (
  <span
    className="text-[11px] font-mono font-semibold leading-none"
    aria-hidden
  >
    {"</>"}
  </span>
);
const WaToolbarBlock = () => (
  <span
    className="text-[10px] font-mono font-semibold leading-none"
    aria-hidden
  >
    {"{ }"}
  </span>
);

const EmojiFaceIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    <circle cx="9" cy="9" r="1.25" fill="currentColor" stroke="none" />
    <circle cx="15" cy="9" r="1.25" fill="currentColor" stroke="none" />
  </svg>
);

const ArrowLeftIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const WA_TEMPLATE_PLACEHOLDER_CHIPS: {
  id: string;
  label: string;
  snippet: string;
}[] = [
  { id: "nama", label: "nama", snippet: "{{nama}}" },
  { id: "lokasi", label: "lokasi", snippet: "{{lokasi}}" },
  { id: "shift", label: "shift", snippet: "{{shift}}" },
  { id: "tamu", label: "tamu", snippet: "{{tamu}}" },
  { id: "link", label: "link", snippet: "{{undanganDigital}}" },
];

const LIST_PAGE_SIZE = 15;

const THEME_STORAGE_KEY = "simple-wo:theme";

function readInitialDarkMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "dark") return true;
    if (stored === "light") return false;
  } catch {
    /* ignore */
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function syncDarkClass(isDark: boolean) {
  document.documentElement.classList.toggle("dark", isDark);
}

type GuestsResponse = {
  data: Guest[];
  total: number;
  totalAll: number;
  uniqueLocations: string[];
  guestGroupNames?: string[];
};

type GuestGroupWithCount = {
  id: number;
  name: string;
  guestCount: number;
};

export default function GuestManager() {
  const [listData, setListData] = useState<Guest[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalAll, setTotalAll] = useState(0);
  const [uniqueLocations, setUniqueLocations] = useState<string[]>([]);
  const [guestGroupNames, setGuestGroupNames] = useState<string[]>([]);
  const [groupsList, setGroupsList] = useState<GuestGroupWithCount[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addGroupSubmitting, setAddGroupSubmitting] = useState(false);
  const [renameGroupOpen, setRenameGroupOpen] = useState(false);
  const [renameGroupTarget, setRenameGroupTarget] =
    useState<GuestGroupWithCount | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [renameGroupShift, setRenameGroupShift] = useState<string>("all");
  const [renameGroupSubmitting, setRenameGroupSubmitting] = useState(false);
  const [deleteGroupConfirm, setDeleteGroupConfirm] =
    useState<GuestGroupWithCount | null>(null);
  const [deleteGroupSubmitting, setDeleteGroupSubmitting] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupGuests, setGroupGuests] = useState<Guest[]>([]);
  const [groupGuestsLoading, setGroupGuestsLoading] = useState(false);
  const [desktopPage, setDesktopPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(LIST_PAGE_SIZE);
  const [isDesktop, setIsDesktop] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [waNotice, setWaNotice] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmGuest, setDeleteConfirmGuest] = useState<Guest | null>(
    null,
  );
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [weddingLocation, setWeddingLocation] = useState("");
  const [invitationTime, setInvitationTime] = useState("");
  const [invitationType, setInvitationType] = useState<string>("digital");
  const [guestType, setGuestType] = useState<string>("sendiri");
  const [guestGroup, setGuestGroup] = useState<string>("");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [invitationTypeFilter, setInvitationTypeFilter] =
    useState<string>("all");
  const [guestTypeFilter, setGuestTypeFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [activeTab, setActiveTab] = useState<string>(() =>
    readAdminCookie() ? "add" : "list",
  );
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const [waInviteTemplate, setWaInviteTemplate] = useState(
    DEFAULT_WA_INVITE_TEMPLATE,
  );
  const [waTemplateModalOpen, setWaTemplateModalOpen] = useState(false);
  const [addGuestModalOpen, setAddGuestModalOpen] = useState(false);
  const [overviewStats, setOverviewStats] = useState<GuestOverviewStats | null>(
    null,
  );
  const [overviewStatsLoading, setOverviewStatsLoading] = useState(false);
  const [overviewStatsError, setOverviewStatsError] = useState<string | null>(
    null,
  );
  const [waTemplateDraft, setWaTemplateDraft] = useState(
    DEFAULT_WA_INVITE_TEMPLATE,
  );
  const [waEmojiPickerReady, setWaEmojiPickerReady] = useState(false);
  const [waTemplateEmojiView, setWaTemplateEmojiView] = useState(false);
  const waTemplateTextareaRef = useRef<HTMLTextAreaElement>(null);
  const refreshGroupViewAfterEditRef = useRef(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [adminLoginModalOpen, setAdminLoginModalOpen] = useState(false);
  const [adminLoginUsername, setAdminLoginUsername] = useState("");
  const [adminLoginPassword, setAdminLoginPassword] = useState("");
  const [adminLoginError, setAdminLoginError] = useState<string | null>(null);
  const [adminAuthenticated, setAdminAuthenticated] = useState(() =>
    readAdminCookie(),
  );
  const showAdminUI = adminAuthenticated;

  useEffect(() => {
    if (!showAdminUI && activeTab !== "list") setActiveTab("list");
  }, [showAdminUI, activeTab]);

  useLayoutEffect(() => {
    const next = readInitialDarkMode();
    setIsDarkMode(next);
    syncDarkClass(next);
  }, []);

  useLayoutEffect(() => {
    const ok = readAdminCookie();
    setAdminAuthenticated(ok);
    if (!ok) setActiveTab("list");
  }, []);

  const handleDarkModeChange = useCallback((next: boolean) => {
    setIsDarkMode(next);
    syncDarkClass(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, []);

  const closeAdminLoginModal = useCallback(() => {
    setAdminLoginModalOpen(false);
    setAdminLoginError(null);
    setAdminLoginUsername("");
    setAdminLoginPassword("");
  }, []);

  const openAdminLoginModal = useCallback(() => {
    setAdminLoginError(null);
    setAdminLoginModalOpen(true);
  }, []);

  const handleAdminLoginSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      if (
        adminLoginUsername.trim() === ADMIN_LOGIN_USERNAME &&
        adminLoginPassword === ADMIN_LOGIN_PASSWORD
      ) {
        writeAdminCookie();
        setAdminAuthenticated(true);
        setActiveTab("add");
        setAdminLoginError(null);
        setAdminLoginUsername("");
        setAdminLoginPassword("");
        closeAdminLoginModal();
        return;
      }
      setAdminLoginError("Nama pengguna atau kata sandi salah.");
    },
    [adminLoginUsername, adminLoginPassword, closeAdminLoginModal],
  );

  const handleAdminLogout = useCallback(() => {
    clearAdminCookie();
    setAdminAuthenticated(false);
    setActiveTab("list");
  }, []);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LEGACY_ADMIN_SESSION_STORAGE_KEY) === "1") {
        writeAdminCookie();
        sessionStorage.removeItem(LEGACY_ADMIN_SESSION_STORAGE_KEY);
        setAdminAuthenticated(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 800);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(WA_INVITE_TEMPLATE_STORAGE_KEY);
      if (stored != null && stored.trim() !== "") {
        setWaInviteTemplate(stored);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!waTemplateModalOpen) {
      setWaEmojiPickerReady(false);
      setWaTemplateEmojiView(false);
    }
  }, [waTemplateModalOpen]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const handler = () => setIsDesktop(mq.matches);
    handler();
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    setDesktopPage(1);
    setMobileVisibleCount(LIST_PAGE_SIZE);
  }, [
    searchDebounced,
    locationFilter,
    invitationTypeFilter,
    guestTypeFilter,
    groupFilter,
  ]);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    const page = isDesktop ? desktopPage : 1;
    const limit = isDesktop ? LIST_PAGE_SIZE : mobileVisibleCount;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (searchDebounced.trim()) params.set("search", searchDebounced.trim());
    if (locationFilter && locationFilter !== "all")
      params.set("location", locationFilter);
    if (invitationTypeFilter && invitationTypeFilter !== "all")
      params.set("invitationType", invitationTypeFilter);
    if (guestTypeFilter && guestTypeFilter !== "all")
      params.set("guestType", guestTypeFilter);
    if (groupFilter && groupFilter !== "all")
      params.set("guestGroup", groupFilter);
    try {
      const res = await fetch(`/api/guests?${params}`);
      if (!res.ok) throw new Error("Failed to load guests");
      const json = (await res.json()) as GuestsResponse;
      setListData(json.data);
      setTotalFiltered(json.total);
      setTotalAll(json.totalAll);
      setUniqueLocations(json.uniqueLocations ?? []);
      setGuestGroupNames(json.guestGroupNames ?? []);
    } catch {
      setError("Tidak dapat memuat tamu. Periksa koneksi Anda dan coba lagi.");
    } finally {
      setLoading(false);
    }
  }, [
    isDesktop,
    desktopPage,
    mobileVisibleCount,
    searchDebounced,
    locationFilter,
    invitationTypeFilter,
    guestTypeFilter,
    groupFilter,
  ]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const loadOverviewStats = useCallback(async () => {
    setOverviewStatsLoading(true);
    setOverviewStatsError(null);
    try {
      const params = new URLSearchParams();
      if (locationFilter && locationFilter !== "all")
        params.set("location", locationFilter);
      const qs = params.toString();
      const res = await fetch(`/api/guests/stats${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("failed");
      const json = (await res.json()) as GuestOverviewStats;
      setOverviewStats(json);
    } catch {
      setOverviewStatsError("Tidak dapat memuat ringkasan.");
      setOverviewStats(null);
    } finally {
      setOverviewStatsLoading(false);
    }
  }, [locationFilter]);

  useEffect(() => {
    if (showAdminUI && activeTab === "add") {
      void loadOverviewStats();
    }
  }, [showAdminUI, activeTab, loadOverviewStats]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setAddress("");
    setPhone("");
    setWeddingLocation("");
    setInvitationTime("");
    setInvitationType("digital");
    setGuestType("sendiri");
    setGuestGroup("");
  }, []);

  const startEdit = useCallback((g: Guest) => {
    setEditingId(g.id);
    setName(g.name);
    setAddress(g.address ?? "");
    setPhone(g.phone ?? "");
    setWeddingLocation(g.weddingLocation ?? "");
    setInvitationTime(toDatetimeLocal(g.invitationTime));
    setInvitationType(g.invitationType === "physical" ? "physical" : "digital");
    setGuestType(g.guestType === "sekaliyan" ? "sekaliyan" : "sendiri");
    setGuestGroup(g.guestGroup ?? "");
  }, []);

  const totalPages = Math.max(1, Math.ceil(totalFiltered / LIST_PAGE_SIZE));
  const hasMoreMobile = listData.length < totalFiltered && !isDesktop;

  const paginationPages = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | "ellipsis")[] = [];
    const alwaysShow = new Set([
      1,
      totalPages,
      desktopPage,
      desktopPage - 1,
      desktopPage + 1,
    ]);
    const sorted = [...alwaysShow]
      .filter((p) => p >= 1 && p <= totalPages)
      .sort((a, b) => a - b);
    let prev = 0;
    for (const p of sorted) {
      if (p - prev > 1) pages.push("ellipsis");
      pages.push(p);
      prev = p;
    }
    return pages;
  }, [totalPages, desktopPage]);

  const handleExportPdf = useCallback(async () => {
    setExportPdfLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchDebounced.trim()) params.set("search", searchDebounced.trim());
      if (locationFilter && locationFilter !== "all")
        params.set("location", locationFilter);
      if (invitationTypeFilter && invitationTypeFilter !== "all")
        params.set("invitationType", invitationTypeFilter);
      if (guestTypeFilter && guestTypeFilter !== "all")
        params.set("guestType", guestTypeFilter);
      const res = await fetch(`/api/guests/export?${params}`);
      if (!res.ok) throw new Error("Export failed");
      const json = (await res.json()) as { data: Guest[] };
      const rows = json.data;
      if (rows.length === 0) return;
      const doc = new jsPDF({ orientation: "landscape", unit: "mm" });
      const head = [
        "#",
        "Nama",
        "Alamat",
        "Lokasi",
        "Grup",
        "Tamu",
        "Tipe",
        "Waktu",
        "WhatsApp",
      ];
      const body = rows.map((g, i) => [
        String(i + 1),
        g.name ?? "—",
        g.address ?? "—",
        g.weddingLocation ?? "—",
        g.guestGroup ?? "—",
        GUEST_TYPE_LABELS[g.guestType ?? ""] ?? "—",
        INVITATION_TYPE_LABELS[g.invitationType ?? ""] ?? "—",
        getShiftLabelFromInvitationTime(g.invitationTime),
        g.phone?.trim() || "—",
      ]);
      autoTable(doc, {
        head: [head],
        body,
        startY: 12,
        margin: { left: 10, right: 10 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [100, 100, 100] },
      });
      const title = "Daftar Tamu Undangan";
      const filterDesc = [
        locationFilter && locationFilter !== "all" ? locationFilter : null,
        invitationTypeFilter && invitationTypeFilter !== "all"
          ? INVITATION_TYPE_LABELS[invitationTypeFilter]
          : null,
        guestTypeFilter && guestTypeFilter !== "all"
          ? GUEST_TYPE_LABELS[guestTypeFilter]
          : null,
      ]
        .filter(Boolean)
        .join(" · ");
      doc.setFontSize(10);
      doc.text(filterDesc ? `${title} (${filterDesc})` : title, 10, 8);
      doc.save(`daftar-tamu-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setError("Gagal mengunduh PDF. Coba lagi.");
    } finally {
      setExportPdfLoading(false);
    }
  }, [searchDebounced, locationFilter, invitationTypeFilter, guestTypeFilter]);

  const closeEditModal = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleWeddingLocationChange = useCallback((value: string) => {
    setWeddingLocation(value);
    setInvitationTime(
      applyShiftToInvitationTime("", value, SHIFT_OPTIONS[0].value),
    );
  }, []);

  const handleEditSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!editingId || !trimmedName) return;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/guests/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            address: address.trim() || null,
            phone: phone.trim() || null,
            weddingLocation: weddingLocation.trim() || null,
            invitationTime: invitationTime || null,
            invitationType:
              invitationType === "physical" ? "physical" : "digital",
            guestType: guestType === "sekaliyan" ? "sekaliyan" : "sendiri",
            guestGroup: guestGroup.trim() || null,
          }),
        });
        if (!res.ok) return;
        resetForm();
        await loadList();
        if (showAdminUI) await loadOverviewStats();
        refreshGroupViewAfterEditRef.current = true;
      } finally {
        setSubmitting(false);
      }
    },
    [
      editingId,
      name,
      address,
      phone,
      weddingLocation,
      invitationTime,
      invitationType,
      guestType,
      guestGroup,
      resetForm,
      loadList,
      showAdminUI,
      loadOverviewStats,
    ],
  );

  const openWaTemplateModal = useCallback(() => {
    setWaTemplateDraft(waInviteTemplate);
    setWaTemplateEmojiView(false);
    setWaTemplateModalOpen(true);
  }, [waInviteTemplate]);

  const closeWaTemplateModal = useCallback(() => {
    setWaTemplateEmojiView(false);
    setWaTemplateModalOpen(false);
  }, []);

  const openWaEmojiPanel = useCallback(() => {
    setWaEmojiPickerReady(true);
    setWaTemplateEmojiView(true);
  }, []);

  const closeWaEmojiPanel = useCallback(() => {
    setWaTemplateEmojiView(false);
  }, []);

  const saveWaTemplate = useCallback(() => {
    const next =
      waTemplateDraft.trim() === ""
        ? DEFAULT_WA_INVITE_TEMPLATE
        : waTemplateDraft;
    setWaInviteTemplate(next);
    try {
      localStorage.setItem(WA_INVITE_TEMPLATE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setWaTemplateModalOpen(false);
  }, [waTemplateDraft]);

  const resetWaTemplateDraft = useCallback(() => {
    setWaTemplateDraft(DEFAULT_WA_INVITE_TEMPLATE);
  }, []);

  const focusWaTemplateTextarea = useCallback(
    (selStart: number, selEnd: number) => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = waTemplateTextareaRef.current;
          if (!el) return;
          el.focus();
          try {
            el.setSelectionRange(selStart, selEnd);
          } catch {
            /* ignore */
          }
        });
      });
    },
    [],
  );

  const wrapWaTemplateSelection = useCallback(
    (before: string, after: string) => {
      const el = waTemplateTextareaRef.current;
      if (!el) return;
      const { value, selectionStart: start, selectionEnd: end } = el;
      let next: string;
      let selStart: number;
      let selEnd: number;
      if (start === end) {
        next = value.slice(0, start) + before + after + value.slice(end);
        selStart = start + before.length;
        selEnd = selStart;
      } else {
        const inner = value.slice(start, end);
        next =
          value.slice(0, start) + before + inner + after + value.slice(end);
        selStart = start + before.length;
        selEnd = selStart + inner.length;
      }
      setWaTemplateDraft(next);
      focusWaTemplateTextarea(selStart, selEnd);
    },
    [focusWaTemplateTextarea],
  );

  const insertWaTemplateSnippet = useCallback(
    (snippet: string) => {
      const el = waTemplateTextareaRef.current;
      if (!el) return;
      const { value, selectionStart: start, selectionEnd: end } = el;
      const next = value.slice(0, start) + snippet + value.slice(end);
      const c = start + snippet.length;
      setWaTemplateDraft(next);
      focusWaTemplateTextarea(c, c);
    },
    [focusWaTemplateTextarea],
  );

  const handleWaEmojiPicked = useCallback(
    (emoji: EmojiClickData) => {
      insertWaTemplateSnippet(emoji.emoji);
    },
    [insertWaTemplateSnippet],
  );

  const wrapWaTemplateCodeBlock = useCallback(() => {
    const before = "```\n";
    const after = "\n```";
    const el = waTemplateTextareaRef.current;
    if (!el) return;
    const { value, selectionStart: start, selectionEnd: end } = el;
    let next: string;
    let selStart: number;
    let selEnd: number;
    if (start === end) {
      next = value.slice(0, start) + before + after + value.slice(end);
      selStart = start + before.length;
      selEnd = selStart;
    } else {
      const inner = value.slice(start, end);
      next = value.slice(0, start) + before + inner + after + value.slice(end);
      selStart = start + before.length;
      selEnd = selStart + inner.length;
    }
    setWaTemplateDraft(next);
    focusWaTemplateTextarea(selStart, selEnd);
  }, [focusWaTemplateTextarea]);

  const openDigitalWhatsappInvite = useCallback(
    (g: Guest) => {
      const digits = normalizePhoneForWa(g.phone);
      if (!digits) {
        setWaNotice(
          "Isi nomor WhatsApp di data tamu (menu Ubah tamu) untuk tamu digital.",
        );
        return;
      }
      setWaNotice(null);
      const url = `https://wa.me/${digits}?text=${encodeURIComponent(
        buildDigitalInviteMessage(g, waInviteTemplate),
      )}`;
      window.open(url, "_blank", "noopener,noreferrer");
    },
    [waInviteTemplate],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmedName = name.trim();
      if (!trimmedName) return;
      setSubmitting(true);
      try {
        if (editingId) {
          const res = await fetch(`/api/guests/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedName,
              address: address.trim() || null,
              phone: phone.trim() || null,
              weddingLocation: weddingLocation.trim() || null,
              invitationTime: invitationTime || null,
              invitationType:
                invitationType === "physical" ? "physical" : "digital",
              guestType: guestType === "sekaliyan" ? "sekaliyan" : "sendiri",
              guestGroup: guestGroup.trim() || null,
            }),
          });
          if (!res.ok) return;
        } else {
          const res = await fetch("/api/guests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: trimmedName,
              address: address.trim() || null,
              phone: phone.trim() || null,
              weddingLocation: weddingLocation.trim() || null,
              invitationTime: invitationTime || null,
              invitationType:
                invitationType === "physical" ? "physical" : "digital",
              guestType: guestType === "sekaliyan" ? "sekaliyan" : "sendiri",
              guestGroup: guestGroup.trim() || null,
            }),
          });
          if (!res.ok) return;
        }
        resetForm();
        setAddGuestModalOpen(false);
        await loadList();
        if (showAdminUI) await loadOverviewStats();
      } finally {
        setSubmitting(false);
      }
    },
    [
      editingId,
      name,
      address,
      phone,
      weddingLocation,
      invitationTime,
      invitationType,
      guestType,
      guestGroup,
      resetForm,
      loadList,
      showAdminUI,
      loadOverviewStats,
    ],
  );

  const guestGroupOptions = useMemo(() => guestGroupNames, [guestGroupNames]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const params = new URLSearchParams();
      if (locationFilter && locationFilter !== "all")
        params.set("location", locationFilter);
      const qs = params.toString();
      const res = await fetch(`/api/guest-groups${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to load groups");
      const data = (await res.json()) as GuestGroupWithCount[];
      setGroupsList(data);
    } catch {
      setGroupsError("Tidak dapat memuat grup tamu.");
    } finally {
      setGroupsLoading(false);
    }
  }, [locationFilter]);

  useEffect(() => {
    if (showAdminUI && activeTab === "groups") loadGroups();
  }, [showAdminUI, activeTab, loadGroups]);

  const loadGuestsForGroup = useCallback(
    async (groupName: string) => {
      setGroupGuestsLoading(true);
      try {
        const params = new URLSearchParams({
          guestGroup: groupName,
          limit: "500",
        });
        if (locationFilter && locationFilter !== "all")
          params.set("location", locationFilter);
        const res = await fetch(`/api/guests?${params}`);
        if (!res.ok) throw new Error("Failed to load guests");
        const json = (await res.json()) as GuestsResponse;
        setGroupGuests(json.data);
      } catch {
        setGroupGuests([]);
      } finally {
        setGroupGuestsLoading(false);
      }
    },
    [locationFilter],
  );

  useEffect(() => {
    if (expandedGroupId == null) return;
    const group = groupsList.find((x) => x.id === expandedGroupId);
    if (group) void loadGuestsForGroup(group.name);
  }, [expandedGroupId, groupsList, loadGuestsForGroup]);

  const selectGroupForPanel = useCallback((g: GuestGroupWithCount) => {
    setExpandedGroupId(g.id);
  }, []);

  const closeGroupPanel = useCallback(() => {
    setExpandedGroupId(null);
    setGroupGuests([]);
  }, []);

  useEffect(() => {
    if (expandedGroupId == null) {
      refreshGroupViewAfterEditRef.current = false;
      return;
    }
    if (!refreshGroupViewAfterEditRef.current) return;
    const group = groupsList.find((x) => x.id === expandedGroupId);
    if (group) {
      refreshGroupViewAfterEditRef.current = false;
      loadGuestsForGroup(group.name);
      loadGroups();
    }
  }, [expandedGroupId, groupsList, loadGuestsForGroup, loadGroups, listData]);

  const openAddGroup = useCallback(() => {
    setNewGroupName("");
    setAddGroupOpen(true);
  }, []);

  const closeAddGroup = useCallback(() => {
    setAddGroupOpen(false);
    setNewGroupName("");
  }, []);

  const handleAddGroup = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      const trimmed = newGroupName.trim();
      if (!trimmed) return;
      setAddGroupSubmitting(true);
      try {
        const res = await fetch("/api/guest-groups", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setGroupsError(err.error ?? "Gagal menambah grup");
          return;
        }
        closeAddGroup();
        await loadGroups();
        await loadList();
        if (showAdminUI) await loadOverviewStats();
      } finally {
        setAddGroupSubmitting(false);
      }
    },
    [
      newGroupName,
      closeAddGroup,
      loadGroups,
      loadList,
      showAdminUI,
      loadOverviewStats,
    ],
  );

  const openRenameGroup = useCallback((g: GuestGroupWithCount) => {
    setRenameGroupTarget(g);
    setRenameGroupName(g.name);
    setRenameGroupOpen(true);
  }, []);

  const closeRenameGroup = useCallback(() => {
    setRenameGroupOpen(false);
    setRenameGroupTarget(null);
    setRenameGroupName("");
    setRenameGroupShift("all");
  }, []);

  const handleRenameGroup = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const target = renameGroupTarget;
      const trimmed = renameGroupName.trim();
      if (!target || !trimmed) return;
      const shiftKey = renameGroupShift;
      setRenameGroupSubmitting(true);
      try {
        const res = await fetch(`/api/guest-groups/${target.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          const err = (await res.json()) as { error?: string };
          setGroupsError(err.error ?? "Gagal mengubah nama grup");
          return;
        }
        if (shiftKey !== "all" && target.guestCount > 0) {
          const guestRes = await fetch(
            `/api/guests?${new URLSearchParams({ guestGroup: trimmed, limit: "500" })}`,
          );
          if (guestRes.ok) {
            const json = (await guestRes.json()) as GuestsResponse;
            const guestsToUpdate = json.data ?? [];
            await Promise.all(
              guestsToUpdate.map((g) => {
                const newTime = applyShiftToInvitationTime(
                  g.invitationTime ? toDatetimeLocal(g.invitationTime) : "",
                  g.weddingLocation ?? "",
                  shiftKey,
                );
                return fetch(`/api/guests/${g.id}`, {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    name: g.name,
                    address: g.address ?? null,
                    phone: g.phone ?? null,
                    weddingLocation: g.weddingLocation ?? null,
                    invitationTime: newTime || null,
                    invitationType: g.invitationType ?? "digital",
                    guestType: g.guestType ?? "sendiri",
                    guestGroup: g.guestGroup ?? null,
                  }),
                });
              }),
            );
          }
        }
        closeRenameGroup();
        await loadGroups();
        await loadList();
        if (showAdminUI) await loadOverviewStats();
      } finally {
        setRenameGroupSubmitting(false);
      }
    },
    [
      renameGroupTarget,
      renameGroupName,
      renameGroupShift,
      closeRenameGroup,
      loadGroups,
      loadList,
      showAdminUI,
      loadOverviewStats,
    ],
  );

  const openDeleteGroupConfirm = useCallback((g: GuestGroupWithCount) => {
    setDeleteGroupConfirm(g);
  }, []);

  const closeDeleteGroupConfirm = useCallback(() => {
    setDeleteGroupConfirm(null);
  }, []);

  const confirmDeleteGroup = useCallback(async () => {
    const g = deleteGroupConfirm;
    if (!g) return;
    setDeleteGroupSubmitting(true);
    try {
      const res = await fetch(`/api/guest-groups/${g.id}`, {
        method: "DELETE",
      });
      if (!res.ok) return;
      closeDeleteGroupConfirm();
      await loadGroups();
      await loadList();
      if (showAdminUI) await loadOverviewStats();
    } finally {
      setDeleteGroupSubmitting(false);
    }
  }, [
    deleteGroupConfirm,
    closeDeleteGroupConfirm,
    loadGroups,
    loadList,
    showAdminUI,
    loadOverviewStats,
  ]);

  const openDeleteConfirm = useCallback((g: Guest) => {
    setDeleteConfirmGuest(g);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    setDeleteConfirmGuest(null);
  }, []);

  const confirmDelete = useCallback(async () => {
    const guest = deleteConfirmGuest;
    if (!guest) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/guests/${guest.id}`, { method: "DELETE" });
      if (!res.ok) return;
      await loadList();
      if (showAdminUI) await loadOverviewStats();
      if (expandedGroupId != null) {
        const group = groupsList.find((x) => x.id === expandedGroupId);
        if (group) loadGuestsForGroup(group.name);
      }
      await loadGroups();
      if (editingId === guest.id) resetForm();
      closeDeleteConfirm();
    } finally {
      setDeleting(false);
    }
  }, [
    deleteConfirmGuest,
    editingId,
    loadList,
    loadOverviewStats,
    showAdminUI,
    loadGroups,
    expandedGroupId,
    groupsList,
    loadGuestsForGroup,
    resetForm,
    closeDeleteConfirm,
  ]);

  const renderAddGuestForm = () => (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 max-w-4xl w-full"
    >
      <TextField
        isRequired
        fullWidth
        name="name"
        value={name}
        onChange={setName}
      >
        <Label>Nama</Label>
        <Input variant="secondary" placeholder="Nama tamu" />
      </TextField>
      <TextField fullWidth name="address" value={address} onChange={setAddress}>
        <Label>Alamat Tamu</Label>
        <Input variant="secondary" placeholder="Alamat" />
      </TextField>
      <TextField fullWidth name="phone" value={phone} onChange={setPhone}>
        <Label>Nomor WhatsApp</Label>
        <Input
          variant="secondary"
          placeholder="Contoh: 0812… atau 62812…"
          inputMode="tel"
          autoComplete="tel"
        />
      </TextField>
      <RadioGroup
        name="weddingLocation"
        value={weddingLocation}
        onChange={handleWeddingLocationChange}
        variant="secondary"
        orientation="horizontal"
        className="mt-2"
      >
        <Label>Lokasi resepsi</Label>
        <Radio value="Semarang">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>Semarang</Label>
          </Radio.Content>
        </Radio>
        <Radio value="Magetan">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>Magetan</Label>
          </Radio.Content>
        </Radio>
      </RadioGroup>
      <Select
        fullWidth
        name="invitationTime"
        placeholder="Pilih shift"
        variant="secondary"
        value={getShiftKeyFromTime(invitationTime || null)}
        onChange={(key) =>
          setInvitationTime(
            applyShiftToInvitationTime(
              invitationTime,
              weddingLocation,
              String(key ?? "shift1"),
            ),
          )
        }
      >
        <Label>Waktu undangan (Shift)</Label>
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover>
          <ListBox>
            {SHIFT_OPTIONS.map((opt) => (
              <ListBox.Item
                key={opt.value}
                id={opt.value}
                textValue={opt.label}
              >
                {opt.label}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </Select.Popover>
      </Select>
      <RadioGroup
        name="invitationType"
        value={invitationType}
        onChange={setInvitationType}
        variant="secondary"
        orientation="horizontal"
      >
        <Label>Tipe undangan</Label>
        <Radio value="digital">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>Digital</Label>
          </Radio.Content>
        </Radio>
        <Radio value="physical">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>Fisik</Label>
          </Radio.Content>
        </Radio>
      </RadioGroup>
      <RadioGroup
        name="guestType"
        value={guestType}
        onChange={setGuestType}
        variant="secondary"
        orientation="horizontal"
      >
        <Label>Tamu</Label>
        <Radio value="sendiri">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>Sendiri</Label>
          </Radio.Content>
        </Radio>
        <Radio value="sekaliyan">
          <Radio.Control>
            <Radio.Indicator />
          </Radio.Control>
          <Radio.Content>
            <Label>Sekaliyan</Label>
          </Radio.Content>
        </Radio>
      </RadioGroup>
      <ComboBox
        fullWidth
        allowsCustomValue
        inputValue={guestGroup}
        onInputChange={setGuestGroup}
        selectedKey={guestGroup || null}
        onSelectionChange={(key) =>
          setGuestGroup(key != null ? String(key) : "")
        }
        className="w-full"
      >
        <Label>Grup tamu</Label>
        <ComboBox.InputGroup>
          <Input placeholder="Pilih atau ketik grup baru..." />
          <ComboBox.Trigger />
        </ComboBox.InputGroup>
        <ComboBox.Popover>
          <ListBox>
            {guestGroupOptions.map((opt) => (
              <ListBox.Item key={opt} id={opt} textValue={opt}>
                {opt}
                <ListBox.ItemIndicator />
              </ListBox.Item>
            ))}
          </ListBox>
        </ComboBox.Popover>
      </ComboBox>
      <div className="flex flex-col gap-3 pt-2 w-full">
        <Button
          type="submit"
          isPending={submitting}
          variant="primary"
          className="w-full"
        >
          {({ isPending }) =>
            isPending
              ? editingId
                ? "Menyimpan…"
                : "Menambahkan…"
              : editingId
                ? "Simpan"
                : "Tambah tamu"
          }
        </Button>
        {editingId ? (
          <Button type="button" variant="secondary" onPress={resetForm}>
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );

  return (
    <div className="flex min-h-dvh max-h-dvh flex-col overflow-x-hidden bg-linear-to-br from-default-50 to-default-100 py-4 px-4 dark:from-default-100 dark:to-default-200">
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-3">
        <div className="flex min-h-0 w-full flex-1 flex-col">
          <header className="grid w-full shrink-0 grid-cols-1 items-center gap-3 border-b border-default-200/60 pb-3 sm:grid-cols-[1fr_auto_1fr] sm:gap-2">
            <div className="flex min-w-0 items-center justify-center gap-2 sm:justify-start">
              <img
                src="/hakistd.svg"
                alt=""
                aria-hidden
                className="h-8 w-auto shrink-0 object-contain brightness-0 dark:brightness-100"
              />
              <span className="truncate text-sm font-semibold tracking-tight text-foreground">
                Guests Manager
              </span>
            </div>
            <div className="flex min-w-0 justify-center justify-self-center px-1">
              {showAdminUI ? (
                <nav
                  className="mx-auto flex w-full max-w-md flex-nowrap gap-1 overflow-x-auto sm:gap-2"
                  aria-label="Main navigation"
                >
                  <button
                    type="button"
                    onClick={() => setActiveTab("add")}
                    aria-current={activeTab === "add" ? "page" : undefined}
                    className={`min-w-0 shrink-0 border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                      activeTab === "add"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-default-600 hover:border-default-300 hover:text-foreground dark:hover:border-default-500"
                    }`}
                  >
                    Metrik
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("list")}
                    aria-current={activeTab === "list" ? "page" : undefined}
                    className={`min-w-0 shrink-0 border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                      activeTab === "list"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-default-600 hover:border-default-300 hover:text-foreground dark:hover:border-default-500"
                    }`}
                  >
                    Guests
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("groups")}
                    aria-current={activeTab === "groups" ? "page" : undefined}
                    className={`min-w-0 shrink-0 border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors sm:px-3 ${
                      activeTab === "groups"
                        ? "border-foreground text-foreground"
                        : "border-transparent text-default-600 hover:border-default-300 hover:text-foreground dark:hover:border-default-500"
                    }`}
                  >
                    Group
                  </button>
                </nav>
              ) : (
                <span className="text-sm font-medium text-default-600 dark:text-default-400">
                  Guests
                </span>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 sm:justify-end sm:justify-self-end">
              <Select
                className="w-[min(200px,55vw)] shrink-0 sm:w-[160px]"
                placeholder="Lokasi"
                variant="secondary"
                value={locationFilter === "" ? "all" : locationFilter}
                onChange={(key) =>
                  setLocationFilter(
                    key === "all" || key === null ? "" : String(key),
                  )
                }
              >
                <Label className="sr-only">Lokasi</Label>
                <Select.Trigger>
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    <ListBox.Item id="all" textValue="Semua lokasi">
                      <span className="text-sm">Semua Lokasi</span>
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                    {uniqueLocations.map((loc) => (
                      <ListBox.Item key={loc} id={loc} textValue={loc}>
                        {loc}
                        <ListBox.ItemIndicator />
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
              <Switch
                size="sm"
                isSelected={isDarkMode}
                onChange={handleDarkModeChange}
                aria-label={
                  isDarkMode ? "Switch to light mode" : "Switch to dark mode"
                }
              >
                <Switch.Control className="shrink-0">
                  <Switch.Thumb>
                    <Switch.Icon>
                      {isDarkMode ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <circle cx="12" cy="12" r="4" />
                          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                        </svg>
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden
                        >
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                      )}
                    </Switch.Icon>
                  </Switch.Thumb>
                </Switch.Control>
              </Switch>
              {showAdminUI ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  onPress={handleAdminLogout}
                >
                  Keluar
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide"
                  onPress={openAdminLoginModal}
                >
                  Masuk admin
                </Button>
              )}
              <span
                className={
                  showAdminUI
                    ? "shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary"
                    : "shrink-0 rounded-full bg-default-200/70 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-default-700 dark:bg-default-300/40 dark:text-default-200"
                }
              >
                {showAdminUI ? "Admin" : "User"}
              </span>
            </div>
          </header>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {showAdminUI && (
          <div
            className={`min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden pt-2 ${activeTab === "add" ? "flex" : "hidden"}`}
          >
            <div className="flex min-h-0 w-full flex-1 flex-col px-0 sm:px-1">
              <OverviewMetrics
                stats={overviewStats}
                loading={overviewStatsLoading}
                error={overviewStatsError}
                onAddGuest={() => setAddGuestModalOpen(true)}
              />
            </div>
          </div>
          )}
          <div
            className={`min-h-0 flex-1 flex-col overflow-hidden pt-2 pb-16 sm:pb-2 ${activeTab === "list" ? "flex" : "hidden"}`}
          >
            {error ? (
              <Card
                className="border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
                variant="default"
              >
                <Card.Content>
                  <p className="text-red-700 dark:text-red-300">{error}</p>
                </Card.Content>
              </Card>
            ) : loading ? (
              <div className="flex items-center gap-2 text-default-500">
                <Spinner size="sm" />
                <span>Memuat…</span>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                {waNotice ? (
                  <Card
                    className="border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/80"
                    variant="default"
                  >
                    <Card.Content className="flex flex-row items-start justify-between gap-2">
                      <p className="text-sm text-amber-900 dark:text-amber-100">
                        {waNotice}
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onPress={() => setWaNotice(null)}
                        className="shrink-0 text-amber-900 dark:text-amber-100"
                      >
                        Tutup
                      </Button>
                    </Card.Content>
                  </Card>
                ) : null}
                <div className="shrink-0 overflow-hidden bg-linear-to-br from-default-50 to-default-100 pb-2 -mx-4 px-4">
                  {/* Mobile: stacked layout */}
                  <div className="flex flex-col gap-2 sm:hidden">
                    <div className="flex flex-row items-center gap-2">
                      <Select
                        className="min-w-0 flex-1"
                        placeholder="Tipe undangan"
                        variant="secondary"
                        value={
                          invitationTypeFilter === ""
                            ? "all"
                            : invitationTypeFilter
                        }
                        onChange={(key) =>
                          setInvitationTypeFilter(
                            key === "all" || key === null ? "" : String(key),
                          )
                        }
                      >
                        <Label className="sr-only">Tipe undangan</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="all" textValue="Semua">
                              <span className="text-sm">Semua Undangan</span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="physical" textValue="Fisik">
                              Fisik
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="digital" textValue="Digital">
                              Digital
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Select
                        className="min-w-0 flex-1"
                        placeholder="Tipe tamu"
                        variant="secondary"
                        value={guestTypeFilter === "" ? "all" : guestTypeFilter}
                        onChange={(key) =>
                          setGuestTypeFilter(
                            key === "all" || key === null ? "" : String(key),
                          )
                        }
                      >
                        <Label className="sr-only">Tipe tamu</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="all" textValue="Semua tipe">
                              <span className="text-sm">Semua Tipe</span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="sekaliyan" textValue="Sekaliyan">
                              Sekaliyan
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            <ListBox.Item id="sendiri" textValue="Sendiri">
                              Sendiri
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          </ListBox>
                        </Select.Popover>
                      </Select>
                      <Select
                        className="min-w-0 flex-1"
                        placeholder="Grup tamu"
                        variant="secondary"
                        value={groupFilter === "" ? "all" : groupFilter}
                        onChange={(key) =>
                          setGroupFilter(
                            key === "all" || key === null ? "" : String(key),
                          )
                        }
                      >
                        <Label className="sr-only">Grup tamu</Label>
                        <Select.Trigger>
                          <Select.Value />
                          <Select.Indicator />
                        </Select.Trigger>
                        <Select.Popover>
                          <ListBox>
                            <ListBox.Item id="all" textValue="Semua grup">
                              <span className="text-sm">Semua Grup</span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                            {guestGroupNames.map((name) => (
                              <ListBox.Item
                                key={name}
                                id={name}
                                textValue={name}
                              >
                                {name}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                    {showAdminUI ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="w-full"
                        onPress={() => setAddGuestModalOpen(true)}
                      >
                        Add Guest
                      </Button>
                    ) : (
                      <p
                        className="text-default-500 text-xs text-center"
                        aria-live="polite"
                      >
                        Total: {totalFiltered} tamu undangan
                        {locationFilter && locationFilter !== "all"
                          ? ` di ${locationFilter}`
                          : ""}
                      </p>
                    )}
                    {totalFiltered > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={handleExportPdf}
                        isDisabled={exportPdfLoading}
                        className="w-full"
                      >
                        {exportPdfLoading ? (
                          <Spinner size="sm" className="mr-1" />
                        ) : null}
                        Export PDF
                      </Button>
                    )}
                    {showAdminUI ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={openWaTemplateModal}
                        className="w-full"
                      >
                        Pesan WA default
                      </Button>
                    ) : null}
                  </div>
                  {/* Desktop: one line — search + location + type + total */}
                  <div className="hidden sm:flex sm:flex-row sm:items-center sm:gap-3 sm:flex-wrap">
                    <TextField
                      className="min-w-0 flex-1 sm:max-w-[220px]"
                      name="search"
                      value={searchQuery}
                      onChange={setSearchQuery}
                    >
                      <Label className="sr-only">Cari tamu</Label>
                      <Input
                        variant="secondary"
                        placeholder="Cari tamu…"
                        className="rounded-full"
                      />
                    </TextField>
                    <Select
                      className="w-1/2 sm:w-[160px] shrink-0"
                      placeholder="Lokasi"
                      variant="secondary"
                      value={locationFilter === "" ? "all" : locationFilter}
                      onChange={(key) =>
                        setLocationFilter(
                          key === "all" || key === null ? "" : String(key),
                        )
                      }
                    >
                      <Label className="sr-only">Lokasi</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all" textValue="Semua lokasi">
                            <span className="text-sm">Semua Lokasi</span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {uniqueLocations.map((loc) => (
                            <ListBox.Item key={loc} id={loc} textValue={loc}>
                              {loc}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Select
                      className="w-1/2 sm:w-[160px] shrink-0"
                      placeholder="Tipe undangan"
                      variant="secondary"
                      value={
                        invitationTypeFilter === ""
                          ? "all"
                          : invitationTypeFilter
                      }
                      onChange={(key) =>
                        setInvitationTypeFilter(
                          key === "all" || key === null ? "" : String(key),
                        )
                      }
                    >
                      <Label className="sr-only">Tipe undangan</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all" textValue="Semua">
                            <span className="text-sm">Semua Undangan</span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="physical" textValue="Fisik">
                            Fisik
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="digital" textValue="Digital">
                            Digital
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Select
                      className="w-1/2 sm:w-[140px] shrink-0"
                      placeholder="Tipe tamu"
                      variant="secondary"
                      value={guestTypeFilter === "" ? "all" : guestTypeFilter}
                      onChange={(key) =>
                        setGuestTypeFilter(
                          key === "all" || key === null ? "" : String(key),
                        )
                      }
                    >
                      <Label className="sr-only">Tipe tamu</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all" textValue="Semua tipe">
                            <span className="text-sm">Semua Tipe</span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="sekaliyan" textValue="Sekaliyan">
                            Sekaliyan
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          <ListBox.Item id="sendiri" textValue="Sendiri">
                            Sendiri
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <Select
                      className="w-1/2 sm:w-[160px] shrink-0"
                      placeholder="Grup tamu"
                      variant="secondary"
                      value={groupFilter === "" ? "all" : groupFilter}
                      onChange={(key) =>
                        setGroupFilter(
                          key === "all" || key === null ? "" : String(key),
                        )
                      }
                    >
                      <Label className="sr-only">Grup tamu</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item id="all" textValue="Semua grup">
                            <span className="text-sm">Semua Grup</span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {guestGroupNames.map((name) => (
                            <ListBox.Item key={name} id={name} textValue={name}>
                              {name}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    {showAdminUI ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        className="shrink-0 sm:ml-auto"
                        onPress={() => setAddGuestModalOpen(true)}
                      >
                        Add Guest
                      </Button>
                    ) : (
                      <p
                        className="text-default-500 text-xs shrink-0 sm:ml-auto"
                        aria-live="polite"
                      >
                        Total: {totalFiltered} tamu undangan
                        {locationFilter && locationFilter !== "all"
                          ? ` di ${locationFilter}`
                          : ""}
                      </p>
                    )}
                    {totalFiltered > 0 && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={handleExportPdf}
                        isDisabled={exportPdfLoading}
                        className="shrink-0"
                      >
                        {exportPdfLoading ? (
                          <Spinner size="sm" className="mr-1" />
                        ) : null}
                        Export PDF
                      </Button>
                    )}
                    {showAdminUI ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={openWaTemplateModal}
                        className="shrink-0"
                      >
                        Pesan WA default
                      </Button>
                    ) : null}
                  </div>
                </div>
                {totalAll === 0 ? (
                  <Card variant="secondary" className="p-6">
                    <Card.Content>
                      <p className="text-default-500">
                        Belum ada tamu. Tambahkan dari tab pertama.
                      </p>
                    </Card.Content>
                  </Card>
                ) : listData.length === 0 ? (
                  <Card variant="secondary" className="p-6">
                    <Card.Content>
                      <p className="text-default-500">
                        Tidak ada tamu yang cocok dengan pencarian atau filter.
                        Coba kata atau lokasi lain.
                      </p>
                    </Card.Content>
                  </Card>
                ) : (
                  <>
                    {/* Mobile: card list */}
                    <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto sm:hidden">
                      {listData.map((g: Guest, index: number) => (
                        <div
                          key={g.id}
                          className="flex flex-row gap-3 rounded-lg border border-default-200/60 bg-default-50/50 px-3 py-2 items-center justify-between"
                        >
                          <div className="flex shrink-0 items-center justify-center rounded bg-default-200/80 px-2 py-0.5 text-xs font-medium tabular-nums text-default-600 min-w-7">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1 overflow-hidden">
                            <p className="truncate text-sm font-medium text-foreground">
                              {g.name}
                            </p>
                            <p className="truncate text-xs text-default-500">
                              {[
                                g.guestGroup,
                                GUEST_TYPE_LABELS[g.guestType ?? ""] ?? "—",
                                INVITATION_TYPE_LABELS[
                                  g.invitationType ?? ""
                                ] ?? "—",
                                g.weddingLocation,
                                g.address,
                                g.phone?.trim(),
                                getShiftLabelFromInvitationTime(
                                  g.invitationTime,
                                ),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
                          {showAdminUI ? (
                            <div className="flex shrink-0">
                              <Dropdown>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  aria-label="Aksi"
                                  className="text-default-500"
                                >
                                  <DotsIcon />
                                </Button>
                                <Dropdown.Popover className="min-w-[140px]">
                                  <Dropdown.Menu
                                    onAction={(key) => {
                                      if (key === "edit") startEdit(g);
                                      else if (key === "delete")
                                        openDeleteConfirm(g);
                                      else if (key === "whatsapp")
                                        openDigitalWhatsappInvite(g);
                                    }}
                                  >
                                    <Dropdown.Item id="edit" textValue="Ubah">
                                      <Label>Ubah</Label>
                                    </Dropdown.Item>
                                    {g.invitationType === "digital" ? (
                                      <Dropdown.Item
                                        id="whatsapp"
                                        textValue="Kirim undangan WA"
                                      >
                                        <Label>Kirim undangan WA</Label>
                                      </Dropdown.Item>
                                    ) : null}
                                    <Dropdown.Item
                                      id="delete"
                                      textValue="Hapus"
                                      variant="danger"
                                    >
                                      <Label>Hapus</Label>
                                    </Dropdown.Item>
                                  </Dropdown.Menu>
                                </Dropdown.Popover>
                              </Dropdown>
                            </div>
                          ) : null}
                        </div>
                      ))}
                      {hasMoreMobile ? (
                        <div className="flex justify-center py-3">
                          <Button
                            variant="secondary"
                            onPress={() =>
                              setMobileVisibleCount((c) => c + LIST_PAGE_SIZE)
                            }
                            className="min-w-[140px]"
                          >
                            Lihat lebih banyak
                          </Button>
                        </div>
                      ) : null}
                    </div>
                    {/* Desktop: table */}
                    <div className="hidden sm:block min-h-0 flex-1 overflow-auto rounded-lg border border-default-200/60 bg-default-50/30">
                      <table className="w-full border-collapse text-sm">
                        <thead className="sticky top-0 z-1 bg-default-100/95 backdrop-blur border-b border-default-200/60">
                          <tr>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 w-10">
                              #
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500">
                              Nama
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden md:table-cell">
                              Alamat
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden md:table-cell">
                              Lokasi
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden md:table-cell">
                              Grup
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden lg:table-cell">
                              Tamu
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden lg:table-cell">
                              Tipe
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden lg:table-cell">
                              Waktu
                            </th>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500 hidden lg:table-cell max-w-[120px]">
                              WhatsApp
                            </th>
                            {showAdminUI ? (
                              <th className="text-right py-2.5 px-3 text-xs font-medium text-default-500 min-w-[108px]">
                                Aksi
                              </th>
                            ) : null}
                          </tr>
                        </thead>
                        <tbody>
                          {listData.map((g: Guest, index: number) => (
                            <tr
                              key={g.id}
                              className="border-b border-default-200/40 last:border-b-0 hover:bg-default-100/50 transition-colors"
                            >
                              <td className="py-2 px-3 tabular-nums text-default-600">
                                {(desktopPage - 1) * LIST_PAGE_SIZE + index + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-foreground">
                                {g.name}
                              </td>
                              <td
                                className="py-2 px-3 text-default-600 hidden md:table-cell max-w-[200px] truncate"
                                title={g.address ?? undefined}
                              >
                                {g.address ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden md:table-cell">
                                {g.weddingLocation ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden md:table-cell">
                                {g.guestGroup ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden lg:table-cell">
                                {GUEST_TYPE_LABELS[g.guestType ?? ""] ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden lg:table-cell">
                                {INVITATION_TYPE_LABELS[
                                  g.invitationType ?? ""
                                ] ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden lg:table-cell">
                                {getShiftLabelFromInvitationTime(
                                  g.invitationTime,
                                )}
                              </td>
                              <td
                                className="py-2 px-3 text-default-600 hidden lg:table-cell max-w-[120px] truncate"
                                title={g.phone?.trim() || undefined}
                              >
                                {g.phone?.trim() || "—"}
                              </td>
                              {showAdminUI ? (
                                <td className="py-2 px-3 text-right">
                                  <div className="flex justify-end gap-0.5">
                                    {g.invitationType === "digital" ? (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        isIconOnly
                                        onPress={() =>
                                          openDigitalWhatsappInvite(g)
                                        }
                                        aria-label={`Kirim undangan WhatsApp ke ${g.name}`}
                                        className="text-emerald-600 hover:text-emerald-700 min-w-8 w-8"
                                      >
                                        <WaIcon />
                                      </Button>
                                    ) : null}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      isIconOnly
                                      onPress={() => startEdit(g)}
                                      aria-label="Ubah tamu"
                                      className="text-default-500 hover:text-foreground min-w-8 w-8"
                                    >
                                      <EditIcon />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      isIconOnly
                                      onPress={() => openDeleteConfirm(g)}
                                      aria-label="Hapus tamu"
                                      className="text-default-400 hover:text-red-600 min-w-8 w-8"
                                    >
                                      <TrashIcon />
                                    </Button>
                                  </div>
                                </td>
                              ) : null}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Desktop: pagination — compact pill, matches reference */}
                    {isDesktop && totalPages > 1 ? (
                      <div className="hidden sm:flex shrink-0 items-center justify-center py-2">
                        <nav
                          className="inline-flex h-8 items-center overflow-hidden rounded-full bg-default-100 shadow-md"
                          aria-label="Navigasi halaman"
                        >
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            className="h-8 min-w-8 rounded-l-full rounded-r-none text-default-400 hover:bg-default-200/40 hover:text-foreground disabled:opacity-40"
                            isDisabled={desktopPage <= 1}
                            onPress={() =>
                              setDesktopPage((p) => Math.max(1, p - 1))
                            }
                            aria-label="Halaman sebelumnya"
                          >
                            <span
                              className="text-base leading-none"
                              aria-hidden
                            >
                              ‹
                            </span>
                          </Button>
                          <div className="flex h-8 items-center">
                            {paginationPages.map((item, idx) =>
                              item === "ellipsis" ? (
                                <span
                                  key={`ellipsis-${idx}`}
                                  className="flex h-8 min-w-8 items-center justify-center text-xs text-default-600"
                                  aria-hidden
                                >
                                  …
                                </span>
                              ) : (
                                <Button
                                  key={item}
                                  size="sm"
                                  variant={
                                    desktopPage === item ? "primary" : "ghost"
                                  }
                                  className={
                                    desktopPage === item
                                      ? "h-8 min-w-8 rounded-md font-medium text-primary-foreground"
                                      : "h-8 min-w-8 rounded-none text-xs text-default-700 hover:bg-default-200/40"
                                  }
                                  onPress={() => setDesktopPage(item)}
                                  aria-label={
                                    desktopPage === item
                                      ? `Halaman ${item}, halaman saat ini`
                                      : `Halaman ${item}`
                                  }
                                  aria-current={
                                    desktopPage === item ? "page" : undefined
                                  }
                                >
                                  {item}
                                </Button>
                              ),
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            className="h-8 min-w-8 rounded-r-full rounded-l-none text-default-400 hover:bg-default-200/40 hover:text-foreground disabled:opacity-40"
                            isDisabled={desktopPage >= totalPages}
                            onPress={() =>
                              setDesktopPage((p) => Math.min(totalPages, p + 1))
                            }
                            aria-label="Halaman berikutnya"
                          >
                            <span
                              className="text-base leading-none"
                              aria-hidden
                            >
                              ›
                            </span>
                          </Button>
                        </nav>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
          {showAdminUI && (
          <div
            className={`min-h-0 flex-1 flex-col overflow-hidden pt-2 ${activeTab === "groups" ? "flex" : "hidden"}`}
          >
            <div className="flex flex-1 min-h-0 gap-4 w-full max-w-full mx-auto">
              <div className="flex flex-col gap-4 min-w-0 flex-1">
                <div className="flex flex-row items-center justify-between gap-2">
                  <h2 className="text-lg font-medium text-foreground">
                    Daftar grup tamu
                  </h2>
                  <Button variant="primary" onPress={openAddGroup}>
                    Tambah grup
                  </Button>
                </div>
                {groupsError ? (
                  <Card
                    className="border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
                    variant="default"
                  >
                    <Card.Content>
                      <p className="text-red-700 dark:text-red-300">
                        {groupsError}
                      </p>
                    </Card.Content>
                  </Card>
                ) : groupsLoading ? (
                  <div className="flex items-center gap-2 text-default-500">
                    <Spinner size="sm" />
                    <span>Memuat…</span>
                  </div>
                ) : groupsList.length === 0 ? (
                  <Card variant="secondary" className="p-6">
                    <Card.Content>
                      <p className="text-default-500">
                        Belum ada grup. Klik &quot;Tambah grup&quot; untuk
                        membuat.
                      </p>
                    </Card.Content>
                  </Card>
                ) : (
                  <div className="rounded-lg border border-default-200/60 bg-default-50/30 overflow-hidden flex-1 min-h-0 flex flex-col">
                    <div className="overflow-auto min-h-0">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-default-100/95 border-b border-default-200/60 sticky top-0">
                          <tr>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500">
                              Grup
                            </th>
                            <th className="text-right py-2.5 px-3 text-xs font-medium text-default-500 w-24">
                              Tamu
                            </th>
                            <th className="text-right py-2.5 px-3 text-xs font-medium text-default-500 w-32">
                              Aksi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupsList.map((g) => (
                            <tr
                              key={g.id}
                              className={`border-b border-default-200/40 last:border-b-0 hover:bg-default-100/50 cursor-pointer ${expandedGroupId === g.id ? "bg-default-200/50" : ""}`}
                              onClick={() => selectGroupForPanel(g)}
                            >
                              <td className="py-2 px-3 font-medium text-foreground">
                                {g.name}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-default-600">
                                {g.guestCount}
                              </td>
                              <td
                                className="py-2 px-3 text-right"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex justify-end gap-0.5">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    isIconOnly
                                    onPress={() => openRenameGroup(g)}
                                    aria-label="Ubah nama grup"
                                    className="text-default-500 hover:text-foreground min-w-8 w-8"
                                  >
                                    <EditIcon />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    isIconOnly
                                    onPress={() => openDeleteGroupConfirm(g)}
                                    aria-label="Hapus grup"
                                    className="text-default-400 hover:text-red-600 min-w-8 w-8"
                                  >
                                    <TrashIcon />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              {expandedGroupId != null ? (
                <aside className="w-full sm:min-w-80 sm:flex-1 min-w-0 flex flex-col rounded-lg border border-default-200/60 bg-default-50/50 overflow-hidden min-h-0">
                  <div className="shrink-0 flex items-center justify-between gap-2 py-3 px-3 border-b border-default-200/60 bg-default-100/80">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {groupsList.find((x) => x.id === expandedGroupId)?.name ??
                        "Grup"}
                    </h3>
                    <Button
                      size="sm"
                      variant="ghost"
                      isIconOnly
                      onPress={closeGroupPanel}
                      aria-label="Tutup panel"
                      className="text-default-500 hover:text-foreground min-w-8 w-8"
                    >
                      <CloseIcon />
                    </Button>
                  </div>
                  <div className="flex-1 min-h-0 overflow-auto p-3">
                    {groupGuestsLoading ? (
                      <div className="flex items-center gap-2 text-default-500 text-sm">
                        <Spinner size="sm" />
                        <span>Memuat daftar tamu…</span>
                      </div>
                    ) : groupGuests.length === 0 ? (
                      <p className="text-sm text-default-500">
                        Tidak ada tamu dalam grup ini.
                      </p>
                    ) : (
                      <ul className="text-sm text-foreground space-y-1">
                        {groupGuests.map((guest) => (
                          <li
                            key={guest.id}
                            className="flex items-center justify-between gap-2 py-2 px-2 rounded-md hover:bg-default-100/50"
                          >
                            <span className="min-w-0 truncate">
                              {guest.name}
                              {guest.address ? (
                                <span className="text-default-500 block truncate text-xs mt-0.5">
                                  {" "}
                                  — {guest.address}
                                </span>
                              ) : null}
                            </span>
                            <div className="flex shrink-0 gap-0.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                isIconOnly
                                onPress={() => startEdit(guest)}
                                aria-label={`Ubah ${guest.name}`}
                                className="text-default-500 hover:text-foreground min-w-8 w-8"
                              >
                                <EditIcon />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                isIconOnly
                                onPress={() => openDeleteConfirm(guest)}
                                aria-label={`Hapus ${guest.name}`}
                                className="text-default-400 hover:text-red-600 min-w-8 w-8"
                              >
                                <TrashIcon />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </aside>
              ) : (
                <div className="hidden sm:flex w-80 shrink-0 items-center justify-center rounded-lg border border-dashed border-default-200/60 bg-default-50/30 text-default-500 text-sm">
                  Klik grup untuk melihat isi
                </div>
              )}
            </div>
          </div>
          )}
          </div>
        </div>

        {activeTab === "list" ? (
          <div className="fixed bottom-0 left-0 right-0 z-10 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:hidden">
            <TextField
              fullWidth
              name="search-mobile"
              value={searchQuery}
              onChange={setSearchQuery}
            >
              <Label className="sr-only">Cari tamu</Label>
              <Input
                variant="secondary"
                placeholder="Cari nama, alamat, lokasi, atau nomor WA…"
                className="rounded-full border border-default-200 shadow-none"
              />
            </TextField>
          </div>
        ) : null}

        <Modal>
          <Modal.Backdrop
            isOpen={waTemplateModalOpen}
            onOpenChange={(open) => !open && closeWaTemplateModal()}
          >
            <Modal.Container>
              <Modal.Dialog className="w-[calc(100vw-1rem)] max-w-[min(100vw-2rem,88rem)] overflow-hidden sm:w-[min(100vw-1.5rem,70rem)]">
                <Modal.CloseTrigger />
                <Modal.Header className="border-b border-default-200/80 pb-3">
                  <Modal.Heading className="text-lg">
                    Pesan WhatsApp undangan digital
                  </Modal.Heading>
                </Modal.Header>
                <Modal.Body className="grid min-h-0 max-h-[min(90vh,820px)] grid-cols-1 gap-4 overflow-y-auto p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,440px)] lg:items-stretch lg:gap-5 lg:overflow-hidden lg:p-5">
                  <div className="flex min-h-0 min-w-0 flex-col gap-2 lg:max-h-[min(80vh,680px)] lg:min-h-[min(60vh,420px)]">
                    <Label
                      htmlFor="wa-invite-template"
                      className="shrink-0 text-sm font-medium text-foreground"
                    >
                      Teks pesan
                    </Label>
                    <div className="flex min-h-[min(40vh,260px)] flex-1 flex-col overflow-hidden rounded-xl border border-default-200/80 bg-default-50/50 shadow-sm lg:min-h-0">
                      <textarea
                        ref={waTemplateTextareaRef}
                        id="wa-invite-template"
                        value={waTemplateDraft}
                        onChange={(e) => setWaTemplateDraft(e.target.value)}
                        rows={14}
                        className="min-h-[min(36vh,240px)] w-full flex-1 resize-y border-0 bg-transparent px-3 py-3 text-sm leading-relaxed text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-default-400 font-mono lg:min-h-[320px] lg:overflow-y-auto"
                        spellCheck={false}
                      />
                    </div>
                  </div>

                  <aside
                    className="flex min-h-0 w-full flex-col gap-3 rounded-xl border border-default-200/80 bg-default-100/70 p-3 shadow-sm lg:max-h-[min(80vh,680px)] lg:min-h-0 lg:h-full lg:shrink-0 lg:overflow-y-auto lg:overscroll-contain"
                    aria-label="Configuration"
                  >
                    <div className="shrink-0 border-b border-default-200/70 pb-2">
                      <h2 className="text-sm font-semibold tracking-tight text-foreground">
                        Configuration
                      </h2>
                    </div>

                    {waTemplateEmojiView ? (
                      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onPress={closeWaEmojiPanel}
                          className="w-fit shrink-0 gap-1.5 px-3"
                        >
                          <ArrowLeftIcon />
                          Kembali
                        </Button>
                        <p className="shrink-0 text-xs text-default-500">
                          Pilih emoji untuk disisipkan di posisi kursor pada
                          teks pesan.
                        </p>
                        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-y-auto rounded-lg border border-default-200/60 bg-white p-1 shadow-inner">
                          <Suspense
                            fallback={
                              <div className="flex h-[540px] w-full min-w-0 items-center justify-center gap-2 text-default-500 text-sm">
                                <Spinner size="sm" />
                                <span>Memuat emoji…</span>
                              </div>
                            }
                          >
                            <EmojiPickerLazy
                              onEmojiClick={handleWaEmojiPicked}
                              theme={Theme.LIGHT}
                              emojiStyle={EmojiStyle.NATIVE}
                              width="100%"
                              height={540}
                              lazyLoadEmojis
                              searchPlaceholder="Cari emoji…"
                              searchClearButtonLabel="Hapus"
                              autoFocusSearch={false}
                              previewConfig={{
                                defaultEmoji: "1f64f",
                                showPreview: true,
                              }}
                            />
                          </Suspense>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs leading-relaxed text-default-600">
                          Format WhatsApp:{" "}
                          <code className="rounded bg-default-200/60 px-1 py-px font-mono text-[11px] text-foreground">
                            *tebal*
                          </code>
                          ,{" "}
                          <code className="rounded bg-default-200/60 px-1 py-px font-mono text-[11px] text-foreground">
                            _miring_
                          </code>
                          , dst. Gunakan ikon emoji di samping format untuk
                          memilih emoji lengkap.
                        </p>

                        <div
                          className="flex flex-col gap-2 rounded-lg border border-default-200/50 bg-default-50/80 px-2 py-2"
                          role="group"
                          aria-label="Alat penyunting pesan"
                        >
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-medium uppercase tracking-wide text-default-500">
                              Format WA
                            </span>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  className="h-8 min-w-8 shrink-0 rounded-md text-foreground"
                                  onPress={() =>
                                    wrapWaTemplateSelection("*", "*")
                                  }
                                  aria-label="Tebal (*teks*)"
                                >
                                  <WaToolbarBold />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  className="h-8 min-w-8 shrink-0 rounded-md text-foreground"
                                  onPress={() =>
                                    wrapWaTemplateSelection("_", "_")
                                  }
                                  aria-label="Miring (_teks_)"
                                >
                                  <WaToolbarItalic />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  className="h-8 min-w-8 shrink-0 rounded-md text-foreground"
                                  onPress={() =>
                                    wrapWaTemplateSelection("~", "~")
                                  }
                                  aria-label="Coret (~teks~)"
                                >
                                  <WaToolbarStrike />
                                </Button>
                                <span
                                  className="mx-0.5 hidden h-5 w-px shrink-0 bg-default-200 sm:inline"
                                  aria-hidden
                                />
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  className="h-8 min-w-8 shrink-0 rounded-md text-foreground"
                                  onPress={() =>
                                    wrapWaTemplateSelection("`", "`")
                                  }
                                  aria-label="Monospace (`teks`)"
                                >
                                  <WaToolbarCode />
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  isIconOnly
                                  className="h-8 min-w-8 shrink-0 rounded-md text-foreground"
                                  onPress={wrapWaTemplateCodeBlock}
                                  aria-label="Blok monospace (tiga backtick)"
                                >
                                  <WaToolbarBlock />
                                </Button>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                isIconOnly
                                className="h-8 min-w-8 shrink-0 rounded-md text-foreground"
                                onPress={openWaEmojiPanel}
                                aria-label="Buka pemilih emoji"
                              >
                                <EmojiFaceIcon />
                              </Button>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1 border-t border-default-200/60 pt-2">
                            <span className="mr-1 w-full text-[10px] font-medium uppercase tracking-wide text-default-500 sm:mr-1 sm:w-auto">
                              Variabel
                            </span>
                            {WA_TEMPLATE_PLACEHOLDER_CHIPS.map((chip) => (
                              <Button
                                key={chip.id}
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-7 min-h-7 rounded-full px-2.5 font-mono text-[11px]"
                                onPress={() =>
                                  insertWaTemplateSnippet(chip.snippet)
                                }
                                aria-label={`Sisipkan ${chip.snippet}`}
                              >
                                {chip.snippet}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <details className="group rounded-lg border border-default-200/60 bg-default-50/50 text-sm">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg px-3 py-2.5 font-medium text-foreground outline-none marker:hidden hover:bg-default-100/60 [&::-webkit-details-marker]:hidden">
                            <span>Bantuan placeholder</span>
                            <span
                              className="text-default-400 text-xs transition-transform group-open:rotate-180"
                              aria-hidden
                            >
                              ▼
                            </span>
                          </summary>
                          <div className="border-t border-default-200/60 px-3 pb-3 pt-2 text-xs text-default-600 space-y-2">
                            <p className="text-default-500">
                              Dipakai saat admin memilih &quot;Kirim undangan
                              WA&quot;.
                            </p>
                            <ul className="grid grid-cols-1 gap-1.5">
                              <li className="flex gap-2 rounded-md bg-default-100/50 px-2 py-1.5">
                                <code className="shrink-0 font-mono text-[11px] text-foreground">
                                  {`{{nama}}`}
                                </code>
                                <span>Nama tamu</span>
                              </li>
                              <li className="flex gap-2 rounded-md bg-default-100/50 px-2 py-1.5">
                                <code className="shrink-0 font-mono text-[11px] text-foreground">
                                  {`{{lokasi}}`}
                                </code>
                                <span>Lokasi resepsi</span>
                              </li>
                              <li className="flex gap-2 rounded-md bg-default-100/50 px-2 py-1.5">
                                <code className="shrink-0 font-mono text-[11px] text-foreground">
                                  {`{{shift}}`}
                                </code>
                                <span>Label sesi undangan</span>
                              </li>
                              <li className="flex gap-2 rounded-md bg-default-100/50 px-2 py-1.5">
                                <code className="shrink-0 font-mono text-[11px] text-foreground">
                                  {`{{tamu}}`}
                                </code>
                                <span>Tipe tamu</span>
                              </li>
                              <li className="flex flex-col gap-1 rounded-md bg-default-100/50 px-2 py-1.5 sm:flex-row sm:items-start sm:gap-2">
                                <code className="shrink-0 font-mono text-[11px] text-foreground">
                                  {`{{undanganDigital}}`}
                                </code>
                                <span>
                                  Blok tautan dari{" "}
                                  <code className="rounded bg-default-200/60 px-1 font-mono text-[10px]">
                                    PUBLIC_DIGITAL_INVITATION_URL
                                  </code>{" "}
                                  (kosong jika tidak diatur)
                                </span>
                              </li>
                            </ul>
                          </div>
                        </details>
                      </>
                    )}
                  </aside>
                </Modal.Body>
                <Modal.Footer className="flex flex-col-reverse gap-2 border-t border-default-200/80 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={closeWaTemplateModal}
                    >
                      Batal
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={resetWaTemplateDraft}
                    >
                      Reset ke bawaan
                    </Button>
                  </div>
                  <Button
                    type="button"
                    variant="primary"
                    onPress={saveWaTemplate}
                  >
                    Simpan
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={addGuestModalOpen}
            onOpenChange={(open) => !open && setAddGuestModalOpen(false)}
          >
            <Modal.Container>
              <Modal.Dialog className="flex w-[calc(100vw-1.5rem)] max-h-[min(90dvh,900px)] max-w-4xl flex-col overflow-hidden sm:w-full">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Tambah tamu</Modal.Heading>
                </Modal.Header>
                <Modal.Body className="min-h-0 overflow-y-auto px-3 pb-4 pt-2 sm:px-6">
                  {renderAddGuestForm()}
                </Modal.Body>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={editingId !== null}
            onOpenChange={(open) => !open && closeEditModal()}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-md">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Ubah tamu</Modal.Heading>
                </Modal.Header>
                <form onSubmit={handleEditSubmit}>
                  <Modal.Body className="flex flex-col gap-4 px-1 pt-4">
                    <TextField
                      isRequired
                      fullWidth
                      name="edit-name"
                      value={name}
                      onChange={setName}
                    >
                      <Label>Nama</Label>
                      <Input variant="secondary" placeholder="Nama tamu" />
                    </TextField>
                    <TextField
                      fullWidth
                      name="edit-address"
                      value={address}
                      onChange={setAddress}
                    >
                      <Label>Alamat</Label>
                      <Input variant="secondary" placeholder="Alamat" />
                    </TextField>
                    <TextField
                      fullWidth
                      name="edit-phone"
                      value={phone}
                      onChange={setPhone}
                    >
                      <Label>Nomor WhatsApp</Label>
                      <Input
                        variant="secondary"
                        placeholder="Contoh: 0812… atau 62812…"
                        inputMode="tel"
                        autoComplete="tel"
                      />
                    </TextField>
                    <RadioGroup
                      name="edit-weddingLocation"
                      value={weddingLocation}
                      onChange={handleWeddingLocationChange}
                      variant="secondary"
                      orientation="horizontal"
                    >
                      <Label>Lokasi resepsi</Label>
                      <Radio value="Semarang">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Label>Semarang</Label>
                        </Radio.Content>
                      </Radio>
                      <Radio value="Magetan">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Label>Magetan</Label>
                        </Radio.Content>
                      </Radio>
                    </RadioGroup>
                    <Select
                      fullWidth
                      name="edit-invitationTime"
                      placeholder="Pilih shift"
                      variant="secondary"
                      value={getShiftKeyFromTime(invitationTime || null)}
                      onChange={(key) =>
                        setInvitationTime(
                          applyShiftToInvitationTime(
                            invitationTime,
                            weddingLocation,
                            String(key ?? "shift1"),
                          ),
                        )
                      }
                    >
                      <Label>Waktu undangan (Shift)</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          {SHIFT_OPTIONS.map((opt) => (
                            <ListBox.Item
                              key={opt.value}
                              id={opt.value}
                              textValue={opt.label}
                            >
                              {opt.label}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                    <RadioGroup
                      name="edit-invitationType"
                      value={invitationType}
                      onChange={setInvitationType}
                      variant="secondary"
                      orientation="horizontal"
                    >
                      <Label>Tipe undangan</Label>
                      <Radio value="digital">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Label>Digital</Label>
                        </Radio.Content>
                      </Radio>
                      <Radio value="physical">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Label>Fisik</Label>
                        </Radio.Content>
                      </Radio>
                    </RadioGroup>
                    <RadioGroup
                      name="edit-guestType"
                      value={guestType}
                      onChange={setGuestType}
                      variant="secondary"
                      orientation="horizontal"
                    >
                      <Label>Tamu</Label>
                      <Radio value="sendiri">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Label>Sendiri</Label>
                        </Radio.Content>
                      </Radio>
                      <Radio value="sekaliyan">
                        <Radio.Control>
                          <Radio.Indicator />
                        </Radio.Control>
                        <Radio.Content>
                          <Label>Sekaliyan</Label>
                        </Radio.Content>
                      </Radio>
                    </RadioGroup>
                    <ComboBox
                      fullWidth
                      allowsCustomValue
                      inputValue={guestGroup}
                      onInputChange={setGuestGroup}
                      selectedKey={guestGroup || null}
                      onSelectionChange={(key) =>
                        setGuestGroup(key != null ? String(key) : "")
                      }
                      className="w-full"
                    >
                      <Label>Grup tamu</Label>
                      <ComboBox.InputGroup>
                        <Input placeholder="Pilih atau ketik grup baru..." />
                        <ComboBox.Trigger />
                      </ComboBox.InputGroup>
                      <ComboBox.Popover>
                        <ListBox>
                          {guestGroupOptions.map((opt) => (
                            <ListBox.Item key={opt} id={opt} textValue={opt}>
                              {opt}
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </ComboBox.Popover>
                    </ComboBox>
                  </Modal.Body>
                  <Modal.Footer className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={closeEditModal}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      isPending={submitting}
                      variant="primary"
                    >
                      {({ isPending }) => (isPending ? "Menyimpan…" : "Simpan")}
                    </Button>
                  </Modal.Footer>
                </form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={deleteConfirmGuest !== null}
            onOpenChange={(open) => !open && closeDeleteConfirm()}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-sm">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Hapus tamu</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-default-600">
                    Hapus{" "}
                    <span className="font-medium text-foreground">
                      {deleteConfirmGuest?.name}
                    </span>{" "}
                    dari daftar? Tindakan ini tidak dapat dibatalkan.
                  </p>
                </Modal.Body>
                <Modal.Footer className="flex gap-2">
                  <Button variant="secondary" onPress={closeDeleteConfirm}>
                    Batal
                  </Button>
                  <Button
                    variant="danger"
                    isPending={deleting}
                    onPress={confirmDelete}
                  >
                    {({ isPending }) => (isPending ? "Menghapus…" : "Hapus")}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={adminLoginModalOpen}
            onOpenChange={(open) => !open && closeAdminLoginModal()}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-sm">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Masuk admin</Modal.Heading>
                </Modal.Header>
                <form onSubmit={handleAdminLoginSubmit}>
                  <Modal.Body className="flex flex-col gap-4">
                    {adminLoginError ? (
                      <p className="text-sm text-red-700 dark:text-red-300">
                        {adminLoginError}
                      </p>
                    ) : null}
                    <TextField
                      fullWidth
                      name="adminUsername"
                      value={adminLoginUsername}
                      onChange={setAdminLoginUsername}
                      autoComplete="username"
                    >
                      <Label>Nama pengguna</Label>
                      <Input variant="secondary" placeholder="admin" />
                    </TextField>
                    <TextField
                      fullWidth
                      name="adminPassword"
                      value={adminLoginPassword}
                      onChange={setAdminLoginPassword}
                      autoComplete="current-password"
                    >
                      <Label>Kata sandi</Label>
                      <Input
                        variant="secondary"
                        type="password"
                        placeholder="••••••••"
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={closeAdminLoginModal}
                    >
                      Batal
                    </Button>
                    <Button type="submit" variant="primary">
                      Masuk
                    </Button>
                  </Modal.Footer>
                </form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={addGroupOpen}
            onOpenChange={(open) => !open && closeAddGroup()}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-sm">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Tambah grup tamu</Modal.Heading>
                </Modal.Header>
                <form onSubmit={handleAddGroup}>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField
                      fullWidth
                      name="newGroupName"
                      value={newGroupName}
                      onChange={setNewGroupName}
                    >
                      <Label>Nama grup</Label>
                      <Input
                        variant="secondary"
                        placeholder="Contoh: Teman Kantor"
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={closeAddGroup}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isPending={addGroupSubmitting}
                    >
                      {({ isPending }) => (isPending ? "Menambah…" : "Tambah")}
                    </Button>
                  </Modal.Footer>
                </form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={renameGroupOpen}
            onOpenChange={(open) => !open && closeRenameGroup()}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-sm">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Ubah nama grup</Modal.Heading>
                </Modal.Header>
                <form onSubmit={handleRenameGroup}>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField
                      fullWidth
                      name="renameGroupName"
                      value={renameGroupName}
                      onChange={setRenameGroupName}
                    >
                      <Label>Nama grup</Label>
                      <Input variant="secondary" placeholder="Nama grup" />
                    </TextField>
                    <Select
                      fullWidth
                      placeholder="Shift (opsional)"
                      variant="secondary"
                      value={renameGroupShift}
                      onChange={(key) =>
                        setRenameGroupShift(key == null ? "all" : String(key))
                      }
                    >
                      <Label>Terapkan shift ke semua tamu di grup</Label>
                      <Select.Trigger>
                        <Select.Value />
                        <Select.Indicator />
                      </Select.Trigger>
                      <Select.Popover>
                        <ListBox>
                          <ListBox.Item
                            id="all"
                            textValue="Tidak mengubah shift"
                          >
                            <span className="text-sm">
                              Tidak mengubah shift
                            </span>
                            <ListBox.ItemIndicator />
                          </ListBox.Item>
                          {SHIFT_OPTIONS.map((opt) => (
                            <ListBox.Item
                              key={opt.value}
                              id={opt.value}
                              textValue={opt.label}
                            >
                              <span className="text-sm">{opt.label}</span>
                              <ListBox.ItemIndicator />
                            </ListBox.Item>
                          ))}
                        </ListBox>
                      </Select.Popover>
                    </Select>
                  </Modal.Body>
                  <Modal.Footer className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={closeRenameGroup}
                    >
                      Batal
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      isPending={renameGroupSubmitting}
                    >
                      {({ isPending }) => (isPending ? "Menyimpan…" : "Simpan")}
                    </Button>
                  </Modal.Footer>
                </form>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>

        <Modal>
          <Modal.Backdrop
            isOpen={deleteGroupConfirm !== null}
            onOpenChange={(open) => !open && closeDeleteGroupConfirm()}
          >
            <Modal.Container>
              <Modal.Dialog className="sm:max-w-sm">
                <Modal.CloseTrigger />
                <Modal.Header>
                  <Modal.Heading>Hapus grup</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-default-600">
                    Hapus grup{" "}
                    <span className="font-medium text-foreground">
                      {deleteGroupConfirm?.name}
                    </span>
                    ?{" "}
                    {deleteGroupConfirm?.guestCount
                      ? `${deleteGroupConfirm.guestCount} tamu akan tidak memiliki grup. `
                      : ""}
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                </Modal.Body>
                <Modal.Footer className="flex gap-2">
                  <Button variant="secondary" onPress={closeDeleteGroupConfirm}>
                    Batal
                  </Button>
                  <Button
                    variant="danger"
                    isPending={deleteGroupSubmitting}
                    onPress={confirmDeleteGroup}
                  >
                    {({ isPending }) => (isPending ? "Menghapus…" : "Hapus")}
                  </Button>
                </Modal.Footer>
              </Modal.Dialog>
            </Modal.Container>
          </Modal.Backdrop>
        </Modal>
      </div>
    </div>
  );
}
