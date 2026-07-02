"use client";

import { useEffect, useState } from "react";

import type { Payment } from "@/lib/supabase/types";

function maskName(name: string): string {
  if (name.length <= 1) return name;
  if (name.length === 2) return name[0] + "*";
  const mid = Math.floor(name.length / 2);
  return (
    name.slice(0, mid) +
    "*".repeat(name.length - mid * 2 > 0 ? 1 : 0) +
    name.slice(mid + 1)
  );
}

type Props = {
  payments: Payment[];
};

export default function DonorRolling({ payments }: Props) {
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(true);

  useEffect(() => {
    if (payments.length <= 1) return;
    const timer = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % payments.length);
        setShow(true);
      }, 300);
    }, 3000);
    return () => clearInterval(timer);
  }, [payments.length]);

  if (payments.length === 0) return null;

  const p = payments[index];
  const name = maskName(p.participant_name);

  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(6px)",
        transition: "opacity 0.3s ease, transform 0.3s ease",
        display: "inline-flex",
        alignItems: "center",
        gap: 12,
        background: "rgba(0,0,0,0.45)",
        borderRadius: 999,
        padding: "8px 14px",
        maxWidth: "100%",
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: "#ffffff",
          flexShrink: 0,
        }}
      >
        {name}
      </span>
      {p.message && (
        <span
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.7)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.message}
        </span>
      )}
    </div>
  );
}
