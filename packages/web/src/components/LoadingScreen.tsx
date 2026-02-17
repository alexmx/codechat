export function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-300">
      <div className="text-center">
        <div className="mb-4 text-2xl font-semibold">CodeChat</div>
        <div className="text-sm text-gray-500">Connecting to review server...</div>
      </div>
    </div>
  );
}
