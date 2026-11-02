"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SessionWatcher() {
  const router = useRouter();

  useEffect(() => {
    const handleUnauthorized = () => router.replace("/login");
    window.addEventListener("skilllink:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("skilllink:unauthorized", handleUnauthorized);
  }, [router]);

  return null;
}
