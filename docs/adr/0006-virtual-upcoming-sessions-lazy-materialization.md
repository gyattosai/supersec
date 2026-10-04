# 0006. Virtual Upcoming Sessions and Lazy Materialization

Upcoming class sessions are computed virtually in memory from recurring subject schedule meetings (`weekday`, `start`, `end`) within the term date range, rather than pre-generated as empty documents in MongoDB. A session document is instantiated lazily only when the secretary explicitly begins roll call ("Start Session") or records a "No Class" day. This keeps the database free of unheld phantom sessions, simplifies mid-term schedule adjustments, and guarantees clean statistical queries.
