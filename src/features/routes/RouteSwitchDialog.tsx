interface RouteSwitchDialogProps {
  show: boolean
  newRouteName: string
  currentRouteName: string
  poiCount: number
  onAction: (action: 'keep-editing' | 'keep-points' | 'clear-points') => void
}

export function RouteSwitchDialog({
  show,
  newRouteName,
  currentRouteName,
  poiCount,
  onAction
}: RouteSwitchDialogProps) {
  if (!show) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-4">Unsaved Points</h3>
        <p className="text-sm text-gray-600 mb-6">
          You have {poiCount} point{poiCount !== 1 ? 's' : ''} on "{currentRouteName}" that haven't been sent to RideWithGPS yet. What would you like to do with them?
        </p>
        <div className="space-y-3">
          <button
            onClick={() => onAction('keep-editing')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Keep editing "{currentRouteName}"
          </button>
          <button
            onClick={() => onAction('keep-points')}
            className="w-full px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Move points to "{newRouteName}"
          </button>
          <button
            onClick={() => onAction('clear-points')}
            className="w-full px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Discard points and switch to "{newRouteName}"
          </button>
        </div>
      </div>
    </div>
  )
}
