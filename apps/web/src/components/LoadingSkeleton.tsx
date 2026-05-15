"use client";

/**
 * LoadingSkeleton — reusable shimmer/placeholder components for loading states.
 * Replaces bare "Cargando..." text with subtle animated placeholders.
 */

interface SkeletonBoxProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

function SkeletonBox({ width = "100%", height = 16, borderRadius = 6, style }: SkeletonBoxProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: "linear-gradient(90deg, var(--outline-variant) 25%, rgba(196,198,205,0.3) 50%, var(--outline-variant) 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s ease-in-out infinite",
        ...style,
      }}
    />
  );
}

/** Full-width line placeholder */
export function SkeletonLine({ width = "100%", style }: { width?: string | number; style?: React.CSSProperties }) {
  return <SkeletonBox width={width} height={14} borderRadius={4} style={style} />;
}

/** Small circle avatar placeholder */
export function SkeletonCircle({ size = 28 }: { size?: number }) {
  return <SkeletonBox width={size} height={size} borderRadius="50%" />;
}

/** Card placeholder with multiple lines */
export function SkeletonCard({ lines = 3, height }: { lines?: number; height?: number }) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--outline-variant)",
        borderRadius: 8,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        ...(height ? { height } : {}),
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLine key={i} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </div>
  );
}

/** Stats card skeleton (large number + label) */
export function SkeletonStatCard() {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--outline-variant)",
        borderRadius: 8,
        padding: "18px 20px",
      }}
    >
      <SkeletonBox width={80} height={12} style={{ marginBottom: 10 }} />
      <SkeletonBox width={60} height={28} />
    </div>
  );
}

/** List item skeleton */
export function SkeletonListItem() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 16px",
        background: "var(--surface-card)",
        border: "1px solid var(--outline-variant)",
        borderRadius: 6,
      }}
    >
      <SkeletonCircle size={36} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        <SkeletonLine width="70%" />
        <SkeletonLine width="40%" />
      </div>
      <SkeletonBox width={60} height={22} borderRadius={100} />
    </div>
  );
}

/** Dashboard-specific loading layout */
export function DashboardSkeleton() {
  return (
    <div>
      {/* Hero */}
      <div
        style={{
          background: "linear-gradient(135deg, var(--navy) 0%, #0a2640 100%)",
          borderRadius: 10,
          padding: "28px 32px",
          marginBottom: 28,
        }}
      >
        <SkeletonBox width={240} height={22} style={{ marginBottom: 10 }} />
        <SkeletonBox width={360} height={14} />
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Charts row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} lines={5} />
        ))}
      </div>

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
        <SkeletonCard lines={6} />
      </div>
    </div>
  );
}

/** Full-page skeleton for history/contracts */
export function ListPageSkeleton({ title }: { title?: string }) {
  return (
    <div>
      {title && (
        <>
          <SkeletonBox width={160} height={26} style={{ marginBottom: 6 }} />
          <SkeletonBox width={200} height={14} style={{ marginBottom: 24 }} />
        </>
      )}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <SkeletonBox width={260} height={38} borderRadius={6} />
        <SkeletonBox width={140} height={38} borderRadius={6} />
        <SkeletonBox width={140} height={38} borderRadius={6} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonListItem key={i} />
        ))}
      </div>
    </div>
  );
}

export default SkeletonBox;