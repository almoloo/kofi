import Link from "next/link";
import React from "react";
import AccountButton from "@/components/layout/account-button";

export default function Header() {
  return (
    <header className="flex items-center justify-between">
      <Link href="/">KOFI</Link>
      <div>
        <AccountButton />
      </div>
    </header>
  );
}
