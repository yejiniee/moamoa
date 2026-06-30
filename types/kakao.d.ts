interface Window {
  Kakao?: {
    isInitialized: () => boolean
    init: (key: string | undefined) => void
    Share?: {
      sendDefault: (options: {
        objectType: string
        content: {
          title: string
          description: string
          link: { mobileWebUrl: string; webUrl: string }
        }
        buttons: { title: string; link: { mobileWebUrl: string; webUrl: string } }[]
      }) => void
    }
  }
}
