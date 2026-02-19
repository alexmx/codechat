export function LoadingScreen() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ backgroundColor: 'var(--color-page-bg)' }}
    >
      <div className="text-center">
        <div className="mb-4 text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          CodeChat
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Connecting to review server...
        </div>
      </div>
    </div>
  );
}
