import { Button } from "@heroui/react";
import type { ComponentType, ReactNode, SVGProps } from "react";
import type { GuestOverviewStats } from "../lib/guest-overview-stats";

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 1000) / 10;
}

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function IconUsers({ size = 18, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSmartphone({ size = 18, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}

function IconMessageCircle({ size = 18, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

function IconClock({ size = 18, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconTrendingUp({ size = 14, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function IconAlertCircle({ size = 20, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function IconInfo({ size = 20, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4M12 8h.01" />
    </svg>
  );
}

function IconLightbulb({ size = 20, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </svg>
  );
}

function IconFileBox({ size = 20, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

function IconArrowUpRight({ size = 12, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <path d="M7 17 17 7M7 7h10v10" />
    </svg>
  );
}

function IconFilter({ size = 14, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

function IconChevronDown({ size = 14, className, ...p }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      {...p}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

const shell =
  "rounded-2xl border border-slate-200/90 bg-white shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] dark:border-default-300/70 dark:bg-default-100/90 dark:shadow-none";

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon: ComponentType<IconProps>;
  trend?: "up" | "down";
  trendValue?: string;
}) {
  return (
    <div
      className={`${shell} flex flex-col justify-between p-4 sm:p-5`}
    >
      <div className="mb-3 flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-slate-50 p-2 dark:bg-default-200/50">
            <Icon size={18} className="text-slate-600 dark:text-default-600" />
          </div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-default-500">
            {title}
          </h3>
        </div>
      </div>
      <div>
        <div className="mb-2 text-2xl font-bold tracking-tight text-slate-800 sm:text-3xl dark:text-foreground">
          {value}
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {trend && trendValue ? (
            <span
              className={`flex items-center font-medium ${
                trend === "up"
                  ? "text-emerald-500 dark:text-emerald-400"
                  : "text-rose-500 dark:text-rose-400"
              }`}
            >
              <IconTrendingUp
                size={14}
                className={trend === "down" ? "mr-1 rotate-180" : "mr-1"}
              />
              {trendValue}
            </span>
          ) : null}
          <span className="text-slate-400 dark:text-default-500">{subtitle}</span>
        </div>
      </div>
    </div>
  );
}

type InsightTone = "warning" | "danger" | "info" | "success";

const insightToneClass: Record<
  InsightTone,
  string
> = {
  warning:
    "border-amber-200 bg-amber-50 text-amber-600 dark:border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300",
  danger:
    "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/40 dark:bg-rose-500/15 dark:text-rose-300",
  info: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300",
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-300",
};

function InsightItem({
  title,
  desc,
  icon: Icon,
  status,
  statusColor,
  isActionable,
  onAction,
}: {
  title: string;
  desc: string;
  icon: ComponentType<IconProps>;
  status: string;
  statusColor: InsightTone;
  isActionable?: boolean;
  onAction?: () => void;
}) {
  const tone = insightToneClass[statusColor];
  return (
    <div className="group flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/60 p-3 transition-colors hover:bg-slate-50 dark:border-default-300/60 dark:bg-default-100/50 dark:hover:bg-default-200/40">
      <div
        className={`flex shrink-0 rounded-xl border bg-white p-2.5 shadow-sm dark:bg-default-100 ${tone}`}
      >
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-start justify-between gap-2">
          <h4 className="truncate pr-1 text-sm font-bold text-slate-800 dark:text-foreground">
            {title}
          </h4>
          <span
            className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone}`}
          >
            {status}
          </span>
        </div>
        <p className="mb-2 text-xs leading-relaxed text-slate-500 dark:text-default-500">
          {desc}
        </p>
        {isActionable && onAction ? (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-primary dark:hover:text-primary/90"
            onClick={onAction}
          >
            Tindak lanjuti <IconArrowUpRight size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function shortShiftLabel(full: string): string {
  const m = full.match(/Shift\s*(\d+)/i);
  if (m) return `Shift ${m[1]}`;
  return full.length > 24 ? `${full.slice(0, 22)}…` : full;
}

function shortGroupLabel(full: string): string {
  return full.length > 14 ? `${full.slice(0, 12)}…` : full;
}

export function OverviewMetrics({
  stats,
  loading,
  error,
  onAddGuest,
}: {
  stats: GuestOverviewStats | null;
  loading: boolean;
  error: string | null;
  onAddGuest: () => void;
}) {
  if (loading && !stats) {
    return (
      <div
        className={`flex min-h-[160px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 dark:border-default-600`}
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600 dark:border-default-500 dark:border-t-primary" />
        <p className="text-sm text-slate-500 dark:text-default-500">
          Memuat ringkasan…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${shell} px-4 py-4 text-center text-sm text-rose-600 dark:text-rose-400`}
      >
        {error}
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="flex w-full min-w-0 flex-col items-center gap-4 rounded-2xl border border-slate-200/90 bg-white px-6 py-10 text-center shadow-sm dark:border-default-300/70 dark:bg-default-100/90">
        <h2 className="text-lg font-bold text-slate-800 dark:text-foreground">
          Belum ada data tamu
        </h2>
        <p className="max-w-sm text-sm text-slate-500 dark:text-default-500">
          Tambah tamu dari tab Guests — dashboard akan terisi otomatis.
        </p>
        <Button variant="primary" onPress={onAddGuest}>
          + Tambah tamu
        </Button>
      </div>
    );
  }

  const t = stats;
  const total = t.total;
  const dig = t.byInvitationType.digital;
  const phy = t.byInvitationType.physical;
  const peakShift = [...t.byShift].sort((a, b) => b.count - a.count)[0];
  const chartGroups = t.byGroup;
  const maxGroupCount = Math.max(...chartGroups.map((g) => g.count), 1);
  const peakGroup = chartGroups[0];
  const digitalPct = pct(dig, total);
  const waReadyPct = pct(t.digitalWithPhone, dig || 1);
  const waGap =
    t.digitalWithoutPhone > 0 ? pct(t.digitalWithoutPhone, dig || 1) : 0;
  const peakShare = peakShift
    ? pct(peakShift.count, total)
    : 0;

  const tableGroups = t.byGroup.slice(0, 8);

  const insights: Array<{
    key: string;
    title: string;
    desc: string;
    icon: ComponentType<IconProps>;
    status: string;
    statusColor: InsightTone;
    isActionable?: boolean;
  }> = [];

  if (t.digitalWithoutPhone > 0) {
    insights.push({
      key: "wa",
      title: "Lengkapi nomor WA (digital)",
      desc: `${t.digitalWithoutPhone} tamu undangan digital belum punya nomor WhatsApp (~${waGap}% dari digital). Lengkapi sebelum kirim undangan massal.`,
      icon: IconAlertCircle,
      status: "Perlu tindakan",
      statusColor: "danger",
      isActionable: true,
    });
  }

  if (t.emptyGroups.length > 0) {
    insights.push({
      key: "empty",
      title: "Grup tanpa tamu",
      desc: `Grup berikut belum ada tamu: ${t.emptyGroups.slice(0, 4).join(", ")}${t.emptyGroups.length > 4 ? ` +${t.emptyGroups.length - 4}` : ""}.`,
      icon: IconInfo,
      status: "Info",
      statusColor: "warning",
      isActionable: false,
    });
  }

  if (peakShift) {
    insights.push({
      key: "shift",
      title: "Distribusi shift",
      desc: `${peakShift.label} paling padat (${peakShift.count} tamu, ~${peakShare}%). Sesuaikan alokasi queue resepsi & catering.`,
      icon: IconLightbulb,
      status: "Tip logistik",
      statusColor: "success",
      isActionable: false,
    });
  }

  if (phy > dig) {
    insights.push({
      key: "phys",
      title: "Undangan fisik dominan",
      desc: `${phy} tamu memilih undangan fisik — pastikan stok kartu undangan & meja pengambilan mencukupi.`,
      icon: IconFileBox,
      status: "Perhatian",
      statusColor: "info",
      isActionable: false,
    });
  }

  insights.push({
    key: "guesttype",
    title: "Tipe tamu",
    desc: `Sekalian ${t.byGuestType.sekaliyan} · sendiri ${t.byGuestType.sendiri}${t.byGuestType.unset > 0 ? ` · ${t.byGuestType.unset} belum ditandai` : ""}.`,
    icon: IconUsers,
    status: "Ringkasan",
    statusColor: "info",
    isActionable: false,
  });

  return (
    <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-5 overflow-y-auto pb-2 font-sans text-slate-800 dark:text-foreground">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tamu"
          value={total}
          subtitle={`${t.registeredGroupCount} grup terdaftar`}
          icon={IconUsers}
        />
        <StatCard
          title="Undangan Digital"
          value={`${digitalPct}%`}
          subtitle={`${dig} digital · ${phy} fisik`}
          icon={IconSmartphone}
        />
        <StatCard
          title="WA Siap Kirim"
          value={`${waReadyPct}%`}
          subtitle={`${t.digitalWithPhone} nomor siap · ${t.digitalWithoutPhone} belum`}
          icon={IconMessageCircle}
        />
        <StatCard
          title="Puncak keramaian"
          value={
            <span className="text-xl sm:text-2xl">
              {peakShift ? shortShiftLabel(peakShift.label) : "—"}
            </span>
          }
          subtitle={
            peakShift
              ? `${peakShift.count} tamu (~${peakShare}%)`
              : "Belum ada data"
          }
          icon={IconClock}
        />
      </div>

      <div className="grid min-h-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:items-start">
        <div className="flex min-h-0 flex-col gap-5 lg:col-span-2">
          <div className={`${shell} p-5 sm:p-6`}>
            <div className="mb-6 flex flex-col gap-3 sm:mb-8 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-foreground">
                  Komparasi tamu per grup
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-default-500">
                  Bandingkan jumlah tamu antar grup undangan.
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-bold text-slate-800 dark:text-foreground">
                    {total}
                  </span>
                  <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-sm font-medium text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
                    Total tamu
                  </span>
                  {peakGroup ? (
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-default-200/60 dark:text-default-400">
                      Terbanyak: {shortGroupLabel(peakGroup.name)} ({peakGroup.count})
                    </span>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="flex w-fit shrink-0 items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-default-300 dark:text-default-600 dark:hover:bg-default-200/50"
              >
                Semua grup <IconChevronDown size={14} />
              </button>
            </div>

            {chartGroups.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500 dark:text-default-500">
                Belum ada data grup tamu.
              </p>
            ) : (
              <div className="overflow-x-auto pb-8 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5">
                <div className="inline-block min-w-full">
                  <div className="mb-4 flex h-44 min-w-min items-end gap-2 sm:h-48 sm:gap-3">
                    {chartGroups.map((g) => {
                      const hPct = maxGroupCount
                        ? Math.max(12, (g.count / maxGroupCount) * 100)
                        : 0;
                      const isPeak =
                        !!peakGroup && g.name === peakGroup.name;
                      return (
                        <div
                          key={g.name}
                          className="group relative flex h-full w-14 shrink-0 flex-col justify-end sm:w-16"
                        >
                          <div
                            className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-default-800"
                          >
                            {g.count} tamu
                            <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 bg-slate-800 dark:bg-default-800" />
                          </div>
                          <div
                            className={`flex w-full items-start justify-center rounded-t-xl pt-2 text-xs font-bold transition-colors ${
                              isPeak
                                ? "border-x border-t border-slate-800 bg-slate-800 text-white dark:border-primary dark:bg-primary"
                                : "bg-slate-100 text-slate-400 hover:bg-slate-200 group-hover:text-slate-600 dark:bg-default-200/60 dark:text-default-500 dark:hover:bg-default-300/50"
                            }`}
                            style={{ height: `${hPct}%` }}
                          >
                            {g.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex min-w-min justify-between gap-2 pb-2 text-center text-[10px] font-semibold leading-tight text-slate-400 sm:gap-3 sm:text-xs dark:text-default-500">
                    {chartGroups.map((g) => (
                      <div
                        key={g.name}
                        title={g.name}
                        className={`group/axis-label relative flex w-14 shrink-0 flex-col items-center px-0.5 sm:w-16 ${
                          peakGroup?.name === g.name
                            ? "font-semibold text-slate-800 dark:text-foreground"
                            : ""
                        }`}
                      >
                        <span className="line-clamp-2 wrap-break-word">
                          {shortGroupLabel(g.name)}
                        </span>
                        <span
                          role="tooltip"
                          className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 w-max max-w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-left text-[10px] font-normal leading-snug text-slate-700 opacity-0 shadow-md ring-1 ring-black/5 transition-opacity duration-150 group-hover/axis-label:opacity-100 dark:border-default-300 dark:bg-default-800 dark:text-default-100 dark:ring-white/10 sm:text-xs"
                        >
                          {g.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className={`${shell} overflow-hidden`}>
            <div className="flex flex-col gap-2 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5 dark:border-default-200/80">
              <h3 className="text-base font-bold text-slate-800 dark:text-foreground">
                Grup tamu utama
              </h3>
              <button
                type="button"
                className="flex w-fit items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50 dark:border-default-300 dark:text-default-600 dark:hover:bg-default-200/50"
              >
                Filter <IconFilter size={14} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="border-b border-slate-100 bg-slate-50 font-medium text-slate-500 dark:border-default-200/80 dark:bg-default-200/40 dark:text-default-500">
                  <tr>
                    <th className="py-3 pl-4 pr-3 sm:pl-5">Nama grup</th>
                    <th className="py-3 px-3">Jumlah tamu</th>
                    <th className="py-3 pr-4 text-right sm:pr-5">% dari total</th>
                  </tr>
                </thead>
                <tbody>
                  {tableGroups.map((row) => {
                    const share = pct(row.count, total);
                    return (
                      <tr
                        key={row.name}
                        className="border-b border-slate-50 transition-colors hover:bg-slate-50 dark:border-default-200/40 dark:hover:bg-default-200/30"
                      >
                        <td className="py-3 pl-4 pr-3 font-semibold text-slate-800 sm:pl-5 dark:text-foreground">
                          {row.name}
                        </td>
                        <td className="py-3 px-3 tabular-nums">{row.count}</td>
                        <td className="py-3 pr-4 text-right tabular-nums text-slate-600 sm:pr-5 dark:text-default-400">
                          {share}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          className={`${shell} flex max-h-[min(85vh,52rem)] flex-col lg:sticky lg:top-2`}
        >
          <div className="border-b border-slate-100 p-4 dark:border-default-200/80 sm:p-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-foreground">
              Smart Insights
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-default-500">
              Analisis dan rekomendasi otomatis
            </p>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto p-2">
            {insights.map((item) => (
              <InsightItem
                key={item.key}
                title={item.title}
                desc={item.desc}
                icon={item.icon}
                status={item.status}
                statusColor={item.statusColor}
                isActionable={item.isActionable}
                onAction={
                  item.key === "wa" ? onAddGuest : undefined
                }
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
