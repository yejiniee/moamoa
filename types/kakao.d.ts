interface Window {
  Kakao?: {
    isInitialized: () => boolean
    init: (key?: string) => void
    Share?: {
      sendDefault: (options: Record<string, unknown>) => void
    }
  }
}
