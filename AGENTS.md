## Data isolation
- Sewing fines are authorized by the linked worker's account in database RLS; writes also require the authenticated creator, preventing cross-account payroll deductions.
- Shared production tables use account ownership and RLS, with unknown legacy owners quarantined rather than guessed; database actions run as the caller and foreign references must match ownership.
- Worker catalogue reads use a sessionless token-scoped client; authenticated identity changes clear query caches and remount screens to prevent stale account data.