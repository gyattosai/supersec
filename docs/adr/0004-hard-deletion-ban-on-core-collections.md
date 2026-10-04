# 0004. Hard Deletion Ban on Core Collections

To preserve complete academic auditability and prevent catastrophic cascading data corruption, hard deletion is permanently disabled (`delete: () => false`) in Payload collection access rules for `terms`, `subjects`, `students`, and `enrollments`. Historical entities may only transition to inactive states through explicit soft-deletion fields (`archivedAt` on subjects, `status: 'dropped'` and `droppedOn` on enrollments), guaranteeing that past sessions and attendance statistics remain permanent.
