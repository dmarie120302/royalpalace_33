import Image from "next/image";
export function AuthCover() {
  const name = process.env.NEXT_PUBLIC_APP_NAME || "Obra Clara";
  return (
    <>
      <Image
        className="auth-cover"
        src="/portada.png"
        width={533}
        height={400}
        alt={name}
        priority
      />
      <div className="auth-brand">{name}</div>
    </>
  );
}
