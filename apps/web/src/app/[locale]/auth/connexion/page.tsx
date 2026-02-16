import { setRequestLocale } from "next-intl/server";
import { SignInForm } from "./sign-in-form";

export default async function SignInPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  const { callbackUrl } = await searchParams;
  setRequestLocale(locale);

  return (
    <div className="container mx-auto flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <SignInForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
