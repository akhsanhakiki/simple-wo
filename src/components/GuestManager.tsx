import {
  Button,
  Card,
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
import { useCallback, useEffect, useMemo, useState } from "react";

const INVITATION_TYPE_LABELS: Record<string, string> = {
  physical: "Fisik",
  digital: "Digital",
};

type Guest = {
  id: number;
  name: string;
  address: string | null;
  weddingLocation: string | null;
  invitationTime: string | null;
  invitationType: string | null;
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

export default function GuestManager() {
  const [guests, setGuests] = useState<Guest[]>([]);
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
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [invitationTypeFilter, setInvitationTypeFilter] =
    useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("add");

  const loadGuests = useCallback(async () => {
    const res = await fetch("/api/guests");
    if (!res.ok) throw new Error("Failed to load guests");
    return res.json() as Promise<Guest[]>;
  }, []);

  useEffect(() => {
    loadGuests()
      .then(setGuests)
      .catch(() =>
        setError(
          "Tidak dapat memuat tamu. Periksa koneksi Anda dan coba lagi.",
        ),
      )
      .finally(() => setLoading(false));
  }, [loadGuests]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setAddress("");
    setWeddingLocation("");
    setInvitationTime("");
    setInvitationType("digital");
  }, []);

  const startEdit = useCallback((g: Guest) => {
    setEditingId(g.id);
    setName(g.name);
    setAddress(g.address ?? "");
    setWeddingLocation(g.weddingLocation ?? "");
    setInvitationTime(toDatetimeLocal(g.invitationTime));
    setInvitationType(g.invitationType === "physical" ? "physical" : "digital");
  }, []);

  const uniqueLocations = useMemo(
    () =>
      [
        ...new Set(guests.map((g) => g.weddingLocation).filter(Boolean)),
      ] as string[],
    [guests],
  );
  const filteredGuests = useMemo(() => {
    let list =
      locationFilter === "all" || locationFilter === ""
        ? guests
        : guests.filter((g) => (g.weddingLocation ?? "") === locationFilter);
    if (invitationTypeFilter !== "all" && invitationTypeFilter !== "") {
      list = list.filter(
        (g) => (g.invitationType ?? "") === invitationTypeFilter,
      );
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.address?.toLowerCase().includes(q) ?? false) ||
          (g.weddingLocation?.toLowerCase().includes(q) ?? false),
      );
    }
    return list;
  }, [guests, locationFilter, invitationTypeFilter, searchQuery]);

  const closeEditModal = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleWeddingLocationChange = useCallback((value: string) => {
    setWeddingLocation(value);
    const defaultTime = DEFAULT_INVITATION_TIME[value];
    if (defaultTime) setInvitationTime(defaultTime);
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
          }),
        });
        if (!res.ok) return;
        resetForm();
        const list = await loadGuests();
        setGuests(list);
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
      resetForm,
      loadGuests,
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
            }),
          });
          if (!res.ok) return;
        }
        resetForm();
        const list = await loadGuests();
        setGuests(list);
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
      resetForm,
      loadGuests,
    ],
  );

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
      const list = await loadGuests();
      setGuests(list);
      if (editingId === guest.id) resetForm();
      closeDeleteConfirm();
    } finally {
      setDeleting(false);
    }
  }, [
    deleteConfirmGuest,
    editingId,
    loadGuests,
    resetForm,
    closeDeleteConfirm,
  ]);

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
            Total: {guests.length} tamu undangan
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
                <TextField
                  fullWidth
                  name="invitationTime"
                  value={invitationTime}
                  onChange={setInvitationTime}
                >
                  <Label>Waktu undangan</Label>
                  <Input
                    variant="secondary"
                    type="datetime-local"
                    value={invitationTime}
                    onChange={(e) => setInvitationTime(e.target.value)}
                  />
                </TextField>
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
            id="list"
            className="flex min-h-0 flex-1 flex-col overflow-hidden pt-2 pb-16 sm:pb-6"
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
                    </div>
                    <p
                      className="text-default-500 text-xs text-center"
                      aria-live="polite"
                    >
                      Total: {filteredGuests.length} tamu undangan
                      {locationFilter ? ` di ${locationFilter}` : ""}
                    </p>
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
                    <p
                      className="text-default-500 text-xs shrink-0 sm:ml-auto"
                      aria-live="polite"
                    >
                      Total: {filteredGuests.length} tamu undangan
                      {locationFilter ? ` di ${locationFilter}` : ""}
                    </p>
                  </div>
                </div>
                {guests.length === 0 ? (
                  <Card variant="secondary" className="p-6">
                    <Card.Content>
                      <p className="text-default-500">
                        Belum ada tamu. Tambahkan dari tab pertama.
                      </p>
                    </Card.Content>
                  </Card>
                ) : filteredGuests.length === 0 ? (
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
                      {filteredGuests.map((g: Guest, index: number) => (
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
                                INVITATION_TYPE_LABELS[
                                  g.invitationType ?? ""
                                ] ?? "—",
                                g.weddingLocation,
                                g.address,
                                formatInvitationTime(g.invitationTime),
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
                              Lokasi
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
                          {filteredGuests.map((g: Guest, index: number) => (
                            <tr
                              key={g.id}
                              className="border-b border-default-200/40 last:border-b-0 hover:bg-default-100/50 transition-colors"
                            >
                              <td className="py-2 px-3 tabular-nums text-default-600">
                                {index + 1}
                              </td>
                              <td className="py-2 px-3 font-medium text-foreground">
                                {g.name}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden md:table-cell">
                                {g.weddingLocation ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden lg:table-cell">
                                {INVITATION_TYPE_LABELS[
                                  g.invitationType ?? ""
                                ] ?? "—"}
                              </td>
                              <td className="py-2 px-3 text-default-600 hidden lg:table-cell">
                                {formatInvitationTime(g.invitationTime)}
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
                    <TextField
                      fullWidth
                      name="edit-invitationTime"
                      value={invitationTime}
                      onChange={setInvitationTime}
                    >
                      <Label>Waktu undangan</Label>
                      <Input
                        variant="secondary"
                        type="datetime-local"
                        value={invitationTime}
                        onChange={(e) => setInvitationTime(e.target.value)}
                      />
                    </TextField>
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
      </div>
    </div>
  );
}
