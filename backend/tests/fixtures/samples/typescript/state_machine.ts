export enum OrderStatus {
  DRAFT = 'DRAFT',
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

interface OrderEvent {
  type: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

interface OrderTransition {
  from: OrderStatus[];
  to: OrderStatus;
  guard?: (context: OrderContext) => boolean;
  action?: (context: OrderContext) => void;
}

interface OrderContext {
  orderId: string;
  status: OrderStatus;
  total: number;
  paidAmount: number;
  items: Array<{ productId: string; quantity: number; price: number }>;
  history: OrderEvent[];
  shippingAddress?: string;
  trackingNumber?: string;
}

const TRANSITIONS: Record<string, OrderTransition> = {
  SUBMIT: {
    from: [OrderStatus.DRAFT],
    to: OrderStatus.PENDING_PAYMENT,
    guard: (ctx) => ctx.items.length > 0 && ctx.total > 0,
    action: (ctx) => {
      ctx.history.push({
        type: 'SUBMITTED',
        timestamp: new Date(),
        data: { total: ctx.total },
      });
    },
  },
  PAY: {
    from: [OrderStatus.PENDING_PAYMENT],
    to: OrderStatus.PAID,
    guard: (ctx) => ctx.paidAmount >= ctx.total,
    action: (ctx) => {
      ctx.history.push({
        type: 'PAYMENT_RECEIVED',
        timestamp: new Date(),
        data: { amount: ctx.paidAmount },
      });
    },
  },
  START_PROCESSING: {
    from: [OrderStatus.PAID],
    to: OrderStatus.PROCESSING,
  },
  SHIP: {
    from: [OrderStatus.PROCESSING],
    to: OrderStatus.SHIPPED,
    guard: (ctx) => !!ctx.trackingNumber,
    action: (ctx) => {
      ctx.history.push({
        type: 'SHIPPED',
        timestamp: new Date(),
        data: { trackingNumber: ctx.trackingNumber },
      });
    },
  },
  DELIVER: {
    from: [OrderStatus.SHIPPED],
    to: OrderStatus.DELIVERED,
  },
  CANCEL: {
    from: [
      OrderStatus.DRAFT,
      OrderStatus.PENDING_PAYMENT,
      OrderStatus.PAID,
    ],
    to: OrderStatus.CANCELLED,
    action: (ctx) => {
      ctx.history.push({
        type: 'CANCELLED',
        timestamp: new Date(),
      });
    },
  },
  REFUND: {
    from: [OrderStatus.PAID, OrderStatus.DELIVERED],
    to: OrderStatus.REFUNDED,
    guard: (ctx) => ctx.paidAmount > 0,
  },
};

export class OrderStateMachine {
  private context: OrderContext;

  constructor(orderId: string) {
    this.context = {
      orderId,
      status: OrderStatus.DRAFT,
      total: 0,
      paidAmount: 0,
      items: [],
      history: [],
    };
  }

  getStatus(): OrderStatus {
    return this.context.status;
  }

  getContext(): Readonly<OrderContext> {
    return { ...this.context };
  }

  addItem(productId: string, quantity: number, price: number): void {
    if (this.context.status !== OrderStatus.DRAFT) {
      throw new Error('Cannot modify items after submission');
    }
    this.context.items.push({ productId, quantity, price });
    this.context.total = this.context.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  setPayment(amount: number): void {
    this.context.paidAmount = amount;
  }

  setShippingAddress(address: string): void {
    this.context.shippingAddress = address;
  }

  setTrackingNumber(tracking: string): void {
    this.context.trackingNumber = tracking;
  }

  transition(eventName: string): OrderStatus {
    const transition = TRANSITIONS[eventName];
    if (!transition) {
      throw new Error(`Unknown event: ${eventName}`);
    }

    if (!transition.from.includes(this.context.status)) {
      throw new Error(
        `Cannot ${eventName} from ${this.context.status}. ` +
        `Allowed from: ${transition.from.join(', ')}`
      );
    }

    if (transition.guard && !transition.guard(this.context)) {
      throw new Error(
        `Guard failed for ${eventName} in state ${this.context.status}`
      );
    }

    transition.action?.(this.context);
    this.context.status = transition.to;
    return this.context.status;
  }

  getAvailableTransitions(): string[] {
    return Object.entries(TRANSITIONS)
      .filter(([_, t]) => t.from.includes(this.context.status))
      .map(([name]) => name);
  }

  getHistory(): ReadonlyArray<OrderEvent> {
    return [...this.context.history];
  }
}
