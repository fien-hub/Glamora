/**
 * Analytics Service
 * Tracks user engagement and behavior for business intelligence
 */

import { supabase } from './supabase';

export interface AnalyticsEvent {
  event_type: string;
  user_id?: string;
  properties?: Record<string, any>;
  timestamp?: string;
}

class AnalyticsService {
  private queue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly FLUSH_INTERVAL_MS = 10000; // 10 seconds
  private readonly MAX_QUEUE_SIZE = 50;

  constructor() {
    this.startFlushInterval();
  }

  /**
   * Track a custom event
   */
  async track(eventType: string, properties?: Record<string, any>, userId?: string) {
    const event: AnalyticsEvent = {
      event_type: eventType,
      user_id: userId,
      properties: properties || {},
      timestamp: new Date().toISOString(),
    };

    this.queue.push(event);

    // Flush if queue is full
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      await this.flush();
    }
  }

  /**
   * Track feed view
   */
  async trackFeedView(userId?: string, category?: string, location?: { lat: number; lon: number }) {
    await this.track('feed_view', {
      category,
      location,
    }, userId);
  }

  /**
   * Track post view
   */
  async trackPostView(postId: string, providerId: string, userId?: string) {
    await this.track('post_view', {
      post_id: postId,
      provider_id: providerId,
    }, userId);
  }

  /**
   * Track like action
   */
  async trackLike(postId: string, providerId: string, userId?: string) {
    await this.track('post_like', {
      post_id: postId,
      provider_id: providerId,
    }, userId);
  }

  /**
   * Track unlike action
   */
  async trackUnlike(postId: string, providerId: string, userId?: string) {
    await this.track('post_unlike', {
      post_id: postId,
      provider_id: providerId,
    }, userId);
  }

  /**
   * Track save action
   */
  async trackSave(postId: string, providerId: string, userId?: string) {
    await this.track('post_save', {
      post_id: postId,
      provider_id: providerId,
    }, userId);
  }

  /**
   * Track unsave action
   */
  async trackUnsave(postId: string, providerId: string, userId?: string) {
    await this.track('post_unsave', {
      post_id: postId,
      provider_id: providerId,
    }, userId);
  }

  /**
   * Track category filter
   */
  async trackCategoryFilter(category: string, userId?: string) {
    await this.track('category_filter', {
      category,
    }, userId);
  }

  /**
   * Track location search
   */
  async trackLocationSearch(location: string, userId?: string) {
    await this.track('location_search', {
      location,
    }, userId);
  }

  /**
   * Track booking initiation
   */
  async trackBookingStart(postId: string, providerId: string, userId?: string) {
    await this.track('booking_start', {
      post_id: postId,
      provider_id: providerId,
    }, userId);
  }

  /**
   * Flush events to database
   */
  private async flush() {
    if (this.queue.length === 0) return;

    const eventsToFlush = [...this.queue];
    this.queue = [];

    try {
      const { error } = await supabase
        .from('analytics_events')
        .insert(eventsToFlush);

      if (error) {
        console.error('Failed to flush analytics events:', error);
        // Re-add events to queue on error
        this.queue.unshift(...eventsToFlush);
      }
    } catch (error) {
      console.error('Error flushing analytics:', error);
      // Re-add events to queue on error
      this.queue.unshift(...eventsToFlush);
    }
  }

  /**
   * Start automatic flush interval
   */
  private startFlushInterval() {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Stop automatic flush interval
   */
  stopFlushInterval() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }
}

export const analytics = new AnalyticsService();

