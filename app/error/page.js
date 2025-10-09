"use client";
export default function ErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-red-50">
      <h1 className="text-3xl font-bold text-red-600 mb-4">Access Denied</h1>
      <p className="text-gray-700">Your email is not registered in the system.</p>
      <a
        href="/login"
        className="mt-4 text-blue-600 underline hover:text-blue-800"
      >
        Contact Coordinator
      </a>
      {/* <a
        href="/login"
        className="mt-4 text-blue-600 underline hover:text-blue-800"
      >
        Go back to login
      </a> */}
    </div>
  );
}
