"""
Warehouse Inventory Management System
Tracks product stock levels, handles reorder logic, and manages supplier relationships.
"""

from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum


class StockStatus(Enum):
    """Enumeration of possible inventory status levels."""
    IN_STOCK = "in_stock"
    LOW_STOCK = "low_stock"
    OUT_OF_STOCK = "out_of_stock"
    OVERSTOCK = "overstock"


@dataclass
class Product:
    """Represents a product in the inventory system."""
    sku: str
    name: str
    current_quantity: int
    reorder_point: int
    reorder_quantity: int
    max_capacity: int
    supplier_id: str


@dataclass
class SupplierOrder:
    """Represents a purchase order to replenish inventory."""
    order_id: str
    supplier_id: str
    product_sku: str
    quantity: int
    order_date: datetime
    expected_delivery_date: datetime


class InventoryManager:
    """
    Core inventory management system for warehouse operations.
    
    Monitors stock levels, triggers automatic reordering when inventory
    falls below thresholds, and maintains supplier order history.
    """
    
    def __init__(self, lead_time_days: int = 7):
        """
        Initialize the inventory manager.
        
        Args:
            lead_time_days: Expected days between order placement and delivery
        """
        self.products: Dict[str, Product] = {}
        self.pending_orders: List[SupplierOrder] = []
        self.lead_time_days = lead_time_days
        self.order_counter = 0
    
    def register_product(self, product: Product) -> bool:
        """
        Add a new product to the inventory tracking system.
        
        Args:
            product: Product details including SKU and reorder parameters
            
        Returns:
            True if registration successful, False if SKU already exists
        """
        if product.sku in self.products:
            return False
        
        self.products[product.sku] = product
        return True
    
    def update_stock_quantity(
        self,
        sku: str,
        quantity_change: int,
        reason: str
    ) -> Optional[int]:
        """
        Adjust inventory levels for a product (sale, return, or correction).
        
        Args:
            sku: Product identifier
            quantity_change: Positive for additions, negative for removals
            reason: Description of why stock is changing (sale, return, etc)
            
        Returns:
            New quantity after adjustment, or None if product not found
        """
        if sku not in self.products:
            return None
        
        product = self.products[sku]
        new_quantity = max(0, product.current_quantity + quantity_change)
        product.current_quantity = new_quantity
        
        return new_quantity
    
    def check_stock_status(self, sku: str) -> Optional[StockStatus]:
        """
        Determine the current stock health for a product.
        
        Compares current quantity against reorder points and capacity
        to classify inventory status.
        
        Args:
            sku: Product identifier to check
            
        Returns:
            StockStatus enum value, or None if product not found
        """
        if sku not in self.products:
            return None
        
        product = self.products[sku]
        
        if product.current_quantity == 0:
            return StockStatus.OUT_OF_STOCK
        elif product.current_quantity < product.reorder_point:
            return StockStatus.LOW_STOCK
        elif product.current_quantity > product.max_capacity * 0.9:
            return StockStatus.OVERSTOCK
        else:
            return StockStatus.IN_STOCK
    
    def identify_products_needing_reorder(self) -> List[str]:
        """
        Scan inventory to find products that have fallen below reorder thresholds.
        
        Returns:
            List of SKUs that need replenishment orders
        """
        products_to_reorder = []
        
        for sku, product in self.products.items():
            status = self.check_stock_status(sku)
            
            # Check if already has pending order
            has_pending_order = any(
                order.product_sku == sku 
                for order in self.pending_orders
            )
            
            if status in [StockStatus.LOW_STOCK, StockStatus.OUT_OF_STOCK]:
                if not has_pending_order:
                    products_to_reorder.append(sku)
        
        return products_to_reorder
    
    def create_reorder_for_product(
        self,
        sku: str
    ) -> Optional[SupplierOrder]:
        """
        Generate a purchase order to replenish a product's inventory.
        
        Args:
            sku: Product identifier to reorder
            
        Returns:
            Created SupplierOrder object, or None if product not found
        """
        if sku not in self.products:
            return None
        
        product = self.products[sku]
        
        # Generate unique order identifier
        self.order_counter += 1
        order_id = f"PO-{self.order_counter:06d}"
        
        # Calculate delivery date based on lead time
        order_date = datetime.now()
        expected_delivery = order_date + timedelta(days=self.lead_time_days)
        
        # Create order object
        order = SupplierOrder(
            order_id=order_id,
            supplier_id=product.supplier_id,
            product_sku=sku,
            quantity=product.reorder_quantity,
            order_date=order_date,
            expected_delivery_date=expected_delivery
        )
        
        self.pending_orders.append(order)
        return order
    
    def process_automatic_reordering(self) -> List[SupplierOrder]:
        """
        Execute automatic reorder workflow for all products below threshold.
        
        Scans inventory, identifies low stock, and creates purchase orders
        to replenish inventory before stockouts occur.
        
        Returns:
            List of newly created purchase orders
        """
        skus_to_reorder = self.identify_products_needing_reorder()
        created_orders = []
        
        for sku in skus_to_reorder:
            order = self.create_reorder_for_product(sku)
            if order:
                created_orders.append(order)
        
        return created_orders
    
    def receive_supplier_delivery(
        self,
        order_id: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Process incoming shipment and update inventory quantities.
        
        Args:
            order_id: Identifier of the order being delivered
            
        Returns:
            Tuple of (success status, error message if failed)
        """
        # Find the order in pending list
        order = next(
            (o for o in self.pending_orders if o.order_id == order_id),
            None
        )
        
        if not order:
            return False, f"Order {order_id} not found in pending orders"
        
        # Update product quantity
        updated_quantity = self.update_stock_quantity(
            order.product_sku,
            order.quantity,
            f"Supplier delivery: {order_id}"
        )
        
        if updated_quantity is None:
            return False, f"Product {order.product_sku} not found"
        
        # Remove from pending orders
        self.pending_orders.remove(order)
        
        return True, None