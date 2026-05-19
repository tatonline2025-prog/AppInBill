# AppInBill v1.8.3 End-to-End Test Checklist

## Pre-Build Validation Checklist

### Code Quality ✅
- [x] ESLint: 0 warnings, 0 errors
- [x] TypeScript: No type errors  
- [x] All fixes committed: Commit 6d0808f (Deep fix v1.8.3)
- [x] Git status clean: Ready for build

### Deep Fix Validation ✅
**Deep Fix: Code Page Switching for Vietnamese Bixolon Support**
- [x] `generateBillEscPos.ts` modified with code page switching
- [x] `useVietnameseMode` parameter: defaults to true
- [x] ESC command added: `\x1B\x74\x2D` (ESC t 45 for TCVN 5712)
- [x] Vietnamese text preserved: ă, ế, ơ, ư, đ kept intact
- [x] ASCII fallback maintained: available when useVietnameseMode=false
- [x] All renderBlock calls updated to use textConverter
- [x] Console logging added for debug tracking

### Runtime Testing (Manual - On Device)

#### Test 1: App Boot & Login
- [ ] App starts without crashes
- [ ] Login to hoadon.dvtienich.vn works
- [ ] Dashboard loads correctly
- [ ] Vietnamese characters display properly on-screen

#### Test 2: Invoice List & Display
- [ ] Uncollected tab loads invoices
- [ ] Collected tab loads invoices
- [ ] Vietnamese customer names render: Nguyễn, Trần, Phạm, etc.
- [ ] Vietnamese addresses render with proper diacritics
- [ ] Invoice details show all fields correctly

#### Test 3: Image Printing (Primary Path)
- [ ] Connect Bixolon printer via Bluetooth
- [ ] Press print button on uncollected invoice
- [ ] Receipt preview shows Vietnamese text correctly
- [ ] Bill image captures without timeout
- [ ] Print to thermal printer succeeds
- [ ] **Visual check**: Receipt displays Vietnamese characters properly
  - Customer name: "Nguyễn Văn An" (not "Nguyen Van An")
  - Address: "Đường Tổng Tiến Phong" (proper diacritics)
  - Collector: "Trần Thị Thu Trang" (proper rendering)

#### Test 4: Toggle & Collection Operations
- [ ] Toggle print status works (uncollected ↔ printed)
- [ ] Toggle collection status works (not_collected ↔ collected)
- [ ] Toggle isPaid status works
- [ ] API calls return 200 with new summary fields
- [ ] No errors in console logs

#### Test 5: Vietnamese Data Integrity
- [ ] Vietnamese phone numbers display correctly: +84 (...) 
- [ ] Vietnamese currency formatting: 1,500,000 đ
- [ ] Vietnamese text in amounts: "Mười lăm triệu đồng"
- [ ] Collection fee calculated correctly: base + fee

#### Test 6: ESC-POS Fallback (If Needed)
- [ ] generateBillEscPos can be triggered manually
- [ ] Code page switch command is sent
- [ ] ASCII fallback works if code page not available
- [ ] No crashes in fallback path

#### Test 7: Storage & Persistence
- [ ] Printer selection saved to AsyncStorage
- [ ] Printer persists across app restart
- [ ] Saved printer recalled on app boot

#### Test 8: Error Handling
- [ ] Disconnect printer → graceful error message
- [ ] Timeout on print → user-friendly alert
- [ ] Image capture failure → handled properly
- [ ] Network failure on API → proper error feedback

### Backend Compatibility ✅
- [x] All API endpoints exist: fetchall, toggle, toggleispaid, etc.
- [x] New summary fields present: assignedCustomerCodes, unassignedCustomerCodes
- [x] App doesn't use new fields (backward compatible)
- [x] Database: Bill_hoa_don confirmed live
- [x] No breaking schema changes

### Frontend Compatibility ✅
- [x] inbill.dvtienich.vn dashboard uses new summary fields
- [x] No conflicts with app API calls
- [x] Web encoding UTF-8 correct

### Build & Release Readiness

**Before Building APK**:
- [ ] All tests above pass
- [ ] No new warnings in logs
- [ ] Vietnamese characters verified on real device
- [ ] Bixolon printer output verified visually

**Build Commands**:
```bash
# If using Expo
eas build --platform android --build-profile release

# Or if using React Native CLI
cd android && ./gradlew assembleRelease
```

**APK Versioning**:
- Version: 1.8.3
- versionCode: 48 (increment from 47)
- buildNumber: 3 (increment from 2)
- Update app.config.js before building

**Release Checklist**:
- [ ] Bump version in app.config.js
- [ ] Update CHANGELOG.md with deep fix details
- [ ] Tag commit: v1.8.3-deep-fix
- [ ] Build APK for testing on staging
- [ ] Internal QA on Bixolon printer
- [ ] If all pass: Build for Google Play release

### Rollback Plan
If issues arise:
1. Revert to commit aa06f0d (before deep fix)
2. Rebuild with useVietnameseMode=false by default
3. Release as v1.8.2p1 (patch version)

### Success Criteria ✅
- [x] Code quality: lint/typecheck pass
- [x] Deep fix: code page switching implemented
- [ ] Manual testing: Vietnamese printing verified
- [ ] Bixolon output: No "bể chữ", proper diacritics
- [ ] Zero regressions: All existing features work
- [ ] Ready for Play Store: All checks pass

---

## Testing Timeline

**Expected Duration**: 30-45 minutes for full manual testing

1. **Code validation** (5 min): ESLint, TypeScript ✅ Done
2. **App boot & login** (5 min): Launch app, test credentials
3. **Display validation** (10 min): Verify Vietnamese rendering on-screen
4. **Print test** (15 min): Connect printer, test print, verify output
5. **Operations test** (5 min): Toggle status, verify API
6. **Build prep** (5 min): Update version, prepare release

**Total**: Ready for build after manual testing passes

---

## Notes

- **Current Flow**: Image printing (WYSIWYG) is primary
- **Deep Fix**: ESC-POS code page switching is fallback/enhancement
- **Safety**: Both paths have Vietnamese support now
- **Logging**: Console shows which mode used: "[ESC-POS] Using Vietnamese code page"
- **Backward Compat**: ASCII fallback available if printer doesn't support code pages
