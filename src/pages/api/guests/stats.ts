import type { APIRoute } from "astro";
import type { GuestOverviewStats } from "../../../lib/guest-overview-stats";
import { db } from "../../../lib/db";
import { guestGroups, guests } from "../../../lib/db/schema";
import { getShiftKeyFromTime, SHIFT_OPTIONS } from "../../../lib/guest-shift";

function invitationTimeToIso(
  t: Date | string | null | undefined,
): string | null {
  if (t == null) return null;
  if (t instanceof Date) return t.toISOString();
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export const GET: APIRoute = async () => {
  try {
    const rows = await db
      .select({
        weddingLocation: guests.weddingLocation,
        invitationType: guests.invitationType,
        guestType: guests.guestType,
        guestGroup: guests.guestGroup,
        invitationTime: guests.invitationTime,
        phone: guests.phone,
      })
      .from(guests);

    const registeredGroups = await db
      .select({ name: guestGroups.name })
      .from(guestGroups);

    const total = rows.length;

    const locMap = new Map<string, number>();
    let digital = 0;
    let physical = 0;
    let invUnset = 0;
    let sekaliyan = 0;
    let sendiri = 0;
    let guestTypeUnset = 0;
    const groupMap = new Map<string, number>();
    const shiftMap = new Map<string, number>();
    let digitalWithPhone = 0;
    let digitalWithoutPhone = 0;

    for (const row of rows) {
      const loc = row.weddingLocation?.trim();
      if (loc) {
        locMap.set(loc, (locMap.get(loc) ?? 0) + 1);
      } else {
        locMap.set("Belum diisi", (locMap.get("Belum diisi") ?? 0) + 1);
      }

      const inv = row.invitationType;
      if (inv === "digital") digital++;
      else if (inv === "physical") physical++;
      else invUnset++;

      const gt = row.guestType;
      if (gt === "sekaliyan") sekaliyan++;
      else if (gt === "sendiri") sendiri++;
      else guestTypeUnset++;

      const gName = row.guestGroup?.trim();
      const gKey = gName || "Tanpa grup";
      groupMap.set(gKey, (groupMap.get(gKey) ?? 0) + 1);

      const sk = getShiftKeyFromTime(invitationTimeToIso(row.invitationTime));
      shiftMap.set(sk, (shiftMap.get(sk) ?? 0) + 1);

      if (inv === "digital") {
        const hasPhone = !!row.phone?.trim();
        if (hasPhone) digitalWithPhone++;
        else digitalWithoutPhone++;
      }
    }

    const byLocation = [...locMap.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

    const byGroup = [...groupMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const byShift = SHIFT_OPTIONS.map((opt) => ({
      key: opt.value,
      label: opt.label,
      count: shiftMap.get(opt.value) ?? 0,
    }));

    const countsForRegistered = new Map<string, number>();
    for (const row of rows) {
      const name = row.guestGroup?.trim();
      if (name) {
        countsForRegistered.set(name, (countsForRegistered.get(name) ?? 0) + 1);
      }
    }

    const emptyGroups = registeredGroups
      .map((g) => g.name)
      .filter((name) => (countsForRegistered.get(name) ?? 0) === 0);

    const payload: GuestOverviewStats = {
      total,
      byLocation,
      byInvitationType: {
        digital,
        physical,
        unset: invUnset,
      },
      byGuestType: {
        sekaliyan,
        sendiri,
        unset: guestTypeUnset,
      },
      byGroup,
      byShift,
      registeredGroupCount: registeredGroups.length,
      emptyGroups,
      digitalWithPhone,
      digitalWithoutPhone,
    };

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to load stats" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
