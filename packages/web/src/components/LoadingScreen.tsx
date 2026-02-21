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
        <div className="mb-4 flex justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            style={{ color: 'var(--color-text-muted)', animation: 'spin 1s linear infinite' }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        </div>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Connecting to review server...
        </div>
      </div>
    </div>
  );
}
