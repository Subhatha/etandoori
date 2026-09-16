import Image from "next/image";
import Link from "next/link";

export default function Logo() {
  return (
    <Link href="/" className="block">
      <Image
        src="/images/logo/wordmark.png"
        alt="eTandoori"
        width={240}
        height={55}
        priority
        className="h-11 w-auto select-none"
      />
    </Link>
  );
}
