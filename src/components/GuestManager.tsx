import {
  Button,
  Card,
  Dropdown,
  Input,
  Label,
  ListBox,
  Modal,
  Select,
  Surface,
  TextField,
  Spinner,
  Tabs,
} from "@heroui/react";
import { useCallback, useEffect, useMemo, useState } from "react";

type Guest = {
  id: number;
  name: string;
  address: string | null;
  weddingLocation: string | null;
  invitationTime: string | null;
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
  const [locationFilter, setLocationFilter] = useState<string>("all");
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
        setError("Could not load guests. Check your connection and try again."),
      )
      .finally(() => setLoading(false));
  }, [loadGuests]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setName("");
    setAddress("");
    setWeddingLocation("");
    setInvitationTime("");
  }, []);

  const startEdit = useCallback((g: Guest) => {
    setEditingId(g.id);
    setName(g.name);
    setAddress(g.address ?? "");
    setWeddingLocation(g.weddingLocation ?? "");
    setInvitationTime(toDatetimeLocal(g.invitationTime));
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
  }, [guests, locationFilter, searchQuery]);

  const closeEditModal = useCallback(() => {
    resetForm();
  }, [resetForm]);

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
    <div className="min-h-screen bg-linear-to-br from-default-50 to-default-100 py-8 px-4">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Wedding guest list
          </h1>
          <p className="mt-1 text-default-500">Manage your invited guests</p>
        </header>

        <Tabs
          className="w-full"
          selectedKey={activeTab}
          onSelectionChange={(key) =>
            setActiveTab(key === null ? "add" : String(key))
          }
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Guest management">
              <Tabs.Tab id="add">
                Add guest
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="list">
                Invited people
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
          <Tabs.Panel id="add" className="pt-6">
            <Surface className="flex w-full flex-col gap-5 rounded-3xl p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <TextField
                  isRequired
                  fullWidth
                  name="name"
                  value={name}
                  onChange={setName}
                >
                  <Label>Name</Label>
                  <Input variant="secondary" placeholder="Guest name" />
                </TextField>
                <TextField
                  fullWidth
                  name="address"
                  value={address}
                  onChange={setAddress}
                >
                  <Label>Address</Label>
                  <Input variant="secondary" placeholder="Address" />
                </TextField>
                <TextField
                  fullWidth
                  name="weddingLocation"
                  value={weddingLocation}
                  onChange={setWeddingLocation}
                >
                  <Label>Wedding location</Label>
                  <Input
                    variant="secondary"
                    placeholder="e.g. Grand Ballroom"
                  />
                </TextField>
                <TextField
                  fullWidth
                  name="invitationTime"
                  value={invitationTime}
                  onChange={setInvitationTime}
                >
                  <Label>Invitation time</Label>
                  <Input
                    variant="secondary"
                    type="datetime-local"
                    value={invitationTime}
                    onChange={(e) => setInvitationTime(e.target.value)}
                  />
                </TextField>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button
                    type="submit"
                    isPending={submitting}
                    variant="primary"
                  >
                    {({ isPending }) =>
                      isPending
                        ? editingId
                          ? "Saving…"
                          : "Adding…"
                        : editingId
                          ? "Save"
                          : "Add guest"
                    }
                  </Button>
                  {editingId ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={resetForm}
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </form>
            </Surface>
          </Tabs.Panel>
          <Tabs.Panel id="list" className="pt-6 pb-24 sm:pb-6">
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
                <span>Loading…</span>
              </div>
            ) : guests.length === 0 ? (
              <Card variant="secondary" className="p-6">
                <Card.Content>
                  <p className="text-default-500">
                    No guests yet. Add one in the first tab.
                  </p>
                </Card.Content>
              </Card>
            ) : filteredGuests.length === 0 ? (
              <Card variant="secondary" className="p-6">
                <Card.Content>
                  <p className="text-default-500">
                    No guests match your search or filter. Try different terms
                    or location.
                  </p>
                </Card.Content>
              </Card>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="hidden sm:block">
                  <TextField
                    fullWidth
                    name="search"
                    value={searchQuery}
                    onChange={setSearchQuery}
                  >
                    <Label className="sr-only">Search guests</Label>
                    <Input
                      variant="secondary"
                      placeholder="Search by name, address, or location…"
                      className="rounded-full"
                    />
                  </TextField>
                </div>
                <Select
                  className="w-full sm:w-48"
                  placeholder="All locations"
                  value={locationFilter === "" ? "all" : locationFilter}
                  onChange={(key) =>
                    setLocationFilter(
                      key === "all" || key === null ? "" : String(key),
                    )
                  }
                >
                  <Label>Filter by location</Label>
                  <Select.Trigger>
                    <Select.Value />
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox>
                      <ListBox.Item id="all" textValue="All locations">
                        All locations
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
                <div className="flex flex-col gap-1">
                  {filteredGuests.map((g: Guest) => (
                    <div
                      key={g.id}
                      className="flex flex-row gap-1 rounded-lg border border-default-200/60 bg-default-50/50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <p className="truncate text-sm font-medium text-foreground">
                          {g.name}
                        </p>
                        <p className="truncate text-xs text-default-500">
                          {[
                            g.weddingLocation,
                            g.address,
                            formatInvitationTime(g.invitationTime),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <div className="sm:hidden">
                          <Dropdown>
                            <Button
                              size="sm"
                              variant="ghost"
                              isIconOnly
                              aria-label="Actions"
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
                                <Dropdown.Item id="edit" textValue="Edit">
                                  <Label>Edit</Label>
                                </Dropdown.Item>
                                <Dropdown.Item
                                  id="delete"
                                  textValue="Delete"
                                  variant="danger"
                                >
                                  <Label>Delete</Label>
                                </Dropdown.Item>
                              </Dropdown.Menu>
                            </Dropdown.Popover>
                          </Dropdown>
                        </div>
                        <div className="hidden gap-1 sm:flex">
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => startEdit(g)}
                            aria-label="Edit guest"
                            className="text-default-500 hover:text-foreground"
                          >
                            <EditIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            isIconOnly
                            onPress={() => openDeleteConfirm(g)}
                            aria-label="Delete guest"
                            className="text-default-400 hover:text-red-600"
                          >
                            <TrashIcon />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
              <Label className="sr-only">Search guests</Label>
              <Input
                variant="secondary"
                placeholder="Search by name, address, or location…"
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
                  <Modal.Heading>Edit guest</Modal.Heading>
                </Modal.Header>
                <form onSubmit={handleEditSubmit}>
                  <Modal.Body className="flex flex-col gap-4">
                    <TextField
                      isRequired
                      fullWidth
                      name="edit-name"
                      value={name}
                      onChange={setName}
                    >
                      <Label>Name</Label>
                      <Input variant="secondary" placeholder="Guest name" />
                    </TextField>
                    <TextField
                      fullWidth
                      name="edit-address"
                      value={address}
                      onChange={setAddress}
                    >
                      <Label>Address</Label>
                      <Input variant="secondary" placeholder="Address" />
                    </TextField>
                    <TextField
                      fullWidth
                      name="edit-weddingLocation"
                      value={weddingLocation}
                      onChange={setWeddingLocation}
                    >
                      <Label>Wedding location</Label>
                      <Input
                        variant="secondary"
                        placeholder="e.g. Grand Ballroom"
                      />
                    </TextField>
                    <TextField
                      fullWidth
                      name="edit-invitationTime"
                      value={invitationTime}
                      onChange={setInvitationTime}
                    >
                      <Label>Invitation time</Label>
                      <Input
                        variant="secondary"
                        type="datetime-local"
                        value={invitationTime}
                        onChange={(e) => setInvitationTime(e.target.value)}
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onPress={closeEditModal}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      isPending={submitting}
                      variant="primary"
                    >
                      {({ isPending }) => (isPending ? "Saving…" : "Save")}
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
                  <Modal.Heading>Remove guest</Modal.Heading>
                </Modal.Header>
                <Modal.Body>
                  <p className="text-default-600">
                    Remove{" "}
                    <span className="font-medium text-foreground">
                      {deleteConfirmGuest?.name}
                    </span>{" "}
                    from the list? This cannot be undone.
                  </p>
                </Modal.Body>
                <Modal.Footer className="flex gap-2">
                  <Button variant="secondary" onPress={closeDeleteConfirm}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    isPending={deleting}
                    onPress={confirmDelete}
                  >
                    {({ isPending }) => (isPending ? "Removing…" : "Remove")}
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
