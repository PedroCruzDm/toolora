import { toast } from "sonner"

export function notifySuccess(title: string, options?: Partial<Parameters<typeof toast.success>[1]>) {
  try { toast.dismiss() } catch { /* ignore */ }
  return toast.success(title, { ...options })
}

export function notifyError(title: string, options?: Partial<Parameters<typeof toast.error>[1]>) {
  try { toast.dismiss() } catch { /* ignore */ }
  return toast.error(title, { ...options })
}

export function notifyInfo(title: string, options?: Partial<Parameters<typeof toast.info>[1]>) {
  try { toast.dismiss() } catch { /* ignore */ }
  return toast.info(title, { ...options })
}

export function notifyMessage(title: string, options?: Partial<Parameters<typeof toast>[1]>) {
  try { toast.dismiss() } catch { /* ignore */ }
  return toast(title, { ...options })
}