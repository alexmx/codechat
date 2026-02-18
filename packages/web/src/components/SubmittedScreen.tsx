export function SubmittedScreen() {
  return (
    <div
      className="flex h-screen items-center justify-center"
      style={{ backgroundColor: '#0d1117' }}
    >
      <div className="text-center">
        <svg
          width="48"
          height="48"
          viewBox="0 0 16 16"
          fill="#3fb950"
          className="mx-auto mb-4"
        >
          <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
        </svg>
        <div className="mb-2 text-xl font-semibold" style={{ color: '#e6edf3' }}>
          Review submitted
        </div>
        <div className="mb-4 text-sm" style={{ color: '#484f58' }}>
          This window should close automatically.
        </div>
        <button
          onClick={() => window.close()}
          className="rounded-md px-4 py-1.5 text-sm font-medium"
          style={{ color: '#8b949e', border: '1px solid #30363d', backgroundColor: 'transparent' }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#161b22')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          Close window
        </button>
      </div>
    </div>
  );
}
