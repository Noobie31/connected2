'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function CoordinatorPage() {
  const [activeTab, setActiveTab] = useState('student_course')
  const [studentRows, setStudentRows] = useState([])
  const [teacherRows, setTeacherRows] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchStudentCourse()
    fetchCourseTeacher()
  }, [])

  // Fetch student_course table
  const fetchStudentCourse = async () => {
    const { data, error } = await supabase.from('student_course').select('*')
    if (error) {
      setMessage(`Error fetching students: ${error.message}`)
    } else {
      setStudentRows(data || [])
    }
  }

  // Fetch course_teacher table
  const fetchCourseTeacher = async () => {
    const { data, error } = await supabase.from('course_teacher').select('*')
    if (error) {
      setMessage(`Error fetching teachers: ${error.message}`)
    } else {
      setTeacherRows(data || [])
    }
  }

  // Add row handlers
  const addStudentRow = () => {
    setStudentRows([...studentRows, { roll_no: '', name: '', email: '', course_code: '', isNew: true }])
  }

  const addTeacherRow = () => {
    setTeacherRows([...teacherRows, { course_code: '', teacher_name: '', teacher_email: '', isNew: true }])
  }

  // Delete row handlers - mark for deletion
  const deleteStudentRow = async (index) => {
    const row = studentRows[index]
    
    // If it's a new row (not in DB yet), just remove from state
    if (row.isNew) {
      setStudentRows(studentRows.filter((_, i) => i !== index))
      return
    }
    
    // If it exists in DB, delete it
    if (row.id) {
      const { error } = await supabase.from('student_course').delete().eq('id', row.id)
      if (error) {
        setMessage(`Error deleting student: ${error.message}`)
        return
      }
    } else if (row.roll_no) {
      // If no id, try deleting by roll_no (adjust based on your primary key)
      const { error } = await supabase.from('student_course').delete().eq('roll_no', row.roll_no)
      if (error) {
        setMessage(`Error deleting student: ${error.message}`)
        return
      }
    }
    
    setStudentRows(studentRows.filter((_, i) => i !== index))
    setMessage('Student deleted successfully')
  }

  const deleteTeacherRow = async (index) => {
    const row = teacherRows[index]
    
    // If it's a new row (not in DB yet), just remove from state
    if (row.isNew) {
      setTeacherRows(teacherRows.filter((_, i) => i !== index))
      return
    }
    
    // If it exists in DB, delete it
    if (row.id) {
      const { error } = await supabase.from('course_teacher').delete().eq('id', row.id)
      if (error) {
        setMessage(`Error deleting teacher: ${error.message}`)
        return
      }
    } else if (row.course_code && row.teacher_email) {
      // Try deleting by composite key if no id exists
      const { error } = await supabase
        .from('course_teacher')
        .delete()
        .eq('course_code', row.course_code)
        .eq('teacher_email', row.teacher_email)
      if (error) {
        setMessage(`Error deleting teacher: ${error.message}`)
        return
      }
    }
    
    setTeacherRows(teacherRows.filter((_, i) => i !== index))
    setMessage('Teacher deleted successfully')
  }

  // Save to Supabase
  const saveStudentRows = async () => {
    try {
      setMessage('Saving...')
      
      for (const row of studentRows) {
        // Skip empty rows
        if (!row.roll_no && !row.name && !row.email && !row.course_code) continue
        
        // Create a clean object without the isNew flag
        const cleanRow = {
          roll_no: row.roll_no,
          name: row.name,
          email: row.email,
          course_code: row.course_code
        }
        
        // Include id if it exists
        if (row.id) {
          cleanRow.id = row.id
        }
        
        const { error } = await supabase.from('student_course').upsert(cleanRow)
        if (error) {
          setMessage(`Error saving student: ${error.message}`)
          return
        }
      }
      
      setMessage('Students saved successfully!')
      await fetchStudentCourse()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
  }

  const saveTeacherRows = async () => {
    try {
      setMessage('Saving...')
      
      for (const row of teacherRows) {
        // Skip empty rows
        if (!row.course_code && !row.teacher_name && !row.teacher_email) continue
        
        // Create a clean object without the isNew flag
        const cleanRow = {
          course_code: row.course_code,
          teacher_name: row.teacher_name,
          teacher_email: row.teacher_email
        }
        
        // Include id if it exists
        if (row.id) {
          cleanRow.id = row.id
        }
        
        const { error } = await supabase.from('course_teacher').upsert(cleanRow)
        if (error) {
          setMessage(`Error saving teacher: ${error.message}`)
          return
        }
      }
      
      setMessage('Teachers saved successfully!')
      await fetchCourseTeacher()
    } catch (err) {
      setMessage(`Error: ${err.message}`)
    }
  }

  return (
    <div className="p-6">
      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-4 space-x-4">
        <button
          className={`px-4 py-2 rounded ${activeTab === 'student_course' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}
          onClick={() => setActiveTab('student_course')}
        >
          Student → Course
        </button>
        <button
          className={`px-4 py-2 rounded ${activeTab === 'course_teacher' ? 'bg-blue-500 text-white' : 'bg-gray-700 text-white'}`}
          onClick={() => setActiveTab('course_teacher')}
        >
          Course → Teacher
        </button>
      </div>

      {/* Student → Course Table */}
      {activeTab === 'student_course' && (
        <div>
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border p-2">Roll No</th>
                <th className="border p-2">Name</th>
                <th className="border p-2">Email</th>
                <th className="border p-2">Course Code</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map((row, idx) => (
                <tr key={row.id || idx} className="bg-white">
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.roll_no || ''}
                      onChange={(e) => {
                        const newRows = [...studentRows]
                        newRows[idx].roll_no = e.target.value
                        setStudentRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.name || ''}
                      onChange={(e) => {
                        const newRows = [...studentRows]
                        newRows[idx].name = e.target.value
                        setStudentRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.email || ''}
                      onChange={(e) => {
                        const newRows = [...studentRows]
                        newRows[idx].email = e.target.value
                        setStudentRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.course_code || ''}
                      onChange={(e) => {
                        const newRows = [...studentRows]
                        newRows[idx].course_code = e.target.value
                        setStudentRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => deleteStudentRow(idx)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={addStudentRow}>
              Add Row
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={saveStudentRows}>
              Save All
            </button>
          </div>
        </div>
      )}

      {/* Course → Teacher Table */}
      {activeTab === 'course_teacher' && (
        <div>
          <table className="min-w-full border border-gray-300">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="border p-2">Course Code</th>
                <th className="border p-2">Teacher Name</th>
                <th className="border p-2">Teacher Email</th>
                <th className="border p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teacherRows.map((row, idx) => (
                <tr key={row.id || idx} className="bg-white">
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.course_code || ''}
                      onChange={(e) => {
                        const newRows = [...teacherRows]
                        newRows[idx].course_code = e.target.value
                        setTeacherRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.teacher_name || ''}
                      onChange={(e) => {
                        const newRows = [...teacherRows]
                        newRows[idx].teacher_name = e.target.value
                        setTeacherRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      className="w-full border p-1 text-black"
                      value={row.teacher_email || ''}
                      onChange={(e) => {
                        const newRows = [...teacherRows]
                        newRows[idx].teacher_email = e.target.value
                        setTeacherRows(newRows)
                      }}
                    />
                  </td>
                  <td className="border p-2">
                    <button
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                      onClick={() => deleteTeacherRow(idx)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 flex gap-2">
            <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600" onClick={addTeacherRow}>
              Add Row
            </button>
            <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600" onClick={saveTeacherRows}>
              Save All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}