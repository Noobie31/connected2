"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

// Add viewport export for Next.js 14+ App Router
export const viewport = {
  width: "device-width",
  initialScale: 1,
};
export const dynamic = "force-dynamic";


export default function PassResetPage() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!email) throw new Error("Missing email in URL.");

      // Update password
      const { error: passError } = await supabase.auth.updateUser({ password });
      if (passError) throw passError;

      // Determine role
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

      // Update metadata
      const { error: metaError } = await supabase.auth.updateUser({
        data: { role, password_set: true },
      });
      if (metaError) throw metaError;

      router.push(role === "teacher" ? "/teacher" : "/student");
    } catch (err) {
      console.error("Password setup error:", err);
      alert(err.message || "Error setting password. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
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
    </div>
  );
}
