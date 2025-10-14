"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { supabase } from "../../lib/supabase";

import loginbg from "../../images/loginbg.jpg";
import logo from "../../images/logo.png";
import uni from "../../images/uni.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const params = useSearchParams();
  const router = useRouter();

  const DUMMY = process.env.NEXT_PUBLIC_DUMMY_AUTH === "true";
  const DEV_PASS = process.env.NEXT_PUBLIC_DEV_PASSWORD || "devpass";

  // 🧠 Prefill logic
  useEffect(() => {
    const queryEmail = params.get("email");
    if (queryEmail) {
      setEmail(queryEmail);
      localStorage.setItem("prefill_email", queryEmail);
    } else {
      const stored = localStorage.getItem("prefill_email");
      if (stored) setEmail(stored);
    }
  }, [params]);

  const devFlow = async (email) => {
    const res = await fetch("/api/dev-auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error || "dev auth failed");

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: DEV_PASS,
    });
    if (error) throw error;

    const role = data.user?.user_metadata?.role || json.role || "student";
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

      const { data: authStatus, error: rpcError } = await supabase.rpc(
        "check_auth_user",
        { email_input: email }
      );
      if (rpcError) throw rpcError;

      if (authStatus.exists) {
        if (!authStatus.password_set) {
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
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
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
    <div
      className="relative flex items-center justify-center min-h-screen bg-cover bg-center"
      style={{
        backgroundImage: `url(${loginbg.src})`,
        backgroundPosition: "center",
        backgroundSize: "cover",
      }}
    >
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />

      <div className="relative mb-10 z-10 flex flex-col items-center w-full max-w-sm -translate-y-25">
        <div className="flex flex-col items-center gap-2">
          <Image
            src={logo}
            alt="Logo"
            width={140}
            height={140}
            className="object-contain drop-shadow-lg"
            priority
          />
          <Image
            src={uni}
            alt="University"
            width={180}
            height={90}
            className="object-contain drop-shadow-md"
          />
        </div>

        <div className="mt-20 w-full flex flex-col items-center space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="w-72 border border-white/50 bg-white/40 text-black placeholder-black/30 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
          />
          <button
            type="submit"
            onClick={handleLogin}
            disabled={loading}
            className="w-40 bg-blue-300/20 text-black  py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : DUMMY ? "Dev quick-login" : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
