"use client";

import { useState, useTransition } from "react";
import Input from "@/components/ui/Input";
import { changePassword } from "./actions";

export default function MyPagePasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleChange = () => {
    setError("");
    setDone(false);
    if (password.length < 8) {
      setError("비밀번호는 8자 이상이어야 합니다");
      return;
    }
    if (password !== confirm) {
      setError("비밀번호가 일치하지 않습니다");
      return;
    }
    startTransition(async () => {
      const res = await changePassword(password);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setPassword("");
      setConfirm("");
      setDone(true);
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <Input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="새 비밀번호 (8자 이상)"
      />
      <Input
        type="password"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="새 비밀번호 확인"
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
      {done && (
        <p className="text-sm text-emerald-600">비밀번호가 변경되었어요 ✅</p>
      )}
      <button
        onClick={handleChange}
        disabled={isPending}
        className="h-[52px] rounded-xl bg-rose-500 text-white text-sm font-semibold transition-all duration-100 hover:bg-rose-600 active:bg-rose-700 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
      >
        {isPending ? "변경 중..." : "변경하기"}
      </button>
    </div>
  );
}
