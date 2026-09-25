import Image from "next/image";
import Link from "next/link";

export function MacifyLogo({ compact = false, href = "/", showMark = true }: { compact?: boolean; href?: string; showMark?: boolean }) {
  return (
    <Link className="brand" href={href} aria-label={href === "/dashboard" ? "Macify dashboard" : "Macify home"}>
      {showMark && (
        <span className="brand-mark" aria-hidden="true">
          <Image alt="" className="brand-mark-image" height={48} src="/icons/macify-192.png" width={48} />
        </span>
      )}
      {!compact && <span className="brand-word">Macify</span>}
    </Link>
  );
}
