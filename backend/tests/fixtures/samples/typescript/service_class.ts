import { Database } from '../db';
import { Logger } from '../logger';
import { Cache } from '../cache';

interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  stock: number;
  createdAt: Date;
}

interface CreateProductInput {
  name: string;
  price: number;
  category: string;
  stock: number;
}

interface UpdateProductInput {
  name?: string;
  price?: number;
  category?: string;
  stock?: number;
}

interface ProductQuery {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page?: number;
  limit?: number;
}

class ProductNotFoundError extends Error {
  constructor(id: string) {
    super(`Product not found: ${id}`);
    this.name = 'ProductNotFoundError';
  }
}

class InvalidPriceError extends Error {
  constructor(price: number) {
    super(`Invalid price: ${price}. Must be positive.`);
    this.name = 'InvalidPriceError';
  }
}

export class ProductService {
  private db: Database;
  private logger: Logger;
  private cache: Cache;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(db: Database, logger: Logger, cache: Cache) {
    this.db = db;
    this.logger = logger;
    this.cache = cache;
  }

  async getById(id: string): Promise<Product> {
    const cached = await this.cache.get<Product>(`product:${id}`);
    if (cached) {
      this.logger.debug(`Cache hit for product ${id}`);
      return cached;
    }

    const product = await this.db.findOne<Product>('products', { id });
    if (!product) {
      throw new ProductNotFoundError(id);
    }

    await this.cache.set(`product:${id}`, product, this.CACHE_TTL);
    return product;
  }

  async search(query: ProductQuery): Promise<{ products: Product[]; total: number }> {
    const filters: Record<string, unknown> = {};

    if (query.category) filters.category = query.category;
    if (query.minPrice !== undefined) filters.price = { $gte: query.minPrice };
    if (query.maxPrice !== undefined) {
      filters.price = { ...(filters.price as object || {}), $lte: query.maxPrice };
    }
    if (query.inStock) filters.stock = { $gt: 0 };

    const page = query.page || 1;
    const limit = query.limit || 20;

    const [products, total] = await Promise.all([
      this.db.find<Product>('products', filters, {
        skip: (page - 1) * limit,
        limit,
        sort: { createdAt: -1 },
      }),
      this.db.count('products', filters),
    ]);

    return { products, total };
  }

  async create(input: CreateProductInput): Promise<Product> {
    if (input.price <= 0) {
      throw new InvalidPriceError(input.price);
    }

    const product: Product = {
      id: crypto.randomUUID(),
      ...input,
      createdAt: new Date(),
    };

    await this.db.insert('products', product);
    this.logger.info(`Product created: ${product.id} - ${product.name}`);
    return product;
  }

  async update(id: string, input: UpdateProductInput): Promise<Product> {
    if (input.price !== undefined && input.price <= 0) {
      throw new InvalidPriceError(input.price);
    }

    const existing = await this.getById(id);
    const updated = { ...existing, ...input };

    await this.db.update('products', { id }, updated);
    await this.cache.delete(`product:${id}`);
    this.logger.info(`Product updated: ${id}`);
    return updated;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.getById(id);
    await this.db.delete('products', { id });
    await this.cache.delete(`product:${id}`);
    this.logger.info(`Product deleted: ${id} - ${existing.name}`);
  }

  async adjustStock(id: string, delta: number): Promise<Product> {
    const product = await this.getById(id);
    const newStock = product.stock + delta;

    if (newStock < 0) {
      throw new Error(`Insufficient stock for ${id}. Current: ${product.stock}, requested: ${delta}`);
    }

    product.stock = newStock;
    await this.db.update('products', { id }, { stock: newStock });
    await this.cache.delete(`product:${id}`);
    return product;
  }

  async getCategories(): Promise<string[]> {
    const cached = await this.cache.get<string[]>('product:categories');
    if (cached) return cached;

    const categories = await this.db.distinct<string>('products', 'category');
    await this.cache.set('product:categories', categories, this.CACHE_TTL);
    return categories;
  }
}
