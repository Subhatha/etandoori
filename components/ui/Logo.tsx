import Image from "next/image";
import Link from "next/link";

const logoSrc = `${process.env.NODE_ENV === "production" ? "/etandoori" : ""}/logo.jpeg`;

export default function Logo({ large = false }: { large?: boolean }) {
  return (
    <Link href="/" aria-label="eTandoori" className={large ? "inline-flex flex-col items-start gap-3 sm:flex-row sm:items-center" : "inline-flex items-center gap-3"}>
      <Image
        src={logoSrc}
        alt="eTandoori"
        width={large ? 112 : 64}
        height={large ? 112 : 64}
        priority={!large}
        className={`${large ? "h-28 w-28" : "h-16 w-16"} shrink-0 rounded-full object-contain select-none`}
      />
      <span aria-hidden="true" className="whitespace-nowrap font-serif text-2xl tracking-tight text-brand-400 sm:text-3xl">
        <span className="text-ember-500">E-</span>tandoori
      </span>
    </Link>
  );
}
