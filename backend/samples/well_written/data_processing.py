"""
Data Processing Pipeline for Customer Analytics
Processes raw customer transaction data and generates aggregated insights.
"""

from typing import List, Dict, Optional
from datetime import datetime, timedelta
from dataclasses import dataclass
import statistics


@dataclass
class Transaction:
    """Represents a single customer transaction."""
    transaction_id: str
    customer_id: str
    amount: float
    timestamp: datetime
    category: str


class CustomerSegmentAnalyzer:
    """
    Analyzes customer transactions to identify spending patterns and segments.
    
    This analyzer processes transaction histories and categorizes customers
    into behavioral segments based on their spending patterns, frequency,
    and recency of purchases.
    """
    
    def __init__(self, lookback_days: int = 90):
        """
        Initialize the customer segment analyzer.
        
        Args:
            lookback_days: Number of days to analyze for recency calculations
        """
        self.lookback_days = lookback_days
        self.segment_thresholds = {
            'high_value': 1000.0,
            'medium_value': 500.0,
            'frequent_buyer': 10
        }
    
    def calculate_customer_lifetime_value(
        self,
        transactions: List[Transaction],
        customer_id: str
    ) -> float:
        """
        Calculate the total lifetime value for a specific customer.
        
        Sums all transaction amounts for the given customer to determine
        their total contribution to revenue.
        
        Args:
            transactions: List of all transactions to analyze
            customer_id: Unique identifier for the target customer
            
        Returns:
            Total amount spent by the customer across all transactions
        """
        customer_transactions = [
            t for t in transactions 
            if t.customer_id == customer_id
        ]
        
        return sum(t.amount for t in customer_transactions)
    
    def calculate_purchase_frequency(
        self,
        transactions: List[Transaction],
        customer_id: str
    ) -> int:
        """
        Count the number of purchases made by a customer.
        
        Args:
            transactions: List of all transactions to analyze
            customer_id: Unique identifier for the target customer
            
        Returns:
            Total number of transactions for this customer
        """
        return len([
            t for t in transactions 
            if t.customer_id == customer_id
        ])
    
    def calculate_days_since_last_purchase(
        self,
        transactions: List[Transaction],
        customer_id: str,
        reference_date: Optional[datetime] = None
    ) -> int:
        """
        Calculate recency metric: days since customer's last purchase.
        
        Args:
            transactions: List of all transactions to analyze
            customer_id: Unique identifier for the target customer
            reference_date: Date to calculate from (defaults to now)
            
        Returns:
            Number of days since the most recent transaction
        """
        if reference_date is None:
            reference_date = datetime.now()
        
        customer_transactions = [
            t for t in transactions 
            if t.customer_id == customer_id
        ]
        
        if not customer_transactions:
            return 999999  # Large number for customers with no purchases
        
        most_recent = max(
            customer_transactions,
            key=lambda t: t.timestamp
        )
        
        days_since = (reference_date - most_recent.timestamp).days
        return max(0, days_since)
    
    def classify_customer_segment(
        self,
        lifetime_value: float,
        purchase_frequency: int,
        days_since_last_purchase: int
    ) -> str:
        """
        Assign a customer to a behavioral segment based on RFM metrics.
        
        Uses Recency, Frequency, and Monetary value to determine which
        segment best describes the customer's relationship with the business.
        
        Args:
            lifetime_value: Total amount spent by customer
            purchase_frequency: Number of purchases made
            days_since_last_purchase: Days since most recent transaction
            
        Returns:
            Segment label: 'champion', 'loyal', 'at_risk', or 'lost'
        """
        is_recent = days_since_last_purchase <= self.lookback_days
        is_high_value = lifetime_value >= self.segment_thresholds['high_value']
        is_frequent = purchase_frequency >= self.segment_thresholds['frequent_buyer']
        
        if is_recent and is_high_value and is_frequent:
            return 'champion'
        elif is_recent and is_frequent:
            return 'loyal'
        elif not is_recent and is_high_value:
            return 'at_risk'
        else:
            return 'lost'
    
    def generate_segment_report(
        self,
        transactions: List[Transaction]
    ) -> Dict[str, List[str]]:
        """
        Generate a complete segmentation report for all customers.
        
        Processes the entire transaction dataset and groups customers
        into segments for marketing campaign targeting.
        
        Args:
            transactions: Complete list of transactions to analyze
            
        Returns:
            Dictionary mapping segment names to lists of customer IDs
        """
        # Extract unique customer identifiers
        unique_customers = set(t.customer_id for t in transactions)
        
        # Initialize segment buckets
        segments: Dict[str, List[str]] = {
            'champion': [],
            'loyal': [],
            'at_risk': [],
            'lost': []
        }
        
        # Classify each customer
        for customer_id in unique_customers:
            ltv = self.calculate_customer_lifetime_value(transactions, customer_id)
            frequency = self.calculate_purchase_frequency(transactions, customer_id)
            recency = self.calculate_days_since_last_purchase(transactions, customer_id)
            
            segment = self.classify_customer_segment(ltv, frequency, recency)
            segments[segment].append(customer_id)
        
        return segments