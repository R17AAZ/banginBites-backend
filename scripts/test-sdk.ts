import { BanginBitesAPI, StorageProvider } from '../src/sdk'

// A simple in-memory storage provider for testing
class MemoryStorage implements StorageProvider {
  private store: Record<string, string> = {}

  getItem(key: string) {
    return this.store[key] || null
  }

  setItem(key: string, value: string) {
    this.store[key] = value
  }

  removeItem(key: string) {
    delete this.store[key]
  }
}

async function run() {
  console.log('🚀 Initializing BanginBites SDK...')
  const api = new BanginBitesAPI({
    baseURL: 'http://localhost:5000/api/v1',
    storage: new MemoryStorage(),
    onUnauthorized: () => console.log('⚠️ Session expired. Please login again.'),
  })

  try {
    // 1. Check Public Menu (Categories)
    console.log('\n📂 Fetching Categories...')
    const categories = await api.marketplace.getCategories()
    console.log(`Found ${categories.length} categories.`)

    // 2. Fetch Dishes
    console.log('\n🍕 Fetching Dishes...')
    const response = await api.marketplace.getDishes()
    console.log(`Found ${Array.isArray(response) ? response.length : (response as any).data?.length || 0} dishes.`)

    // 3. Login Attempt (This will fail if credentials don't match, but demonstrates the typed response)
    console.log('\n🔐 Attempting to login...')
    try {
      const loginRes = await api.auth.login({
        email: 'seller_test@example.com',
        password: 'wrongpassword'
      })
      console.log('Login successful!', loginRes.user.name)
    } catch (e: any) {
      console.log('Login failed as expected during test:', e.message)
    }

  } catch (error: any) {
    console.error('❌ SDK Error:', error.message)
  }
}

run()
