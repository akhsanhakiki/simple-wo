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
  Tabs,
} from "@heroui/react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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
  weddingLocation: string | null;
  invitationTime: string | null;
  invitationType: string | null;
  guestType: string | null;
  guestGroup: string | null;
};

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

const SHIFT_OPTIONS = [
  { value: "shift1", label: "Shift 1: 10.00 - 11.00", startTime: "10:00" },
  { value: "shift2", label: "Shift 2: 11.00 - 12.30", startTime: "11:00" },
  { value: "shift3", label: "Shift 3: 12.30 - 13.00", startTime: "12:30" },
] as const;

function getShiftKeyFromTime(iso: string | null): string {
  if (!iso) return SHIFT_OPTIONS[0].value;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return SHIFT_OPTIONS[0].value;
  const h = d.getHours();
  const m = d.getMinutes();
  if (h === 10 && m === 0) return "shift1";
  if (h === 11 && m === 0) return "shift2";
  if (h === 12 && m === 30) return "shift3";
  return SHIFT_OPTIONS[0].value;
}

function getShiftLabelFromInvitationTime(iso: string | null): string {
  const key = getShiftKeyFromTime(iso);
  return SHIFT_OPTIONS.find((s) => s.value === key)?.label ?? "—";
}

function applyShiftToInvitationTime(
  currentInvitationTime: string,
  weddingLocation: string,
  shiftKey: string
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

const LIST_PAGE_SIZE = 15;

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
  const [renameGroupTarget, setRenameGroupTarget] = useState<GuestGroupWithCount | null>(null);
  const [renameGroupName, setRenameGroupName] = useState("");
  const [renameGroupShift, setRenameGroupShift] = useState<string>("all");
  const [renameGroupSubmitting, setRenameGroupSubmitting] = useState(false);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<GuestGroupWithCount | null>(null);
  const [deleteGroupSubmitting, setDeleteGroupSubmitting] = useState(false);
  const [expandedGroupId, setExpandedGroupId] = useState<number | null>(null);
  const [groupGuests, setGroupGuests] = useState<Guest[]>([]);
  const [groupGuestsLoading, setGroupGuestsLoading] = useState(false);
  const [desktopPage, setDesktopPage] = useState(1);
  const [mobileVisibleCount, setMobileVisibleCount] = useState(LIST_PAGE_SIZE);
  const [isDesktop, setIsDesktop] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmGuest, setDeleteConfirmGuest] = useState<Guest | null>(
    null,
  );
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
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
  const [activeTab, setActiveTab] = useState<string>("add");
  const [exportPdfLoading, setExportPdfLoading] = useState(false);
  const refreshGroupViewAfterEditRef = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(searchQuery), 800);
    return () => clearTimeout(t);
  }, [searchQuery]);

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
  }, [searchDebounced, locationFilter, invitationTypeFilter, guestTypeFilter, groupFilter]);

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

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setAddress("");
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
      doc.text(
        filterDesc ? `${title} (${filterDesc})` : title,
        10,
        8,
      );
      doc.save(`daftar-tamu-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      setError("Gagal mengunduh PDF. Coba lagi.");
    } finally {
      setExportPdfLoading(false);
    }
  }, [
    searchDebounced,
    locationFilter,
    invitationTypeFilter,
    guestTypeFilter,
  ]);

  const closeEditModal = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleWeddingLocationChange = useCallback((value: string) => {
    setWeddingLocation(value);
    setInvitationTime(
      applyShiftToInvitationTime("", value, SHIFT_OPTIONS[0].value)
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
        refreshGroupViewAfterEditRef.current = true;
      } finally {
        setSubmitting(false);
      }
    },
    [
      editingId,
      name,
      address,
      weddingLocation,
      invitationTime,
      invitationType,
      guestType,
      guestGroup,
      resetForm,
      loadList,
    ],
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
        await loadList();
      } finally {
        setSubmitting(false);
      }
    },
    [
      editingId,
      name,
      address,
      weddingLocation,
      invitationTime,
      invitationType,
      guestType,
      guestGroup,
      resetForm,
      loadList,
    ],
  );

  const guestGroupOptions = useMemo(() => guestGroupNames, [guestGroupNames]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    setGroupsError(null);
    try {
      const res = await fetch("/api/guest-groups");
      if (!res.ok) throw new Error("Failed to load groups");
      const data = (await res.json()) as GuestGroupWithCount[];
      setGroupsList(data);
    } catch {
      setGroupsError("Tidak dapat memuat grup tamu.");
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "groups") loadGroups();
  }, [activeTab, loadGroups]);

  const loadGuestsForGroup = useCallback(async (groupName: string) => {
    setGroupGuestsLoading(true);
    try {
      const params = new URLSearchParams({
        guestGroup: groupName,
        limit: "500",
      });
      const res = await fetch(`/api/guests?${params}`);
      if (!res.ok) throw new Error("Failed to load guests");
      const json = (await res.json()) as GuestsResponse;
      setGroupGuests(json.data);
    } catch {
      setGroupGuests([]);
    } finally {
      setGroupGuestsLoading(false);
    }
  }, []);

  const selectGroupForPanel = useCallback(
    (g: GuestGroupWithCount) => {
      setExpandedGroupId(g.id);
      loadGuestsForGroup(g.name);
    },
    [loadGuestsForGroup],
  );

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

  const handleAddGroup = useCallback(async (e: React.FormEvent) => {
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
    } finally {
      setAddGroupSubmitting(false);
    }
  }, [newGroupName, closeAddGroup, loadGroups, loadList]);

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

  const handleRenameGroup = useCallback(async (e: React.FormEvent) => {
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
          `/api/guests?${new URLSearchParams({ guestGroup: trimmed, limit: "500" })}`
        );
        if (guestRes.ok) {
          const json = (await guestRes.json()) as GuestsResponse;
          const guestsToUpdate = json.data ?? [];
          await Promise.all(
            guestsToUpdate.map((g) => {
              const newTime = applyShiftToInvitationTime(
                g.invitationTime ? toDatetimeLocal(g.invitationTime) : "",
                g.weddingLocation ?? "",
                shiftKey
              );
              return fetch(`/api/guests/${g.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  name: g.name,
                  address: g.address ?? null,
                  weddingLocation: g.weddingLocation ?? null,
                  invitationTime: newTime || null,
                  invitationType: g.invitationType ?? "digital",
                  guestType: g.guestType ?? "sendiri",
                  guestGroup: g.guestGroup ?? null,
                }),
              });
            })
          );
        }
      }
      closeRenameGroup();
      await loadGroups();
      await loadList();
    } finally {
      setRenameGroupSubmitting(false);
    }
  }, [renameGroupTarget, renameGroupName, renameGroupShift, closeRenameGroup, loadGroups, loadList]);

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
      const res = await fetch(`/api/guest-groups/${g.id}`, { method: "DELETE" });
      if (!res.ok) return;
      closeDeleteGroupConfirm();
      await loadGroups();
      await loadList();
    } finally {
      setDeleteGroupSubmitting(false);
    }
  }, [deleteGroupConfirm, closeDeleteGroupConfirm, loadGroups, loadList]);

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
  }, [deleteConfirmGuest, editingId, loadList, loadGroups, expandedGroupId, groupsList, loadGuestsForGroup, resetForm, closeDeleteConfirm]);

  return (
    <div className="flex min-h-dvh max-h-dvh flex-col overflow-x-hidden bg-linear-to-br from-default-50 to-default-100 py-4 px-4">
      <div className="mx-auto flex min-h-0 w-full flex-1 flex-col gap-6">
        <header className="flex shrink-0 flex-col items-center justify-center overflow-hidden text-center bg-linear-to-br from-default-50 to-default-100">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Daftar tamu undangan
          </h1>
          <p className="mt-1 text-default-500 text-xs">
            Made with{" "}
            <span role="img" aria-label="heart">
              ❤️
            </span>{" "}
            by Haki Studio
          </p>
          <p className="pt-2 text-gray-400 text-xs" aria-live="polite">
            Total: {totalAll} tamu undangan
          </p>
        </header>

        <Tabs
          className="flex min-h-0 w-full flex-1 flex-col"
          selectedKey={activeTab}
          onSelectionChange={(key) =>
            setActiveTab(key === null ? "add" : String(key))
          }
        >
          <Tabs.ListContainer className="shrink-0 overflow-hidden bg-linear-to-br from-default-50 to-default-100 pb-2 -mx-4 px-4">
            <Tabs.List aria-label="Kelola tamu">
              <Tabs.Tab id="add">
                Tambah tamu
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="list">
                Tamu undangan
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="groups">
                Grup tamu
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel
            id="add"
            className="flex min-h-0 flex-1 flex-col overflow-auto pt-2"
          >
            <div className="flex w-full flex-col gap-5 items-center justify-center">
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
                <TextField
                  fullWidth
                  name="address"
                  value={address}
                  onChange={setAddress}
                >
                  <Label>Alamat Tamu</Label>
                  <Input variant="secondary" placeholder="Alamat" />
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
                        String(key ?? "shift1")
                      )
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
                        <ListBox.Item
                          key={opt}
                          id={opt}
                          textValue={opt}
                        >
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
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={resetForm}
                    >
                      Batal
                    </Button>
                  ) : null}
                </div>
              </form>
            </div>
          </Tabs.Panel>
          <Tabs.Panel
            id="groups"
            className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2"
          >
            <div className="flex flex-1 min-h-0 gap-4 w-full max-w-full mx-auto">
              <div className="flex flex-col gap-4 min-w-0 flex-1">
                <div className="flex flex-row items-center justify-between gap-2">
                  <h2 className="text-lg font-medium text-foreground">Daftar grup tamu</h2>
                  <Button variant="primary" onPress={openAddGroup}>
                    Tambah grup
                  </Button>
                </div>
                {groupsError ? (
                  <Card className="border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950" variant="default">
                    <Card.Content>
                      <p className="text-red-700 dark:text-red-300">{groupsError}</p>
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
                      <p className="text-default-500">Belum ada grup. Klik &quot;Tambah grup&quot; untuk membuat.</p>
                    </Card.Content>
                  </Card>
                ) : (
                  <div className="rounded-lg border border-default-200/60 bg-default-50/30 overflow-hidden flex-1 min-h-0 flex flex-col">
                    <div className="overflow-auto min-h-0">
                      <table className="w-full border-collapse text-sm">
                        <thead className="bg-default-100/95 border-b border-default-200/60 sticky top-0">
                          <tr>
                            <th className="text-left py-2.5 px-3 text-xs font-medium text-default-500">Grup</th>
                            <th className="text-right py-2.5 px-3 text-xs font-medium text-default-500 w-24">Tamu</th>
                            <th className="text-right py-2.5 px-3 text-xs font-medium text-default-500 w-32">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupsList.map((g) => (
                            <tr
                              key={g.id}
                              className={`border-b border-default-200/40 last:border-b-0 hover:bg-default-100/50 cursor-pointer ${expandedGroupId === g.id ? "bg-default-200/50" : ""}`}
                              onClick={() => selectGroupForPanel(g)}
                            >
                              <td className="py-2 px-3 font-medium text-foreground">{g.name}</td>
                              <td className="py-2 px-3 text-right tabular-nums text-default-600">{g.guestCount}</td>
                              <td className="py-2 px-3 text-right" onClick={(e) => e.stopPropagation()}>
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
                      {groupsList.find((x) => x.id === expandedGroupId)?.name ?? "Grup"}
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
                      <p className="text-sm text-default-500">Tidak ada tamu dalam grup ini.</p>
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
                                <span className="text-default-500 block truncate text-xs mt-0.5"> — {guest.address}</span>
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
          </Tabs.Panel>
          <Tabs.Panel
            id="list"
            className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2 pb-16 sm:pb-2"
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
                <div className="shrink-0 overflow-hidden bg-linear-to-br from-default-50 to-default-100 pb-2 -mx-4 px-4">
                  {/* Mobile: stacked layout */}
                  <div className="flex flex-col gap-2 sm:hidden">
                    <div className="flex flex-row items-center gap-2">
                      <Select
                        className="min-w-0 flex-1"
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
                              <ListBox.Item key={name} id={name} textValue={name}>
                                {name}
                                <ListBox.ItemIndicator />
                              </ListBox.Item>
                            ))}
                          </ListBox>
                        </Select.Popover>
                      </Select>
                    </div>
                    <p
                      className="text-default-500 text-xs text-center"
                      aria-live="polite"
                    >
                      Total: {totalFiltered} tamu undangan
                      {locationFilter && locationFilter !== "all"
                        ? ` di ${locationFilter}`
                        : ""}
                    </p>
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
                    <p
                      className="text-default-500 text-xs shrink-0 sm:ml-auto"
                      aria-live="polite"
                    >
                      Total: {totalFiltered} tamu undangan
                      {locationFilter && locationFilter !== "all"
                        ? ` di ${locationFilter}`
                        : ""}
                    </p>
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
                                getShiftLabelFromInvitationTime(g.invitationTime),
                              ]
                                .filter(Boolean)
                                .join(" · ")}
                            </p>
                          </div>
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
                                  }}
                                >
                                  <Dropdown.Item id="edit" textValue="Ubah">
                                    <Label>Ubah</Label>
                                  </Dropdown.Item>
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
                            <th className="text-right py-2.5 px-3 text-xs font-medium text-default-500 w-20">
                              Aksi
                            </th>
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
                              <td className="py-2 px-3 text-default-600 hidden md:table-cell max-w-[200px] truncate" title={g.address ?? undefined}>
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
                                {getShiftLabelFromInvitationTime(g.invitationTime)}
                              </td>
                              <td className="py-2 px-3 text-right">
                                <div className="flex justify-end gap-0.5">
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
                            <span className="text-base leading-none" aria-hidden>‹</span>
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
                            <span className="text-base leading-none" aria-hidden>›</span>
                          </Button>
                        </nav>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </Tabs.Panel>
        </Tabs>

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
                placeholder="Cari berdasarkan nama, alamat, atau lokasi…"
                className="rounded-full border border-default-200 shadow-none"
              />
            </TextField>
          </div>
        ) : null}

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
                            String(key ?? "shift1")
                          )
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
                            <ListBox.Item
                              key={opt}
                              id={opt}
                              textValue={opt}
                            >
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
                    <TextField fullWidth name="newGroupName" value={newGroupName} onChange={setNewGroupName}>
                      <Label>Nama grup</Label>
                      <Input variant="secondary" placeholder="Contoh: Teman Kantor" />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer className="flex gap-2">
                    <Button type="button" variant="secondary" onPress={closeAddGroup}>
                      Batal
                    </Button>
                    <Button type="submit" variant="primary" isPending={addGroupSubmitting}>
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
                    <TextField fullWidth name="renameGroupName" value={renameGroupName} onChange={setRenameGroupName}>
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
                          <ListBox.Item id="all" textValue="Tidak mengubah shift">
                            <span className="text-sm">Tidak mengubah shift</span>
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
                    <Button type="button" variant="secondary" onPress={closeRenameGroup}>
                      Batal
                    </Button>
                    <Button type="submit" variant="primary" isPending={renameGroupSubmitting}>
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
                    <span className="font-medium text-foreground">{deleteGroupConfirm?.name}</span>?{" "}
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
