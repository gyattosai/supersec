# 0007. Defense-in-Depth Enforcement of Attendance Rules

Critical attendance invariants are enforced strictly at the database and collection hook level rather than relying solely on client UI guards. A Payload `beforeChange` hook blocks session publishing whenever any active enrolled student entry remains "Not set" (Rule R1), and a compound unique index `{ subject: 1, date: 1 }` in MongoDB prevents concurrent race conditions or accidental duplicate sessions on the same class day (Rules R7 & R8).
