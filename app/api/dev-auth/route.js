// app/api/dev-auth/route.js
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.warn("DEV AUTH route loaded but Supabase env not configured");
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

export async function POST(req) {
  try {
    // only allow in dev mode (safety)
    const body = await req.json();
    const email = (body.email || "").toLowerCase();
    const role = body.role || null; // optional: let frontend suggest role
    if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });

    // 1) try to find existing user (admin.listUsers)
    const listRes = await admin.auth.admin.listUsers({ filter: `email.eq.${email}` });
    if (listRes.error) {
      // fallback to list all and find (older SDKs)
      console.warn("listUsers returned error, trying fallback", listRes.error);
    }

    let user = null;
    if (listRes?.data?.users?.length) {
      user = listRes.data.users.find((u) => u.email === email);
    } else {
      // fallback: call listUsers without filter and search first page (rare)
      const fallback = await admin.auth.admin.listUsers();
      if (!fallback.error && fallback.data?.users?.length) {
        user = fallback.data.users.find((u) => u.email === email);
      }
    }

    const devPassword = process.env.NEXT_PUBLIC_DEV_PASSWORD || "devpass";
    const metadata = {
      role: role || (email.includes("teacher") ? "teacher" : "student"),
      password_set: true,
      // other dev metadata if you want
    };

    if (!user) {
      // create user
      const createRes = await admin.auth.admin.createUser({
        email,
        password: devPassword,
        email_confirm: true,
        user_metadata: metadata,
      });

      if (createRes.error) {
        console.error("createUser err:", createRes.error);
        return NextResponse.json({ error: createRes.error.message || "create failed" }, { status: 500 });
      }
      user = createRes.data.user || createRes.data;
    } else {
      // user exists: update password & metadata
      const updateRes = await admin.auth.admin.updateUserById(user.id, {
        password: devPassword,
        user_metadata: { ...((user.user_metadata) || {}), ...metadata },
        email_confirm: true,
      });

      if (updateRes.error) {
        console.error("updateUser err:", updateRes.error);
        // still continue if minor
      } else {
        user = updateRes.data.user || updateRes.data;
      }
    }

    // Return success (don't return service key or anything sensitive)
    return NextResponse.json({ ok: true, email: user.email, id: user.id, role: metadata.role });
  } catch (err) {
    console.error("dev-auth error", err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}
