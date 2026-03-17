# ✅ Quick Add Invoice - Latest Fix (Test Now!)

**Fixed**: Regex `/^PB\\d{11}$/` (PB + 11 digits = 13 chars) - matches \"PB07090012345\" exactly.

**New Debug Logs** (submit → check **terminal/console**):
```
=== DEBUG Mã KH ===
Raw input: \"...\"
Trimmed: PB07090012345
Length: 13
Regex test: true
```

**Test** (press `r` to reload):
1. FAB → `PB07090012345` + name + amount >0.
2. Submit → logs show details.
3. Regex true → API `quickAddInvoice` called.
4. Success → toast + navigate to list.

**If still \"định dạng sai\"**:
- Share **console logs** (raw input may have spaces/zero-width chars).
- Error now: \"PB + 11 số, 13 ký tự\".

Backend errors logged separately.

**App running** - test immediately!
