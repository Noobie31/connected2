"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";

export const dynamic = "force-dynamic";

function PassResetForm() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email) throw new Error("Missing email in URL.");

      // Step 1: Set password
      const { error: passError } = await supabase.auth.updateUser({ password });
      if (passError) throw passError;

      // Step 2: Determine user role
      const { data: teacher } = await supabase
        .from("course_teacher")
        .select("teacher_email")
        .eq("teacher_email", email)
        .maybeSingle();

      const { data: student } = await supabase
        .from("student_course")
        .select("email")
        .eq("email", email)
        .maybeSingle();

      const role = teacher ? "teacher" : student ? "student" : null;
      if (!role) throw new Error("User not found in database.");

      // Step 3: Update user metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role, password_set: true },
      });
      if (metaError) throw metaError;

      // Step 4: Success message + redirect
      setSuccess(true);
      setTimeout(() => {
        window.location.href = `https://yourdomain.com/login?email=${encodeURIComponent(email)}`;
      }, 2000);
    } catch (err) {
      console.error("Password setup error:", err);
      alert(err.message || "Error setting password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
      {!success ? (
        <form
          onSubmit={handleSetPassword}
          className="bg-black p-6 rounded-2xl shadow-md w-80 flex flex-col space-y-4"
        >
          <h1 className="text-2xl font-bold text-center">Set Your Password</h1>
          <input
            type="password"
            placeholder="Enter new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="border border-gray-700 rounded-lg px-3 py-2 bg-gray-800 focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 py-2 rounded-lg"
          >
            {loading ? "Saving..." : "Set Password"}
          </button>
        </form>
      ) : (
        <div className="text-center space-y-3">
          <h1 className="text-2xl font-bold text-green-400">Password Set!</h1>
          <p className="text-gray-300">Redirecting you to the app login...</p>
        </div>
      )}
    </div>
  );
}

export default function PassResetPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
          <div>Loading...</div>
        </div>
      }
    >
      <PassResetForm />
    </Suspense>
  );
}
