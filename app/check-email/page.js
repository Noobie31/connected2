"use client";

import { useEffect, useState } from "react";

export default function CheckEmailPage() {
  const [magicLink, setMagicLink] = useState("");

  useEffect(() => {
    const link = sessionStorage.getItem("dev_magic_link");
    if (link) setMagicLink(link);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center p-4">
      <h1 className="text-2xl font-bold mb-2 text-blue-700">Check Your Email</h1>
      <p className="text-gray-600 mb-6">
        If your email is registered, a login link has been sent.
      </p>

      {magicLink ? (
        <div className="bg-gray-100 p-4 rounded-lg shadow-sm">
          <p className="text-gray-700 mb-2">Dev Mode Magic Link:</p>
          <a
            href={magicLink}
            className="text-blue-600 underline break-all hover:text-blue-800"
          >
            {magicLink}
          </a>
        </div>
      ) : (
        <p className="text-gray-400">No link found (maybe session expired).</p>
      )}
    </div>
  );
}
