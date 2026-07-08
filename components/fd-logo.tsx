import Image, { type ImageProps } from "next/image";

export function FdLogo({
  width,
  height,
  fill,
  className,
  ...props
}: Partial<Omit<ImageProps, "src" | "alt">> = {}) {
  return (
    <>
      <Image
        src="/logo-light.webp"
        alt="Fon digital logo"
        width={fill ? undefined : width || 64}
        height={fill ? undefined : height || 64}
        fill={fill}
        suppressHydrationWarning
        className={`dark:hidden ${className || ""}`}
        {...props}
      />
      <Image
        src="/logo-dark.webp"
        alt="Fon digital logo"
        width={fill ? undefined : width || 64}
        height={fill ? undefined : height || 64}
        fill={fill}
        suppressHydrationWarning
        className={`hidden dark:block ${className || ""}`}
        {...props}
      />
    </>
  );
}
