"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Toast from "@/components/ui/Toast";
import { uploadFundingImage, createFunding } from "./actions";

export default function CreatePage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");
  const [giftTargetAmount, setGiftTargetAmount] = useState("");

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setGiftTargetAmount(raw ? Number(raw).toLocaleString("ko-KR") : "");
  };
  const [error, setError] = useState("");
  const [shareToken, setShareToken] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  // 이미지 업로드 상태
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState("");
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
        setImagePreview(null);
      } else {
        setImageUrl(result.url);
      }
    } catch {
      setImageError("5MB 이하 파일을 넣어주세요");
      setImagePreview(null);
    } finally {
      setImageUploading(false);
    }
  };

  const handleCreateFunding = () => {
    if (!title) return setError("제목을 입력해주세요");
    if (!endDate) return setError("마감일을 선택해주세요");
    if (!giftTargetAmount) return setError("목표 금액을 입력해주세요");
    if (imageUploading)
      return setError("이미지 업로드 중입니다. 잠시 기다려주세요");
    setError("");

    startTransition(async () => {
      try {
        const result = await createFunding({
          title,
          description,
          imageUrl,
          endDate,
          gifts: [
            {
              name: title,
              targetAmount: parseInt(giftTargetAmount.replace(/,/g, ""), 10),
              description: "",
            },
          ],
        });
        if ("error" in result) return setError(result.error);
        setShareToken(result.shareToken);
      } catch {
        setError("펀딩 생성에 실패했어요. 다시 시도해주세요");
      }
    });
  };

  if (shareToken) {
    const shareUrl = `${window.location.origin}/funding/${shareToken}`;
    const handleCopyLink = async () => {
      try {
        await navigator.clipboard.writeText(shareUrl);
        setToast("링크를 복사했어요");
      } catch {
        setToast("복사에 실패했어요");
      }
    };
    return (
      <main className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm text-center flex flex-col gap-4">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">펀딩이 만들어졌어요!</h1>
          <p className="text-gray-500 text-sm">
            아래 링크를 참여자들에게 공유하세요
          </p>
          <div className="bg-gray-100 rounded-xl p-4 break-all text-sm text-gray-700">
            {shareUrl}
          </div>
          <Button onClick={handleCopyLink}>
            링크 복사하기
          </Button>
          <button
            className="mt-1 text-sm text-rose-500 hover:underline"
            onClick={() => router.push(`/funding/${shareToken}`)}
          >
            펀딩 페이지 보러가기 →
          </button>
        </div>
        <Toast message={toast} onDismiss={() => setToast(null)} />
      </main>
    );
  }

  return (
    <>
      <main className="px-4 py-6">
        <h1 className="text-xl font-bold mb-6">펀딩 만들기</h1>
        <div className="flex flex-col gap-5">
          {/* 이미지 업로드 */}
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
                  <span className="text-xs">클릭해서 이미지 업로드</span>
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
            {imageUrl && (
              <p className="text-xs text-green-600">✓ 이미지 업로드 완료</p>
            )}
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
            placeholder="지수 생일 선물 펀딩 🎂"
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">설명</label>
            <textarea
              className="border border-gray-300 rounded-lg px-3 py-2 text-base outline-none focus:ring-2 focus:ring-rose-300 resize-none"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="펀딩 소개를 적어주세요"
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
            placeholder="350,000"
            inputMode="numeric"
          />

          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button
            onClick={handleCreateFunding}
            disabled={isPending || imageUploading}
          >
            {isPending ? "생성 중..." : "펀딩 만들기"}
          </Button>
        </div>
      </main>
    </>
  );
}
