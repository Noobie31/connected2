"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const DUMMY = process.env.NEXT_PUBLIC_DUMMY_AUTH === "true";
  const DEV_PASS = process.env.NEXT_PUBLIC_DEV_PASSWORD || "devpass";

  const devFlow = async (email) => {
    // call server-side dev-auth to ensure user exists and has a dev password
    const res = await fetch("/api/dev-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || "dev auth failed");

    // now sign in with the shared dev password to get a real session
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASS,
    });
    if (error) throw error;

    // signed in — redirect according to role (we stored role in metadata on server)
    const role = (data.user?.user_metadata?.role) || json.role || "student";
    router.push(role === "teacher" ? "/teacher" : "/student");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (DUMMY) {
        await devFlow(email.toLowerCase());
        return;
      }

      // === your existing real flow starts here (unchanged) ===
      const { data: authStatus, error: rpcError } = await supabase.rpc(
        "check_auth_user",
        { email_input: email }
      );
      if (rpcError) throw rpcError;

      if (authStatus.exists) {
        if (!authStatus.password_set) {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) throw error;
          router.push("/check-email");
          return;
        }
        router.push(`/password?email=${encodeURIComponent(email)}`);
        return;
      }

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

      if (!teacher && !student) {
        router.push("/error");
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) throw error;

      router.push("/check-email");
    } catch (err) {
      console.error(err);
      alert(err.message || "Login error");
      router.push("/error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <form onSubmit={handleLogin} className="bg-black p-6 rounded-2xl shadow-md w-80 flex flex-col space-y-4">
        <h1 className="text-2xl font-bold text-center text-white">Login</h1>
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" disabled={loading} className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
          {loading ? "Processing..." : DUMMY ? "Dev quick-login" : "Submit"}
        </button>
      </form>
    </div>
  );
}
