"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function TeacherPage() {
  const [user, setUser] = useState(null);
  const [teacherName, setTeacherName] = useState("");
  const [courses, setCourses] = useState([]);
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

      // get teacher's courses
      const { data: teacherCourses } = await supabase
        .from("course_teacher")
        .select("course_code, teacher_name")
        .eq("teacher_email", user.email);

      if (!teacherCourses || teacherCourses.length === 0) return;

      setTeacherName(teacherCourses[0].teacher_name || "Teacher");
      const courseCodes = teacherCourses.map((c) => c.course_code);

      // fetch students for each course
      const { data: students } = await supabase
        .from("student_course")
        .select("name, email, course_code")
        .or(courseCodes.map((c) => `course_code.ilike.%${c}%`).join(","));

      // Map students to courses
      const courseMap = {};
      courseCodes.forEach((c) => {
        courseMap[c] = students
          ? students.filter((s) =>
              s.course_code
                .split(",")
                .map((x) => x.trim())
                .includes(c)
            )
          : [];
      });

      setCourses(
        courseCodes.map((c) => ({
          code: c,
          students: courseMap[c] || [],
        }))
      );
    };

    fetchData();
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Create/fetch conversation UUID
  async function openConversation(studentEmail) {
    const teacherEmail = user.email;

    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(participant1.eq.${teacherEmail},participant2.eq.${studentEmail}),and(participant1.eq.${studentEmail},participant2.eq.${teacherEmail})`
      )
      .maybeSingle();

    if (existing?.id) {
      router.push(`/dm/${existing.id}`);
      return;
    }

    const { data: newConv, error } = await supabase
      .from("conversations")
      .insert([{ participant1: teacherEmail, participant2: studentEmail }])
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
          Welcome, {teacherName || "Teacher"}
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

      {/* Courses & students */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {courses.length === 0 ? (
          <p className="text-gray-400">No courses found.</p>
        ) : (
          courses.map((course, i) => (
            <div
              key={i}
              className="bg-gray-800 p-4 rounded-xl space-y-2"
            >
              <p className="text-lg font-semibold">{course.code}</p>
              {course.students.length === 0 ? (
                <p className="text-gray-400 text-sm">No students enrolled.</p>
              ) : (
                course.students.map((s, idx) => (
                  <div
                    key={idx}
                    onClick={() => openConversation(s.email)}
                    className="cursor-pointer p-2 rounded hover:bg-gray-700 transition"
                  >
                    <p className="font-medium">{s.name}</p>
                  </div>
                ))
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
