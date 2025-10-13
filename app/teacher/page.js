// /app/student/page.js
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Search } from "lucide-react";

export default function TeacherPage() {
  const [user, setUser] = useState(null);
  const [teacherName, setTeacherName] = useState("");
  const [courses, setCourses] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState("");
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

      // Flatten all students for search
      const uniqueStudents = [];
      const seenEmails = new Set();
      
      students?.forEach((s) => {
        if (!seenEmails.has(s.email)) {
          seenEmails.add(s.email);
          uniqueStudents.push(s);
        }
      });
      
      setAllStudents(uniqueStudents);
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

  // Filter students by search term (case-insensitive)
  const filteredStudents = allStudents.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col h-screen bg-gray-100 text-black">
      {/* ---------- TOP BAR ---------- */}
      <div className="flex-none bg-white shadow-md border-b border-gray-200 p-4 sticky top-0 z-20">
        <h1 className="text-xl font-semibold text-black mb-3">ConnectED</h1>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-100 border border-gray-300 rounded-xl px-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 transition-all placeholder-gray-500"
          />
        </div>
      </div>

      {/* ---------- STUDENT LIST (SCROLLABLE) ---------- */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredStudents.length === 0 ? (
          <p className="text-gray-400 text-center mt-10">No students found.</p>
        ) : (
          filteredStudents.map((s, i) => {
            const letter = s.name?.[0]?.toUpperCase() || "?";
            // Get all courses for this student
            const studentCourses = s.course_code
              .split(",")
              .map((c) => c.trim())
              .join(", ");
            
            return (
              <motion.div
                key={i}
                onClick={() => openConversation(s.email)}
                className="flex items-center gap-4 p-3 bg-white rounded-2xl shadow hover:bg-green-50 cursor-pointer transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-semibold text-lg">
                  {letter}
                </div>
                <div className="flex flex-col">
                  <p className="text-base font-medium text-gray-900">
                    {s.name}
                  </p>
                  <p className="text-sm text-gray-500">{studentCourses}</p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* ---------- BOTTOM BAR ---------- */}
      <div className="flex-none bg-white border-t border-gray-200 shadow-inner p-4 flex items-center justify-between sticky bottom-0 z-20">
        <div className="flex items-center gap-3">
          {/* Alphabetical icon (first letter) */}
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
            {teacherName?.[0]?.toUpperCase() || "T"}
          </div>
          <p className="text-lg font-semibold">{teacherName || "Teacher"}</p>
        </div>

        {user && (
          <button
            onClick={handleLogout}
            className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium hover:bg-red-600 transition-all"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}