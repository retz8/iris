export { UserService } from './services/userService';
export { ProductService } from './services/productService';
export { OrderService } from './services/orderService';
export { AuthService } from './services/authService';

export type { User, UserProfile } from './models/user';
export type { Product, ProductQuery } from './models/product';
export type { Order, OrderStatus } from './models/order';
export type { AuthToken, LoginRequest } from './models/auth';

export { createApp } from './app';
export { connectDatabase } from './db';
export { createLogger } from './logger';
export { config } from './config';
