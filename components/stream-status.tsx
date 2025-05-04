import { AlertCircle, CheckCircle, RefreshCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface StreamStatusProps {
  status: "primary" | "backup" | "loading" | "error"
  backupIndex?: number
  className?: string
}

export function StreamStatus({ status, backupIndex, className }: StreamStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium",
        status === "primary" && "bg-green-500 text-white",
        status === "backup" && "bg-amber-500 text-white",
        status === "loading" && "bg-blue-500 text-white",
        status === "error" && "bg-red-500 text-white",
        className,
      )}
    >
      {status === "primary" && (
        <>
          <CheckCircle className="h-4 w-4" />
          <span>Primary Stream</span>
        </>
      )}
      {status === "backup" && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Backup Stream {backupIndex !== undefined ? backupIndex + 1 : ""}</span>
        </>
      )}
      {status === "loading" && (
        <>
          <RefreshCcw className="h-4 w-4 animate-spin" />
          <span>Loading Stream...</span>
        </>
      )}
      {status === "error" && (
        <>
          <AlertCircle className="h-4 w-4" />
          <span>Stream Error</span>
        </>
      )}
    </div>
  )
}
