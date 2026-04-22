# Bangin' Bites SDK Documentation

The **Bangin' Bites SDK** is a zero-dependency, strongly-typed TypeScript client designed to unify backend communication across Web (Next.js/React) and Mobile (React Native) platforms.

## 🌟 For Frontend Teams (Consumers)

### 1. Initialization & Storage
The SDK requires a `StorageProvider` during initialization. This makes the SDK entirely cross-platform.

**For Web (React/Next.js):**
```typescript
import { BanginBitesAPI, StorageProvider } from 'src/sdk'

class WebStorage implements StorageProvider {
  getItem(key: string) { return localStorage.getItem(key) }
  setItem(key: string, val: string) { localStorage.setItem(key, val) }
  removeItem(key: string) { localStorage.removeItem(key) }
}

export const api = new BanginBitesAPI({
  baseURL: 'https://api.yourdomain.com/api/v1',
  storage: new WebStorage()
})
```

**For Mobile (React Native):**
```typescript
import * as SecureStore from 'expo-secure-store';
class MobileStorage implements StorageProvider {
  async getItem(key: string) { return await SecureStore.getItemAsync(key) }
  async setItem(key: string, val: string) { await SecureStore.setItemAsync(key, val) }
  async removeItem(key: string) { await SecureStore.deleteItemAsync(key) }
}
// Initialize `api` exactly like Web above.
```

**For Desktop (Electron):**
You can use the built-in `localStorage` in the renderer process, or an IPC bridge to `electron-store` if managing securely in the main process.
```typescript
import Store from 'electron-store'; // Main process
const store = new Store();

class DesktopStorage implements StorageProvider {
  getItem(key: string) { return store.get(key) as string }
  setItem(key: string, val: string) { store.set(key, val) }
  removeItem(key: string) { store.delete(key) }
}
// Initialize `api` exactly like Web above.
```

### 2. Basic Usage (State Management Agnostic)
The SDK returns promises, making it fully compatible with raw React, Zustand, or TanStack Query.

**TanStack Query Example:**
```typescript
import { useQuery } from '@tanstack/react-query';
import { api } from '../setup/api';

export const useMenu = () => {
  return useQuery({
    queryKey: ['dishes'],
    // 100% Typed: This returns `Dish[]` automatically!
    queryFn: () => api.marketplace.getDishes() 
  });
};
```

### 3. Error Handling
The SDK automatically intercepts HTTP errors (like 401 Unauthorized or 400 Bad Request) and throws a structured `ApiError`.

```typescript
try {
  await api.auth.login({ email, password });
} catch (error) {
  if (error instanceof ApiError) {
    // Renders: "The email or password you entered is incorrect"
    toast.error(error.message); 
  }
}
```

### 4. Pagination & Filtering
The SDK supports dynamic query parameters for searching, filtering, and pagination. Many "List" endpoints accept an optional `params` object which is automatically stringified into a URL query.

```typescript
// Fetching page 2 of dishes, with a limit of 10, filtered by a search term
const response = await api.marketplace.getDishes({
  page: 2,
  limit: 10,
  searchTerm: 'pizza',
  minPrice: 10
});

// The SDK returns the structured data including pagination metadata
console.log(response.data); // Dish[]
console.log(response.meta.total); // Total items available
console.log(response.meta.totalPages);
```

---

## 🛠️ For Backend Teams (Maintainers)

The SDK lives alongside the backend in `src/sdk`. If you update the backend API, **you must update the SDK** so the frontend teams do not break.

### 1. Adding a New Method
If you expose a new API endpoint (e.g., `GET /user/favorites`), follow these steps:

1. **Update Types**: Go to `src/sdk/types/index.ts` and define the response interface.
2. **Add Method**: Open `src/sdk/modules/user.ts` and add the fetch wrapper:
```typescript
  async getFavorites(): Promise<Dish[]> {
    return this.client.get<Dish[]>('/user/favorites')
  }
```

### 2. Creating a New Module
If you build a completely new feature (e.g., `wallet`), you must:
1. Create `src/sdk/modules/wallet.ts`.
2. Export `class WalletModule { ... }` injecting `FetchClient`.
3. Open `src/sdk/index.ts`.
4. Import the module and initialize it inside the `BanginBitesAPI` constructor.

### 3. Golden Rules
- **NO Third-Party Dependencies!** Do not install Axios, Lodash, or anything else inside `src/sdk`. It must use native Javascript and `fetch` so it doesn't bloat the frontend applications.
- **Maintain Interfaces!** If you alter a Prisma Database schema, be sure to update the matching interface inside `src/sdk/types/index.ts`.
