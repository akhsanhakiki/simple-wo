import {
  getShiftLabelFromInvitationTime,
  getShiftTimeRangeFromInvitationTime,
} from "./guest-shift";

export type WeddingVenueKey = "Semarang" | "Magetan";

type WeddingVenueBase = {
  eventDate: string;
  venueName: string;
  venueAddress: string;
  digitalUrl: string;
};

type SemarangVenueDetails = WeddingVenueBase & {
  kind: "pernikahan";
  akadTime: string;
  resepsiWindow: string;
};

type MagetanVenueDetails = WeddingVenueBase & {
  kind: "ngunduh-mantu";
  eventName: string;
};

export type WeddingVenueDetails = SemarangVenueDetails | MagetanVenueDetails;

export const WEDDING_VENUE_DETAILS: Record<
  WeddingVenueKey,
  WeddingVenueDetails
> = {
  Semarang: {
    kind: "pernikahan",
    eventDate: "Minggu, 26 Juli 2026",
    akadTime: "07.30 - 09.00 WIB",
    resepsiWindow: "11.00 - 13.00 WIB",
    venueName: "Kebon Rojo Restaurant",
    venueAddress:
      "Jl. Raya Soekarno Hatta Km. 25 No. 8, Ungaran, Bergas, Kab. Semarang",
    digitalUrl: "https://akhsanlili.pages.dev/",
  },
  Magetan: {
    kind: "ngunduh-mantu",
    eventDate: "Sabtu, 1 Agustus 2026",
    eventName: "Ngunduh Mantu",
    venueName: "Kediaman Keluarga",
    venueAddress: "Magetan, Jawa Timur",
    digitalUrl: "",
  },
};

type GuestInviteFields = {
  name: string;
  weddingLocation: string | null;
  invitationTime: string | null;
  guestType: string | null;
};

function resolveVenueKey(
  location: string | null | undefined,
): WeddingVenueKey {
  return location?.trim() === "Magetan" ? "Magetan" : "Semarang";
}

function resolveVenue(location: string | null | undefined): WeddingVenueDetails {
  return WEDDING_VENUE_DETAILS[resolveVenueKey(location)];
}

function resolveDigitalUrl(
  venue: WeddingVenueDetails,
  locationKey: WeddingVenueKey,
): string {
  const semarangEnv =
    typeof import.meta.env.PUBLIC_DIGITAL_INVITATION_URL === "string"
      ? import.meta.env.PUBLIC_DIGITAL_INVITATION_URL.trim()
      : "";
  const magetanEnv =
    typeof import.meta.env.PUBLIC_DIGITAL_INVITATION_URL_MAGETAN === "string"
      ? import.meta.env.PUBLIC_DIGITAL_INVITATION_URL_MAGETAN.trim()
      : "";

  if (locationKey === "Magetan") {
    return magetanEnv || venue.digitalUrl;
  }
  return semarangEnv || venue.digitalUrl;
}

export function buildJadwalAcaraBlock(g: GuestInviteFields): string {
  const venue = resolveVenue(g.weddingLocation);

  if (venue.kind === "ngunduh-mantu") {
    const waktu = getShiftTimeRangeFromInvitationTime(g.invitationTime);
    return `📅 Hari/Tanggal: ${venue.eventDate}
⏰ Waktu: ${waktu}
Acara: ${venue.eventName}`;
  }

  const shift = getShiftLabelFromInvitationTime(g.invitationTime);
  const shiftLine = shift !== "—" ? `\n(Sesi undangan: ${shift})` : "";
  return `📅 Hari/Tanggal: ${venue.eventDate}
⏰ Waktu: - Akad Nikah: ${venue.akadTime}

Resepsi: ${venue.resepsiWindow}${shiftLine}`;
}

export function buildDetailTempatBlock(g: GuestInviteFields): string {
  const venue = resolveVenue(g.weddingLocation);
  return `📍 Tempat: ${venue.venueName}
${venue.venueAddress}`;
}

export function buildUrlUndanganBlock(g: GuestInviteFields): string {
  const locationKey = resolveVenueKey(g.weddingLocation);
  const venue = resolveVenue(g.weddingLocation);
  const url = resolveDigitalUrl(venue, locationKey);
  return url ? `\n\n👉 ${url}` : "";
}

/** Legacy block for templates that still use {{undanganDigital}}. */
export function buildLegacyUndanganDigitalBlock(g: GuestInviteFields): string {
  return buildUrlUndanganBlock(g);
}

export function buildWaInviteReplacements(
  g: GuestInviteFields,
  guestTypeLabels: Record<string, string>,
): Record<string, string> {
  const locationKey = resolveVenueKey(g.weddingLocation);
  const venue = resolveVenue(g.weddingLocation);
  const shift =
    locationKey === "Magetan"
      ? getShiftTimeRangeFromInvitationTime(g.invitationTime)
      : getShiftLabelFromInvitationTime(g.invitationTime);
  const tamu = guestTypeLabels[g.guestType ?? ""] ?? "—";
  const url = resolveDigitalUrl(venue, locationKey);

  return {
    nama: g.name.trim(),
    lokasi: g.weddingLocation?.trim() || locationKey,
    shift,
    tamu,
    jadwalAcara: buildJadwalAcaraBlock(g),
    detailTempat: buildDetailTempatBlock(g),
    urlUndangan: buildUrlUndanganBlock(g),
    undanganDigital: url ? `\n\nUndangan digital: ${url}` : "",
  };
}

export const DEFAULT_WA_INVITE_TEMPLATE = `Assalamu'alaikum Warahmatullahi Wabarakatuh

Semoga keluarga, kerabat, dan teman-teman semua selalu dalam keadaan sehat dan penuh kebahagiaan.

Dengan penuh rasa syukur dan memohon ridho Allah SWT, kami bermaksud mengundang Bapak/Ibu/Saudara/i dan teman-teman sekalian untuk menghadiri acara pernikahan kami:

Akhsan & Lilly

Muhammad Akhsan Hakiki (Akhsan)
Putra dari Bpk. Arif Fuadhi & Ibu Sri Utami (Magetan)
&
Laili Nailul Muna Azzahra (Lilly)
Putri dari Bpk. Aham Arifin & Ibu Sari Wahyuningsih (Bawen)


Acara insyaAllah akan dilaksanakan pada:
{{jadwalAcara}}

{{detailTempat}}

Detail lengkap mengenai acara, peta lokasi, dress code (Semi Formal/Batik), serta form konfirmasi kehadiran (RSVP) dapat diakses melalui tautan undangan digital berikut:{{urlUndangan}}

Kehadiran serta doa restu dari keluarga, kerabat, dan teman-teman semua akan menjadi pelengkap kebahagiaan di hari istimewa kami dan keluarga besar. Sampai jumpa di hari bahagia kami!

Wassalamu'alaikum Warahmatullahi Wabarakatuh`;

export function buildDigitalInviteMessage(
  g: GuestInviteFields,
  template: string,
  guestTypeLabels: Record<string, string>,
): string {
  const tpl =
    template.trim() === "" ? DEFAULT_WA_INVITE_TEMPLATE : template;
  const replacements = buildWaInviteReplacements(g, guestTypeLabels);
  let message = tpl;
  for (const [key, value] of Object.entries(replacements)) {
    message = message.replaceAll(`{{${key}}}`, value);
  }
  return message;
}
