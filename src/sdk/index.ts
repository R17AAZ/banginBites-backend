import { FetchClient, FetchClientOptions } from './core/FetchClient'
import { AuthModule } from './modules/auth'
import { MarketplaceModule } from './modules/marketplace'
import { ReviewModule } from './modules/review'
import { AnalyticsModule } from './modules/analytics'
import { UserModule } from './modules/user'
import { PaymentModule } from './modules/payment'
import { NotificationsModule } from './modules/notifications'
import { PublicModule } from './modules/public'

export * from './types'
export { StorageProvider } from './core/StorageProvider'
export { ApiError } from './types'

export class BanginBitesAPI {
  private client: FetchClient
  
  public auth: AuthModule
  public user: UserModule
  public marketplace: MarketplaceModule
  public review: ReviewModule
  public analytics: AnalyticsModule
  public payment: PaymentModule
  public notifications: NotificationsModule
  public public: PublicModule

  constructor(options: FetchClientOptions) {
    this.client = new FetchClient(options)
    
    this.auth = new AuthModule(this.client)
    this.user = new UserModule(this.client)
    this.marketplace = new MarketplaceModule(this.client)
    this.review = new ReviewModule(this.client)
    this.analytics = new AnalyticsModule(this.client)
    this.payment = new PaymentModule(this.client)
    this.notifications = new NotificationsModule(this.client)
    this.public = new PublicModule(this.client)
  }
}
