import { Routes } from '@angular/router';
import { LayoutComponent } from './components/layout/layout';
import { DashboardComponent } from './components/dashboard/dashboard';
import { ProductsComponent } from './components/products/products';
import { OrdersComponent } from './components/orders/orders';
import { UsersComponent } from './components/users/users';
import { ProductFormComponent } from './components/product-form/product-form';
import { DraftsComponent } from './components/drafts/drafts';
import { CouponsComponent } from './components/coupons/coupons';
import { ReviewsComponent } from './components/reviews/reviews';
import { BannersComponent } from './components/banners/banners';
import { BlogsComponent } from './components/blogs/blogs';
import { MessagesComponent } from './components/messages/messages';
import { ReportsComponent } from './components/reports/reports';
import { SettingsComponent } from './components/settings/settings';
import { ProfileComponent } from './components/profile/profile';
import { CampaignsComponent } from './components/campaigns/campaigns';
import { LoginComponent } from './components/login/login';
import { AuthGuard } from './guards/auth.guard';
import { CategoriesComponent } from './components/categories/categories';


export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'products', component: ProductsComponent },
      { path: 'products/add', component: ProductFormComponent },
      { path: 'products/edit/:id', component: ProductFormComponent },
      { path: 'orders', component: OrdersComponent },
      { path: 'users', component: UsersComponent },
      { path: 'drafts', component: DraftsComponent },
      { path: 'coupons', component: CouponsComponent },
      { path: 'reviews', component: ReviewsComponent },
      { path: 'banners', component: BannersComponent },
      { path: 'blogs', component: BlogsComponent },
      { path: 'messages', component: MessagesComponent },
      { path: 'reports', component: ReportsComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'campaigns', component: CampaignsComponent },
      { path: 'categories', component: CategoriesComponent },
    ]
  },

  { path: '**', redirectTo: '' }
];

