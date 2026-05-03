export type GuestOverviewStats = {
  total: number;
  byLocation: { label: string; count: number }[];
  byInvitationType: { digital: number; physical: number; unset: number };
  byGuestType: { sekaliyan: number; sendiri: number; unset: number };
  byGroup: { name: string; count: number }[];
  byShift: { key: string; label: string; count: number }[];
  registeredGroupCount: number;
  emptyGroups: string[];
  digitalWithPhone: number;
  digitalWithoutPhone: number;
};
