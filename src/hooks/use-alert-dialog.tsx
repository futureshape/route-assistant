import { create } from 'zustand'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface AlertState {
  isOpen: boolean
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

interface AlertStore extends AlertState {
  showAlert: (title: string, description: string, actionLabel?: string, onAction?: () => void) => void
  hideAlert: () => void
}

const useAlertStore = create<AlertStore>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  actionLabel: undefined,
  onAction: undefined,
  showAlert: (title, description, actionLabel = 'OK', onAction) => {
    set({ isOpen: true, title, description, actionLabel, onAction })
  },
  hideAlert: () => {
    set({ isOpen: false, title: '', description: '', actionLabel: undefined, onAction: undefined })
  },
}))

export function useAlert() {
  const { showAlert } = useAlertStore()
  
  return {
    showAlert: (message: string, title: string = 'Alert') => {
      showAlert(title, message)
    },
    showError: (message: string) => {
      showAlert('Error', message)
    },
    showSuccess: (message: string) => {
      showAlert('Success', message)
    },
  }
}

export function AlertDialogProvider() {
  const { isOpen, title, description, actionLabel, onAction, hideAlert } = useAlertStore()
  
  const handleAction = () => {
    if (onAction) {
      onAction()
    }
    hideAlert()
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && hideAlert()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={handleAction}>
            {actionLabel || 'OK'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
