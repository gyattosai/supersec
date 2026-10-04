# 0003. Embedded Session Attendance Entries

To optimize for high-velocity in-class roll calls on mobile connections, attendance records are stored as an embedded `entries[]` array directly within each `sessions` document rather than normalized across separate collection documents. This enables single-roundtrip document reads and atomic draft autosaves for the entire class roster, while leveraging Payload CMS versioning to snapshot the full session state on each publish.
