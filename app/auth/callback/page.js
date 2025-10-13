// /app/auth/callback/page.js
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        console.error("No session found:", error);
        router.push("/login");
        return;
      }

      const user = session.user;
      const email = user.email;

      // ✅ Step 1: Check if user has set a password
      const passwordSet = user.user_metadata?.password_set === true;

      if (!passwordSet) {
        // User exists but hasn't set password yet
        router.push(`/passrst?email=${encodeURIComponent(email)}`);
        return;
      }

      // ✅ Step 2: Determine role
      let role = user.user_metadata?.role;

      if (!role) {
        // Try to infer role from DB if metadata is missing
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

        if (teacher) {
          role = "teacher";
        } else if (student) {
          role = "student";
        }
      }

      // ✅ Step 3: Default role handling (fallback)
      if (!role) {
        console.warn("No role found for user:", email);
        router.push("/error");
        return;
      }

      // ✅ Step 4: Redirect based on role
      if (role === "teacher") router.push("/teacher");
      else if (role === "student") router.push("/student");
      else router.push("/error");
    };

    handleSession();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-700 text-lg">Processing login...</p>
    </div>
  );
}
