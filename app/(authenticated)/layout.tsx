import { auth } from "@/auth";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    return (
      <>
        <p>NOT AUTHENTICATED</p>
      </>
    );
  }
  return <>{children}</>;
}
