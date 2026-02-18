export function LoadingScreen() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ backgroundColor: '#0d1117' }}
    >
      <div className="text-center">
        <div className="mb-4 text-xl font-semibold" style={{ color: '#e6edf3' }}>
          CodeChat
        </div>
        <div className="text-sm" style={{ color: '#484f58' }}>
          Connecting to review server...
        </div>
      </div>
    </div>
  );
}
