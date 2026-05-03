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

const SHIFT_PIE_COLORS = [
  "rgb(99 102 241)",
  "rgb(16 185 129)",
  "rgb(245 158 11)",
];

function ShiftSharePie({
  byShift,
  total,
  labelShortener,
}: {
  byShift: { key: string; label: string; count: number }[];
  total: number;
  labelShortener: (full: string) => string;
}) {
  const cx = 80;
  const cy = 80;
  const r = 68;
  const strokeClass = "stroke-white dark:stroke-zinc-800";

  if (total <= 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-default-500">
        Belum ada data shift.
      </p>
    );
  }

  const nonZero = byShift.filter((s) => s.count > 0);

  if (nonZero.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-default-500">
        Belum ada data shift.
      </p>
    );
  }

  let angleDeg = -90;
  const slices: ReactNode[] = [];

  if (nonZero.length === 1) {
    const s = nonZero[0];
    const color =
      SHIFT_PIE_COLORS[
        Math.max(0, byShift.findIndex((x) => x.key === s.key)) %
          SHIFT_PIE_COLORS.length
      ];
    slices.push(
      <circle
        key={s.key}
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        className={strokeClass}
        strokeWidth={2}
      />,
    );
  } else {
    for (let i = 0; i < byShift.length; i++) {
      const seg = byShift[i];
      if (seg.count <= 0) continue;
      const sweep = (seg.count / total) * 360;
      const startAngle = angleDeg;
      const endAngle = angleDeg + sweep;
      angleDeg = endAngle;

      const radStart = (startAngle * Math.PI) / 180;
      const radEnd = (endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(radStart);
      const y1 = cy + r * Math.sin(radStart);
      const x2 = cx + r * Math.cos(radEnd);
      const y2 = cy + r * Math.sin(radEnd);
      const largeArc = sweep > 180 ? 1 : 0;
      const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      slices.push(
        <path
          key={seg.key}
          d={d}
          fill={SHIFT_PIE_COLORS[i % SHIFT_PIE_COLORS.length]}
          strokeWidth={2}
          className={strokeClass}
        />,
      );
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="flex shrink-0 justify-center">
        <svg
          viewBox="0 0 160 160"
          className="h-36 w-36 sm:h-40 sm:w-40"
          role="img"
          aria-label="Diagram lingkaran distribusi tamu per shift"
        >
          <title>Distribusi persentase tamu per shift</title>
          {slices}
        </svg>
      </div>
      <ul className="min-w-0 flex-1 space-y-2.5 text-sm">
        {byShift.map((s, i) => {
          const share = pct(s.count, total);
          const swatch = SHIFT_PIE_COLORS[i % SHIFT_PIE_COLORS.length];
          return (
            <li
              key={s.key}
              className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0 dark:border-default-200/60"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: swatch }}
                  aria-hidden
                />
                <span className="text-slate-700 dark:text-default-200">
                  {labelShortener(s.label)}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
                <span className="text-xs text-slate-500 dark:text-default-500">
                  {s.count}
                </span>
                <span className="min-w-12 text-right font-semibold text-slate-800 dark:text-foreground">
                  {share}%
                </span>
              </span>
            </li>
          );
        })}
      </ul>
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
  const peakShare = peakShift
    ? pct(peakShift.count, total)
    : 0;

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
        </div>

        <div
          className={`${shell} flex max-h-[min(85vh,52rem)] flex-col lg:sticky lg:top-2`}
        >
          <div className="border-b border-slate-100 p-4 dark:border-default-200/80 sm:p-5">
            <h3 className="text-base font-bold text-slate-800 dark:text-foreground">
              Distribusi shift
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-default-500">
              Persentase tamu per sesi undangan
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            <ShiftSharePie
              byShift={t.byShift}
              total={total}
              labelShortener={shortShiftLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
