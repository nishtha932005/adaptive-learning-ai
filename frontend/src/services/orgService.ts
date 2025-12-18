import { supabase } from "../lib/supabase";

export interface Organization {
    id: string;
    name: string;
    code: string;
    mentor_id: string;
}

export interface TeacherStudent {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
    risk_score?: number;
    last_active?: string;
    current_course?: string;
}

export interface Assignment {
    id: string;
    course_id: string;
    student_id: string;
    status: "pending" | "in_progress" | "completed";
    due_date?: string;
    course?: {
        title: string;
    };
}

export const orgService = {
    // Student Methods
    async joinClass(classCode: string, studentId: string) {
        // 1. Find the org
        const { data: org, error: orgError } = await supabase
            .from("organizations")
            .select("id")
            .eq("code", classCode)
            .single();

        if (orgError || !org) throw new Error("Class not found");

        // 2. Join it
        const { error: joinError } = await supabase
            .from("organization_members")
            .insert({
                organization_id: org.id,
                student_id: studentId,
            });

        if (joinError) throw joinError;

        // 3. Update student role if needed (optional, assuming they stay 'student')
        return org.id;
    },

    async getStudentAssignments(studentId: string) {
        const { data, error } = await supabase
            .from("assignments")
            .select(`
        *,
        course:courses(title, thumbnail_url, description)
      `)
            .eq("student_id", studentId)
            .order("due_date", { ascending: true });

        if (error) throw error;
        return data;
    },

    // Mentor Methods
    async getMyOrganizations(mentorId: string) {
        const { data, error } = await supabase
            .from("organizations")
            .select("*")
            .eq("mentor_id", mentorId);

        if (error) throw error;
        return data;
    },

    async getOrgStudents(orgId: string): Promise<TeacherStudent[]> {
        // Get members
        const { data: members, error } = await supabase
            .from("organization_members")
            .select(`
        student:students(id, full_name, email, last_active_at)
      `)
            .eq("organization_id", orgId);

        if (error) throw error;

        // Transform and mock risk scores for now (since we don't have a real risk engine yet)
        return members.map((m: any) => ({
            id: m.student.id,
            full_name: m.student.full_name,
            email: m.student.email,
            last_active: m.student.last_active_at,
            risk_score: Math.floor(Math.random() * 100), // MOCK
            current_course: "React Basics", // Mock
        }));
    },

    async assignCourseToOrg(orgId: string, courseId: string, dueDate?: string) {
        // 1. Get all students in org
        const { data: members } = await supabase
            .from("organization_members")
            .select("student_id")
            .eq("organization_id", orgId);

        if (!members || members.length === 0) return 0;

        // 2. Create assignments
        const assignments = members.map((m) => ({
            organization_id: orgId,
            course_id: courseId,
            student_id: m.student_id,
            status: "pending",
            due_date: dueDate,
        }));

        const { error } = await supabase.from("assignments").insert(assignments);
        if (error) throw error;

        return members.length;
    },
};
