"""
Email Marketing Campaign Manager
Handles subscriber lists, campaign scheduling, and delivery tracking.
"""

from typing import List, Dict, Set, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum


class CampaignStatus(Enum):
    """Possible states for an email campaign."""

    DRAFT = "draft"
    SCHEDULED = "scheduled"
    SENDING = "sending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class SubscriberStatus(Enum):
    """Subscription status for email recipients."""

    ACTIVE = "active"
    UNSUBSCRIBED = "unsubscribed"
    BOUNCED = "bounced"


@dataclass
class Subscriber:
    """Represents an email list subscriber."""

    email: str
    first_name: str
    last_name: str
    status: SubscriberStatus
    subscribed_date: datetime
    tags: Set[str]


@dataclass
class Campaign:
    """Represents an email marketing campaign."""

    campaign_id: str
    subject_line: str
    html_content: str
    status: CampaignStatus
    scheduled_send_time: Optional[datetime]
    target_tags: Set[str]
    sent_count: int = 0
    opened_count: int = 0
    clicked_count: int = 0


class EmailCampaignManager:
    """
    Marketing automation system for email campaign management.

    Manages subscriber lists, schedules campaigns, tracks delivery metrics,
    and handles subscriber preferences and segmentation.
    """

    def __init__(self):
        """Initialize the email campaign manager with empty lists."""
        self.subscribers: Dict[str, Subscriber] = {}
        self.campaigns: Dict[str, Campaign] = {}
        self.campaign_counter = 0

    def add_subscriber_to_list(
        self,
        email: str,
        first_name: str,
        last_name: str,
        tags: Optional[Set[str]] = None,
    ) -> bool:
        """
        Register a new subscriber to the email list.

        Args:
            email: Subscriber's email address (used as unique identifier)
            first_name: Subscriber's first name
            last_name: Subscriber's last name
            tags: Optional set of segment tags for targeting

        Returns:
            True if subscriber added, False if email already exists
        """
        if email in self.subscribers:
            return False

        subscriber = Subscriber(
            email=email,
            first_name=first_name,
            last_name=last_name,
            status=SubscriberStatus.ACTIVE,
            subscribed_date=datetime.now(),
            tags=tags or set(),
        )

        self.subscribers[email] = subscriber
        return True

    def update_subscriber_tags(
        self,
        email: str,
        tags_to_add: Optional[Set[str]] = None,
        tags_to_remove: Optional[Set[str]] = None,
    ) -> bool:
        """
        Modify the segment tags associated with a subscriber.

        Args:
            email: Subscriber's email address
            tags_to_add: Tags to append to subscriber's profile
            tags_to_remove: Tags to remove from subscriber's profile

        Returns:
            True if update successful, False if subscriber not found
        """
        if email not in self.subscribers:
            return False

        subscriber = self.subscribers[email]

        if tags_to_add:
            subscriber.tags.update(tags_to_add)

        if tags_to_remove:
            subscriber.tags.difference_update(tags_to_remove)

        return True

    def unsubscribe_email_address(self, email: str) -> bool:
        """
        Mark a subscriber as unsubscribed (GDPR compliant opt-out).

        Args:
            email: Email address to unsubscribe

        Returns:
            True if unsubscribe successful, False if not found
        """
        if email not in self.subscribers:
            return False

        self.subscribers[email].status = SubscriberStatus.UNSUBSCRIBED
        return True

    def filter_subscribers_by_tags(self, required_tags: Set[str]) -> List[Subscriber]:
        """
        Find all active subscribers matching specific segment tags.

        Args:
            required_tags: Tags that subscribers must have

        Returns:
            List of subscribers who match ALL required tags
        """
        matching_subscribers = []

        for subscriber in self.subscribers.values():
            # Only include active subscribers
            if subscriber.status != SubscriberStatus.ACTIVE:
                continue

            # Check if subscriber has all required tags
            if required_tags.issubset(subscriber.tags):
                matching_subscribers.append(subscriber)

        return matching_subscribers

    def create_email_campaign(
        self,
        subject_line: str,
        html_content: str,
        target_tags: Set[str],
        scheduled_time: Optional[datetime] = None,
    ) -> Campaign:
        """
        Set up a new email campaign with targeting and scheduling.

        Args:
            subject_line: Email subject line text
            html_content: HTML body of the email
            target_tags: Segment tags to target
            scheduled_time: When to send (None = immediate)

        Returns:
            Created campaign object with unique identifier
        """
        self.campaign_counter += 1
        campaign_id = f"CAMP-{self.campaign_counter:05d}"

        # Determine initial status based on scheduling
        if scheduled_time and scheduled_time > datetime.now():
            status = CampaignStatus.SCHEDULED
        else:
            status = CampaignStatus.DRAFT

        campaign = Campaign(
            campaign_id=campaign_id,
            subject_line=subject_line,
            html_content=html_content,
            status=status,
            scheduled_send_time=scheduled_time,
            target_tags=target_tags,
        )

        self.campaigns[campaign_id] = campaign
        return campaign

    def calculate_campaign_delivery_list(self, campaign_id: str) -> List[str]:
        """
        Determine which subscribers should receive a campaign.

        Filters subscribers based on campaign targeting tags and
        subscription status to build the final recipient list.

        Args:
            campaign_id: Identifier of the campaign to calculate for

        Returns:
            List of email addresses to receive the campaign
        """
        if campaign_id not in self.campaigns:
            return []

        campaign = self.campaigns[campaign_id]

        # Get matching subscribers
        targeted_subscribers = self.filter_subscribers_by_tags(campaign.target_tags)

        # Extract email addresses
        recipient_emails = [subscriber.email for subscriber in targeted_subscribers]

        return recipient_emails

    def execute_campaign_delivery(self, campaign_id: str) -> Dict[str, any]:
        """
        Send a campaign to all targeted recipients and track metrics.

        Args:
            campaign_id: Campaign to send

        Returns:
            Dictionary containing delivery statistics and status
        """
        if campaign_id not in self.campaigns:
            return {"success": False, "error": "Campaign not found"}

        campaign = self.campaigns[campaign_id]
        recipient_list = self.calculate_campaign_delivery_list(campaign_id)

        # Update campaign status
        campaign.status = CampaignStatus.SENDING
        campaign.sent_count = len(recipient_list)

        # Mark as completed
        campaign.status = CampaignStatus.COMPLETED

        return {
            "success": True,
            "campaign_id": campaign_id,
            "recipients": len(recipient_list),
            "sent_at": datetime.now(),
        }
