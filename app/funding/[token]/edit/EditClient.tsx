"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Input from "@/components/ui/Input";
import Header from "@/components/ui/Header";
import { uploadFundingImage } from "@/app/create/actions";
import { updateFunding } from "./actions";
import type { Funding, Gift } from "@/lib/supabase/types";

type Props = {
  token: string;
  funding: Funding;
  gift: Gift;
};

export default function EditClient({ token, funding, gift }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState(funding.title);
  const [description, setDescription] = useState(funding.description ?? "");
  const [endDate, setEndDate] = useState(funding.end_date.split("T")[0]);
  const [imageUrl, setImageUrl] = useState<string | null>(funding.image_url);
  const [imagePreview, setImagePreview] = useState<string | null>(
    funding.image_url,
  );
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");

  const [giftTargetAmount, setGiftTargetAmount] = useState(
    Number(gift.target_amount).toLocaleString("ko-KR"),
  );

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setGiftTargetAmount(raw ? Number(raw).toLocaleString("ko-KR") : "");
  };

  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImagePreview(URL.createObjectURL(file));
    setImageUploading(true);
    setImageError("");
    const formData = new FormData();
    formData.append("file", file);
    try {
      const result = await uploadFundingImage(formData);
      if ("error" in result) {
        setImageError(result.error);
        setImagePreview(funding.image_url);
      } else {
        setImageUrl(result.url);
      }
    } catch {
      setImageError("이미지 용량이 너무 커서 업로드가 안 돼요. 다른 이미지로 시도해주세요");
      setImagePreview(funding.image_url);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSave = () => {
    if (!title) return setError("제목을 입력해주세요");
    if (!endDate) return setError("마감일을 선택해주세요");
    if (!giftTargetAmount) return setError("목표 금액을 입력해주세요");
    if (imageUploading) return setError("이미지 업로드 중입니다");
    setError("");

    startTransition(async () => {
      try {
        const result = await updateFunding(token, {
          title,
          description,
          endDate,
          imageUrl,
          gift: {
            id: gift.id,
            name: title,
            targetAmount: parseInt(giftTargetAmount.replace(/,/g, ""), 10),
            description: "",
          },
        });
        if ("error" in result) return setError(result.error);
        router.back();
      } catch {
        setError("저장에 실패했어요. 다시 시도해주세요");
      }
    });
  };

  return (
    <>
      <Header />
      <main className="px-4 py-6">
        <h1 className="text-xl font-bold mb-6">펀딩 수정하기</h1>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">이미지</label>
            <div
              className="relative border-2 border-dashed border-gray-200 rounded-2xl overflow-hidden cursor-pointer hover:border-rose-300 transition-colors aspect-[4/3]"
              onClick={() => fileInputRef.current?.click()}
            >
              {imagePreview ? (
                <Image
                  src={imagePreview}
                  alt="미리보기"
                  fill
                  sizes="(min-width: 430px) 400px, 100vw"
                  className="object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <span className="text-2xl">📷</span>
                  <span className="text-xs">클릭해서 이미지 변경</span>
                </div>
              )}
              {imageUploading && (
                <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                  <span className="text-sm text-gray-500">업로드 중...</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imageError && (
              <p className="text-sm text-red-500">{imageError}</p>
            )}
          </div>

          <Input
            label={
              <>
                <span className="text-rose-500">*</span>제목
              </>
            }
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">설명</label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <Input
            label={
              <>
                <span className="text-rose-500">*</span>마감일
              </>
            }
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
          />

          <Input
            label={
              <>
                <span className="text-rose-500">*</span>목표 금액 (원)
              </>
            }
            value={giftTargetAmount}
            onChange={handleAmountChange}
            inputMode="numeric"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              disabled={isPending}
              className="flex-1 h-[56px] rounded-[14px] border border-gray-200 text-[17px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={isPending || imageUploading}
              className="flex-1 h-[56px] rounded-[14px] bg-rose-500 text-white text-[17px] font-semibold hover:bg-rose-600 transition-colors disabled:opacity-40"
            >
              {isPending ? "저장 중..." : "저장하기"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
