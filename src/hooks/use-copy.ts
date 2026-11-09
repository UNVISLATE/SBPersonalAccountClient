import { useState } from "react"
import { toast } from "sonner"

export function useCopy(timeout = 2000) {
  const [copiedText, setCopiedText] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  const copy = async (text: string, keyOrLabel = "Скопировано в буфер") => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedText(text)
      setCopiedKey(keyOrLabel)
      toast.success(keyOrLabel.includes(" ") ? keyOrLabel : "Скопировано в буфер")
      setTimeout(() => {
        setCopiedText(null)
        setCopiedKey(null)
      }, timeout)
      return true
    } catch {
      toast.error("Не удалось скопировать")
      return false
    }
  }

  return {
    copy,
    copiedText,
    copiedKey,
    isCopied: (val: string) => copiedText === val,
  }
}
