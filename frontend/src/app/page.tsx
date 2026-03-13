import EditorWrapper from '@/components/EditorWrapper';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-gray-950 text-white p-8">
      <div className="w-full max-w-5xl flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          Collab<span className="text-blue-500">Code</span>
        </h1>
        <div className="text-sm bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
          Decentralized Node
        </div>
      </div>
      
      {/* We load the Client Component wrapper instead */}
      <EditorWrapper />
    </main>
  );
}