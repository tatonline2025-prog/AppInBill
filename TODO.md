# TODO - Fix: Checkbox lọc hóa đơn đã đóng cước không hiện ra

## Vấn đề:
Khi bấm checkbox lọc hóa đơn đã đóng cước nhưng không hiện ra dữ liệu.

## Nguyên nhân có thể:
File `app/(tabs)/uncollected.tsx` chưa được cập nhật để sử dụng `handleTogglePaidFilter` từ hook.

## Giải pháp:

### Bước 1: Kiểm tra file `app/(tabs)/uncollected.tsx`

Đảm bảo file này:
1. Import hook `useUncollectedSearch`
2. Sử dụng các props mới từ hook:
   - `showPaidFilter`
   - `handleTogglePaidFilter`
   - `isAdmin`

3. Truyền props cho `SearchInput`:
```tsx
<SearchInput
  customerCode={customerCode}
  onChange={handleChange}
  onSearch={() => handleSearch()}
  suggestions={suggestions}
  onSelect={handleSelectSuggestion}
  searchType={searchType}
  onChangeSearchType={setSearchType}
  showPaidFilter={showPaidFilter}
  onTogglePaidFilter={handleTogglePaidFilter}
  isAdmin={isAdmin}
/>
```

### Bước 2: Kiểm tra API response

Khi gọi API, đảm bảo:
- Admin: `GET /api/invoices/search?collectionStatus=not_collected&isPaid=true` (KHÔNG truyền assignedUserId)
- User: `GET /api/invoices/search?collectionStatus=not_collected&isPaid=true&assignedUserId=USER_ID`

### Bước 3: Debug

Thêm console.log để kiểm tra:
```typescript
// Trong fetchAllPaidInvoices
console.log("Gọi API với:", {
  assignedUserId: isAdmin ? undefined : user?._id,
  userprovince: user?.province,
  isPaid: "true"
});
```

---

## Các file đã cập nhật:
1. ✅ `api/invoice.api.ts` - Thêm API `fetchAllPaidInvoices_API`
2. ✅ `hooks/uncollected/useUncollectedSearch.ts` - Thêm logic `handleTogglePaidFilter`
3. ✅ `components/uncollected/SearchInput.tsx` - Thêm checkbox UI
4. ⏳ `app/(tabs)/uncollected.tsx` - Cần kiểm tra và cập nhật
