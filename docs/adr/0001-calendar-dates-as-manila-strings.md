# 0001. Calendar Dates as Manila Strings

Attendance sessions and class days represent Philippine academic calendar days rather than universal points in time. We store calendar dates as Asia/Manila `YYYY-MM-DD` text strings with regex validation, reserving UTC timestamps (`Date` objects) strictly for audit instants (`createdAt`, `publishedAt`, `decidedAt`). This prevents timezone conversion bugs where server or client runners shift midnight timestamps into the previous or next day.
