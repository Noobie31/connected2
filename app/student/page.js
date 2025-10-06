"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function StudentPage() {
  const [user, setUser] = useState(null);
  const [studentName, setStudentName] = useState("");
  const [teachers, setTeachers] = useState([]);
  const [hoverLogout, setHoverLogout] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUser(user);

      // get student's info
      const { data: student } = await supabase
        .from("student_course")
        .select("name, course_code")
        .eq("email", user.email)
        .maybeSingle();

      if (!student) return;

      setStudentName(student.name || "Student");

      const courses = student.course_code
        ? student.course_code.split(",").map((c) => c.trim())
        : [];

      // get teachers of those courses
      const { data: teachers } = await supabase
        .from("course_teacher")
        .select("teacher_name, teacher_email, course_code")
        .in("course_code", courses);

      setTeachers(teachers || []);
    };

    fetchData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Create or fetch conversation UUID
  async function openConversation(teacherEmail) {
    const studentEmail = user.email;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant1.eq.${studentEmail},participant2.eq.${teacherEmail}),and(participant1.eq.${teacherEmail},participant2.eq.${studentEmail})`
      )
      .maybeSingle();

    if (existing?.id) {
      router.push(`/dm/${existing.id}`);
      return;
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert([{ participant1: studentEmail, participant2: teacherEmail }])
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("Error creating conversation:", error);
      return;
    }

    router.push(`/dm/${newConv.id}`);
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-700">
        <h1 className="text-xl font-semibold">
          Welcome, {studentName || "Student"}
        </h1>
        {user && (
          <button
            onClick={handleLogout}
            onMouseEnter={() => setHoverLogout(true)}
            onMouseLeave={() => setHoverLogout(false)}
            className="bg-gray-800 px-4 py-2 rounded-full text-sm hover:bg-red-600 transition-all"
          >
            {hoverLogout ? "Logout" : user.email}
          </button>
        )}
      </div>

      {/* Teachers list */}
      <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2">Your Teachers</h2>
        {teachers.length === 0 ? (
          <p className="text-gray-400">No teachers found.</p>
        ) : (
          teachers.map((t, i) => (
            <div
              key={i}
              onClick={() => openConversation(t.teacher_email)}
              className="cursor-pointer block bg-gray-800 p-4 rounded-xl hover:bg-gray-700 transition-all"
            >
              <p className="text-lg font-medium">{t.teacher_name}</p>
              <p className="text-sm text-gray-400 mt-1">{t.course_code}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
