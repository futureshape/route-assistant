import { useEffect, useCallback } from 'react'
import { useAppStore } from '@/store'

/**
 * Hook that provides unsaved changes detection and warning functionality
 * for POI selections that haven't been committed to RideWithGPS yet
 */
export function useUnsavedChanges() {
  const markerStates = useAppStore((state) => state.markerStates)
  const selectedRouteId = useAppStore((state) => state.selectedRouteId)
  
  // Count selected POIs that haven't been committed
  const selectedCount = Object.values(markerStates).filter(state => state === 'selected').length
  const hasUnsavedChanges = selectedCount > 0 && selectedRouteId !== null
  
  // Browser beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        console.log(`[UnsavedChanges] Preventing navigation - ${selectedCount} unsaved POIs`)
        const message = `You have ${selectedCount} point${selectedCount !== 1 ? 's' : ''} selected that haven't been sent to RideWithGPS. Are you sure you want to leave?`
        e.preventDefault()
        e.returnValue = message
        return message
      }
    }
    
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges, selectedCount])
  
//   // Browser back/forward button protection
//   useEffect(() => {
//     const handlePopState = (e: PopStateEvent) => {
//       if (hasUnsavedChanges) {
//         console.log(`[UnsavedChanges] Browser navigation detected with ${selectedCount} unsaved POIs`)
//         const message = `You have ${selectedCount} point${selectedCount !== 1 ? 's' : ''} selected that haven't been sent to RideWithGPS. Are you sure you want to navigate away?`
        
//         if (!window.confirm(message)) {
//           // Push the current state back to prevent navigation
//           console.log(`[UnsavedChanges] User cancelled navigation, staying on current page`)
//           window.history.pushState(null, '', window.location.href)
//           e.preventDefault()
//           return false
//         } else {
//           console.log(`[UnsavedChanges] User confirmed navigation, allowing back/forward`)
//         }
//       }
//     }
    
//     window.addEventListener('popstate', handlePopState)
//     return () => window.removeEventListener('popstate', handlePopState)
//   }, [hasUnsavedChanges, selectedCount])
  
  // Function to confirm action with unsaved changes
  const confirmAction = useCallback((actionName: string = 'continue'): boolean => {
    if (!hasUnsavedChanges) {
      console.log(`[UnsavedChanges] No unsaved changes, allowing ${actionName}`)
      return true
    }
    
    console.log(`[UnsavedChanges] Asking user to confirm ${actionName} with ${selectedCount} unsaved POIs`)
    const message = `You have ${selectedCount} point${selectedCount !== 1 ? 's' : ''} selected that haven't been sent to RideWithGPS. Are you sure you want to ${actionName}?`
    const result = window.confirm(message)
    console.log(`[UnsavedChanges] User ${result ? 'confirmed' : 'cancelled'} ${actionName}`)
    return result
  }, [hasUnsavedChanges, selectedCount])
  
  return {
    hasUnsavedChanges,
    selectedCount,
    confirmAction
  }
}