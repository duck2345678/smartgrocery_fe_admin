# SmartGrocery Admin FE

## Key updates in this version

- Removed `AI Engine` from main sidebar and router.
- Renamed `Người dùng` to `Quản lý tài khoản`.
- Added a full account-management page with:
  - list + filter by role/status/created date
  - create user form
  - edit user form
  - ban/unban action (with reason)
  - soft delete action (with reason and confirm)

## Account management behavior

- Roles visible in UI: `CUSTOMER`, `STAFF`, `ADMIN`.
- Staff session:
  - can view/edit customer accounts only
  - cannot ban/unban or soft-delete.
- Admin session:
  - full CRUD + status and soft-delete.

## Backend API expected

- `GET /api/v1/admin/users`
- `POST /api/v1/admin/users`
- `PUT /api/v1/admin/users/{id}`
- `POST /api/v1/admin/users/{id}/status`
- `DELETE /api/v1/admin/users/{id}`

## Run

```bash
npm install
npm run dev
```
