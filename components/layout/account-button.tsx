import { auth, signIn, signOut } from "@/auth";
import React from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default async function AccountButton() {
  const session = await auth();

  if (!session?.user) {
    // DISPLAY SIGN IN BUTTON
    return (
      <form
        action={async () => {
          "use server";
          await signIn("google", { callbackUrl: "/dashboard" });
        }}
      >
        <Button type="submit">Sign in with Google</Button>;
      </form>
    );
  } else {
    // DISPLAY SIGN OUT BUTTON
    return (
      <>
        <p>{session.user.email}</p>
        <p>{session.user.name}</p>
        {session.user.image && (
          <Image
            src={session.user.image}
            alt="User avatar"
            width={50}
            height={50}
          />
        )}
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <Button type="submit">Sign out</Button>
        </form>
      </>
    );
  }
}
