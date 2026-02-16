"""ETL pipeline for processing CSV transaction records."""

import csv
import json
import logging
import os
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Iterator

logger = logging.getLogger(__name__)


@dataclass
class Transaction:
    id: str
    timestamp: datetime
    amount: float
    currency: str
    merchant: str
    category: str
    status: str


@dataclass
class AggregatedReport:
    period: str
    total_amount: float
    transaction_count: int
    by_category: dict = field(default_factory=dict)
    by_currency: dict = field(default_factory=dict)
    by_status: dict = field(default_factory=dict)


class CSVReader:
    """Read and parse transaction CSV files."""

    def __init__(self, filepath: str):
        self.filepath = Path(filepath)
        if not self.filepath.exists():
            raise FileNotFoundError(f"Input file not found: {filepath}")

    def read_transactions(self) -> Iterator[Transaction]:
        with open(self.filepath, newline="") as f:
            reader = csv.DictReader(f)
            for row in reader:
                yield Transaction(
                    id=row["id"],
                    timestamp=datetime.fromisoformat(row["timestamp"]),
                    amount=float(row["amount"]),
                    currency=row["currency"],
                    merchant=row["merchant"],
                    category=row["category"],
                    status=row["status"],
                )

    def count_lines(self) -> int:
        with open(self.filepath) as f:
            return sum(1 for _ in f) - 1


class TransactionFilter:
    """Apply filters to transaction streams."""

    def __init__(self, min_amount=None, max_amount=None,
                 currencies=None, statuses=None, categories=None):
        self.min_amount = min_amount
        self.max_amount = max_amount
        self.currencies = set(currencies) if currencies else None
        self.statuses = set(statuses) if statuses else None
        self.categories = set(categories) if categories else None

    def apply(self, transactions: Iterator[Transaction]) -> Iterator[Transaction]:
        for txn in transactions:
            if self.min_amount and txn.amount < self.min_amount:
                continue
            if self.max_amount and txn.amount > self.max_amount:
                continue
            if self.currencies and txn.currency not in self.currencies:
                continue
            if self.statuses and txn.status not in self.statuses:
                continue
            if self.categories and txn.category not in self.categories:
                continue
            yield txn


class TransactionAggregator:
    """Aggregate transactions into summary reports."""

    def aggregate(self, transactions: Iterator[Transaction],
                  period: str = "daily") -> AggregatedReport:
        total = 0.0
        count = 0
        by_category = defaultdict(float)
        by_currency = defaultdict(float)
        by_status = defaultdict(int)

        for txn in transactions:
            total += txn.amount
            count += 1
            by_category[txn.category] += txn.amount
            by_currency[txn.currency] += txn.amount
            by_status[txn.status] += 1

        return AggregatedReport(
            period=period,
            total_amount=round(total, 2),
            transaction_count=count,
            by_category=dict(by_category),
            by_currency=dict(by_currency),
            by_status=dict(by_status),
        )


class ReportWriter:
    """Write aggregated reports to various formats."""

    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

    def write_json(self, report: AggregatedReport,
                   filename: str = "report.json") -> Path:
        path = self.output_dir / filename
        data = {
            "period": report.period,
            "total_amount": report.total_amount,
            "transaction_count": report.transaction_count,
            "by_category": report.by_category,
            "by_currency": report.by_currency,
            "by_status": report.by_status,
        }
        with open(path, "w") as f:
            json.dump(data, f, indent=2)
        logger.info(f"Report written to {path}")
        return path

    def write_summary(self, report: AggregatedReport,
                      filename: str = "summary.txt") -> Path:
        path = self.output_dir / filename
        lines = [
            f"Period: {report.period}",
            f"Total: {report.total_amount}",
            f"Count: {report.transaction_count}",
            "",
            "By Category:",
        ]
        for cat, amt in sorted(report.by_category.items()):
            lines.append(f"  {cat}: {amt:.2f}")
        with open(path, "w") as f:
            f.write("\n".join(lines))
        return path


class Pipeline:
    """Orchestrate the full ETL pipeline."""

    def __init__(self, input_path: str, output_dir: str,
                 filter_config: dict = None):
        self.reader = CSVReader(input_path)
        self.filter = TransactionFilter(**(filter_config or {}))
        self.aggregator = TransactionAggregator()
        self.writer = ReportWriter(output_dir)

    def run(self, period: str = "daily") -> AggregatedReport:
        logger.info(f"Starting pipeline for {self.reader.filepath}")
        transactions = self.reader.read_transactions()
        filtered = self.filter.apply(transactions)
        report = self.aggregator.aggregate(filtered, period)
        self.writer.write_json(report)
        self.writer.write_summary(report)
        logger.info(f"Pipeline complete: {report.transaction_count} txns")
        return report


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Transaction ETL")
    parser.add_argument("input", help="Path to CSV file")
    parser.add_argument("--output", default="./output", help="Output dir")
    parser.add_argument("--min-amount", type=float, help="Min amount")
    parser.add_argument("--period", default="daily", help="Report period")

    args = parser.parse_args()
    config = {}
    if args.min_amount:
        config["min_amount"] = args.min_amount

    pipeline = Pipeline(args.input, args.output, config)
    result = pipeline.run(args.period)
    print(f"Processed {result.transaction_count} transactions")
    print(f"Total: {result.total_amount}")
