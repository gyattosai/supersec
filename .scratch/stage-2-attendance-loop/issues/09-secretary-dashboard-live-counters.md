# 09: Secretary Dashboard Live Metric Counters

**What to build:** Real-time operational indicator badges on the Secretary Console Dashboard (`/console/dashboard`):
1. **Pending Requests Counter Badge**: Displays the total count of unreviewed student requests across all active subjects. Tapping the badge opens the global requests queue.
2. **Flagged Students Counter Badge**: Displays the total count of students currently at risk or exceeding absence limits across all active subjects. Tapping the badge opens the monitoring overview.

**Blocked by:** 04 (Secretary Request Review Queue), 06 (Secretary Monitoring Tab).

**Status:** ready-for-agent

- [ ] Console dashboard queries pending requests count and displays a prominent badge when pending requests exist.
- [ ] Console dashboard displays the count of students flagged for attendance warnings.
- [ ] Tapping the pending requests badge opens the review queue.
- [ ] Tapping the flagged students badge opens the monitoring view.
