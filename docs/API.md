# API Reference

Base URL: `/api`. All responses are JSON with an envelope:

```jsonc
// success
{ "success": true, "data": { /* ... */ } }
// error
{ "success": false, "message": "Human readable error", "errors": { /* field errors (422) */ } }
```

## Authentication

Auth uses **Auth.js (NextAuth) credentials** with JWT session cookies. The browser obtains a session by POSTing to the NextAuth endpoints (handled by the `signIn()` helper on the login page). Authenticated requests automatically send the session cookie; protected routes return `401` without it and `403` when the role is insufficient.

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/callback/credentials` | Sign in (via `signIn('credentials')`) |
| `POST` | `/api/auth/signout` | Sign out |
| `GET`  | `/api/auth/session` | Current session |
| `POST` | `/api/auth/change-password` | `{ currentPassword, newPassword }` |
| `POST` | `/api/auth/forgot-password` | `{ email }` → issues reset token (returned as `devToken` in dev) |
| `POST` | `/api/auth/reset-password` | `{ token, password }` |

### Roles
`SUPER_ADMIN` > `TEAM_LEADER` > `TECHNICIAN`. Endpoints note the minimum role.

---

## Profile
| Method | Endpoint | Role | Body |
|---|---|---|---|
| `GET` | `/api/profile` | any | — |
| `PUT` | `/api/profile` | any | `{ name?, mobile?, address?, profilePhoto?(dataURL), fcmToken? }` |

## Users
| Method | Endpoint | Role | Notes |
|---|---|---|---|
| `GET` | `/api/users` | TEAM_LEADER+ | `?role=&status=&search=&page=&perPage=` |
| `POST` | `/api/users` | SUPER_ADMIN | `{ name, email, password, role, mobile?, teamLeaderId? }` |
| `GET` | `/api/users/:id` | TEAM_LEADER+ | |
| `PUT` | `/api/users/:id` | SUPER_ADMIN | partial fields + `status`, `password` |
| `DELETE` | `/api/users/:id` | SUPER_ADMIN | soft delete |
| `GET` | `/api/technicians` | TEAM_LEADER+ | lightweight list for dropdowns |

## Dashboard
| `GET` | `/api/dashboard` | any | cards, task/complaint status, attendance summary, technician status, recent activity (scoped by role) |

## Attendance
| Method | Endpoint | Role | Body |
|---|---|---|---|
| `GET` | `/api/attendance` | any | `?from=&to=&userId=` (own records for technicians) |
| `GET` | `/api/attendance/today` | any | today's check-in/out state |
| `POST` | `/api/attendance/check-in` | any | `{ lat, lng, selfie?(dataURL) }` |
| `POST` | `/api/attendance/check-out` | any | `{ lat, lng, selfie? }` |

## Tasks
| Method | Endpoint | Role | Body / Notes |
|---|---|---|---|
| `GET` | `/api/tasks` | any | `?status=&type=&search=&assignedToId=` (own for technicians) |
| `POST` | `/api/tasks` | TEAM_LEADER+ | `{ customerName, customerMobile, address, type, priority, assignedToId?, description?, lat?, lng?, scheduledAt? }` |
| `GET` | `/api/tasks/:id` | any (own if tech) | full task with images, signature, feedback, materials, expenses |
| `PUT` | `/api/tasks/:id` | TEAM_LEADER+ | partial update / reassign |
| `DELETE` | `/api/tasks/:id` | TEAM_LEADER+ | cancel (soft delete) |
| `PATCH` | `/api/tasks/:id/status` | any | `{ status }` — technicians limited to ASSIGNED→IN_PROGRESS→RESOLVED |
| `GET` | `/api/tasks/:id/images` | any | list photos |
| `POST` | `/api/tasks/:id/images` | any (own if tech) | `{ type, image(dataURL), caption? }` |
| `GET` | `/api/tasks/:id/signature` | any | |
| `POST` | `/api/tasks/:id/signature` | any (own if tech) | `{ customerName, signature(dataURL) }` |

**Task types:** `NEW_INSTALLATION, COMPLAINT_VISIT, FIBER_REPAIR, ROUTER_REPLACEMENT, CABLE_MAINTENANCE, SITE_SURVEY`
**Statuses:** `PENDING, ASSIGNED, IN_PROGRESS, RESOLVED, COMPLETED, CANCELLED`
**Image types:** `BEFORE_POLE, BEFORE_FIBER, BEFORE_SITE, AFTER_ROUTER, AFTER_SPEEDTEST, AFTER_SITE, OTHER`

## Complaints
| Method | Endpoint | Role | Body / Notes |
|---|---|---|---|
| `GET` | `/api/complaints` | any | `?status=&category=&search=` |
| `POST` | `/api/complaints` | TEAM_LEADER+ | `{ customerName, customerMobile, address, category, description?, assignedToId? }` — auto-detects repeat complaints |
| `GET` | `/api/complaints/:id` | any (own if tech) | with repeat history + linked task |
| `PUT` | `/api/complaints/:id` | any | `{ status?, assignedToId?, description? }` (technicians progress own only) |
| `DELETE` | `/api/complaints/:id` | TEAM_LEADER+ | soft delete |

**Categories:** `NO_INTERNET, SLOW_SPEED, ROUTER_ISSUE, FIBER_CUT, BILLING_ISSUE, SIGNAL_PROBLEM`
**Workflow:** `OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED`

## GPS Tracking
| `POST` | `/api/gps/ping` | any | `{ lat, lng, accuracy?, speed? }` — device posts every ~30s |
| `GET` | `/api/gps/live` | TEAM_LEADER+ | live technician locations + distance travelled + active flag |

## Materials
| `GET` | `/api/materials` | any | inventory list (`lowStock` flag) |
| `POST` | `/api/materials` | TEAM_LEADER+ | `{ name, category, unit?, totalStock?, reorderLevel?, sku? }` |
| `GET/PUT/DELETE` | `/api/materials/:id` | varies | detail / update / remove |
| `POST` | `/api/materials/assign` | TEAM_LEADER+ | `{ materialId, technicianId, assignedQty, taskId? }` — decrements stock |
| `GET` | `/api/material-assignments` | any | own assignments for technicians |
| `PATCH` | `/api/material-assignments/:id` | any (own if tech) | `{ usedQty }` |

## Expenses
| `GET` | `/api/expenses` | any | own for technicians; includes `summary` by status |
| `POST` | `/api/expenses` | any | `{ type, amount, expenseDate, description?, receipt?(dataURL), taskId? }` |
| `GET` | `/api/expenses/:id` | any | |
| `PATCH` | `/api/expenses/:id` | TEAM_LEADER+ | `{ status: APPROVED|REJECTED, reviewComment? }` |

**Types:** `FUEL, TRAVEL, MATERIAL_PURCHASE, MISCELLANEOUS`

## Feedback
| `GET` | `/api/feedback` | any | `?technicianId=` |
| `POST` | `/api/feedback` | any | `{ technicianId, customerName, rating(1-5), comment?, taskId?, complaintId? }` — updates technician rolling rating |

## Notifications
| `GET` | `/api/notifications` | any | own; includes `unread` count |
| `POST` | `/api/notifications/read` | any | `{ id }` to read one, empty body to read all |

## Reports (TEAM_LEADER+)
| `GET` | `/api/reports/technician` | jobs/attendance/ratings/resolution — `?format=csv` |
| `GET` | `/api/reports/complaint` | open/closed/repeat + per-category — `?format=csv` |
| `GET` | `/api/reports/attendance` | `?from=&to=&format=csv` |

## Analytics (TEAM_LEADER+)
| `GET` | `/api/analytics` | 6-month installation/complaint/attendance trends, satisfaction distribution, technician performance |

## Audit (SUPER_ADMIN)
| `GET` | `/api/activity-logs` | append-only audit trail `?search=&page=` |

---

## Pagination

List endpoints accept `?page=` (default 1) and `?perPage=` (default 20, max 100) and return:

```jsonc
{ "items": [...], "pagination": { "page": 1, "perPage": 20, "total": 57, "totalPages": 3 } }
```

## Status codes

`200` OK · `201` Created · `401` Unauthenticated · `403` Forbidden · `404` Not found · `409` Conflict (duplicate / invalid transition) · `422` Validation error · `500` Server error.
