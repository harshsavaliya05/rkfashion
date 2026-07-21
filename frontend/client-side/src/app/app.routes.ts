import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { Shop } from './components/shop/shop';
import { ShopDetails } from './components/shop-details/shop-details';
import { Cart } from './components/cart/cart';
import { Checkout } from './components/checkout/checkout';
import { Blog } from './components/blog/blog';
import { BlogDetails } from './components/blog-details/blog-details';
import { Contact } from './components/contact/contact';
import { About } from './components/about/about';
import { Wishlist } from './components/wishlist/wishlist';
import { Login } from './components/login/login';
import { Faqs } from './components/faqs/faqs';
import { Policies } from './components/policies/policies';
import { authGuard } from './guards/auth.guard';
import { Account } from './components/account/account';
import { AccountOverview } from './components/account/overview';
import { EditProfile } from './components/account/edit-profile';
import { MyOrders } from './components/account/orders';
import { MyAddresses } from './components/account/addresses';
import { ChangePassword } from './components/account/change-password';
import { OrderSuccess } from './components/order-success/order-success';
import { ResetPassword } from './components/reset-password/reset-password';
import { VerifyEmail } from './components/verify-email/verify-email';
import { OrderReturnExchange } from './components/order-return-exchange/order-return-exchange';
import { OrderTracking } from './components/order-tracking/order-tracking';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'shop', component: Shop },
  { path: 'shop-details/:id', component: ShopDetails },
  { path: 'cart', component: Cart, canActivate: [authGuard] },
  { path: 'checkout', component: Checkout, canActivate: [authGuard] },
  { path: 'order-success', component: OrderSuccess, canActivate: [authGuard] },
  { path: 'order-return-exchange', component: OrderReturnExchange, canActivate: [authGuard] },
  { path: 'track-order', component: OrderTracking, canActivate: [authGuard] },
  { path: 'blog', component: Blog },
  { path: 'blog-details/:id', component: BlogDetails },
  { path: 'contact', component: Contact },
  { path: 'about', component: About },
  { path: 'wishlist', component: Wishlist, canActivate: [authGuard] },
  { path: 'login', component: Login },
  { path: 'register', component: Login },
  { path: 'faqs', component: Faqs },
  { path: 'policies', component: Policies },
  { path: 'reset-password', component: ResetPassword },
  { path: 'verify-email', component: VerifyEmail },
  {
    path: 'account',
    component: Account,
    canActivate: [authGuard],
    children: [
      { path: '', component: AccountOverview },
      { path: 'edit-profile', component: EditProfile },
      { path: 'orders', component: MyOrders },
      { path: 'addresses', component: MyAddresses },
      { path: 'change-password', component: ChangePassword }
    ]
  },
  { path: '**', redirectTo: '' }
];
