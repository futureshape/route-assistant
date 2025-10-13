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
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
}

interface AlertStore extends AlertState {
  showAlert: (
    title: string, 
    description: string, 
    actionLabel?: string, 
    onAction?: () => void,
    secondaryActionLabel?: string,
    onSecondaryAction?: () => void
  ) => void
  hideAlert: () => void
}

const useAlertStore = create<AlertStore>((set) => ({
  isOpen: false,
  title: '',
  description: '',
  actionLabel: undefined,
  onAction: undefined,
  secondaryActionLabel: undefined,
  onSecondaryAction: undefined,
  showAlert: (title, description, actionLabel = 'OK', onAction, secondaryActionLabel, onSecondaryAction) => {
    set({ 
      isOpen: true, 
      title, 
      description, 
      actionLabel, 
      onAction,
      secondaryActionLabel,
      onSecondaryAction
    })
  },
  hideAlert: () => {
    set({ 
      isOpen: false, 
      title: '', 
      description: '', 
      actionLabel: undefined, 
      onAction: undefined,
      secondaryActionLabel: undefined,
      onSecondaryAction: undefined
    })
  },
}))

export function useAlert() {
  const { showAlert } = useAlertStore()
  
  return {
    showAlert: (
      message: string, 
      title: string = 'Alert',
      options?: {
        actionLabel?: string
        onAction?: () => void
        secondaryActionLabel?: string
        onSecondaryAction?: () => void
      }
    ) => {
      showAlert(
        title, 
        message, 
        options?.actionLabel, 
        options?.onAction,
        options?.secondaryActionLabel,
        options?.onSecondaryAction
      )
    },
    showError: (message: string) => {
      showAlert('Error', message)
    },
    showSuccess: (
      message: string,
      options?: {
        actionLabel?: string
        onAction?: () => void
        secondaryActionLabel?: string
        onSecondaryAction?: () => void
      }
    ) => {
      showAlert(
        'Success', 
        message, 
        options?.actionLabel, 
        options?.onAction,
        options?.secondaryActionLabel,
        options?.onSecondaryAction
      )
    },
  }
}

export function AlertDialogProvider() {
  const { 
    isOpen, 
    title, 
    description, 
    actionLabel, 
    onAction, 
    secondaryActionLabel,
    onSecondaryAction,
    hideAlert 
  } = useAlertStore()
  
  const handleAction = () => {
    if (onAction) {
      onAction()
    }
    hideAlert()
  }
  
  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction()
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
        <AlertDialogFooter className="gap-2">
          {secondaryActionLabel && (
            <AlertDialogAction 
              onClick={handleSecondaryAction}
              className="mt-2 sm:mt-0 bg-background text-foreground border border-input hover:bg-accent hover:text-accent-foreground"
            >
              {secondaryActionLabel}
            </AlertDialogAction>
          )}
          <AlertDialogAction onClick={handleAction}>
            {actionLabel || 'OK'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
