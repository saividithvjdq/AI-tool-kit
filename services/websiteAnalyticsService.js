const WebsiteAnalytics = require('../models/WebsiteAnalytics');
const Website = require('../models/Website');
const analyticsAIService = require('./analyticsAIService');

class WebsiteAnalyticsService {
  constructor() {
    this.updateInterval = 5 * 60 * 1000; // 5 minutes
    this.isRunning = false;
  }

  // Initialize analytics for a new website
  async initializeWebsiteAnalytics(websiteId, userId) {
    try {
      const existingAnalytics = await WebsiteAnalytics.findOne({ websiteId });
      
      if (existingAnalytics) {
        return existingAnalytics;
      }

      const analytics = new WebsiteAnalytics({
        websiteId,
        userId,
        traffic: {
          pageViews: 0,
          uniqueVisitors: 0,
          sessions: 0,
          bounceRate: 0,
          avgSessionDuration: 0,
          newVsReturning: { newVisitors: 0, returningVisitors: 0 },
          topPages: [],
          referralSources: [],
          deviceBreakdown: { desktop: 0, mobile: 0, tablet: 0 },
          geographicData: []
        },
        seo: {
          overallScore: 0,
          keywordRankings: [],
          backlinks: { total: 0, dofollow: 0, nofollow: 0 },
          technicalSEO: {
            pageSpeed: { desktop: 0, mobile: 0 },
            coreWebVitals: { lcp: 0, fid: 0, cls: 0 },
            indexability: { indexedPages: 0, totalPages: 0, crawlErrors: 0 }
          }
        },
        conversions: {
          totalConversions: 0,
          conversionRate: 0,
          goals: [],
          funnelAnalysis: [],
          revenue: { total: 0, currency: 'USD' }
        },
        socialMedia: {
          shares: { facebook: 0, twitter: 0, linkedin: 0, instagram: 0, total: 0 },
          mentions: { total: 0, positive: 0, negative: 0, neutral: 0 },
          engagement: { likes: 0, comments: 0, shares: 0 }
        },
        campaigns: [],
        dailyMetrics: [],
        alerts: []
      });

      await analytics.save();
      
      // Generate initial SEO analysis
      await this.generateInitialSEOAnalysis(websiteId);
      
      return analytics;
    } catch (error) {
      console.error('Error initializing website analytics:', error);
      throw error;
    }
  }

  // Generate initial SEO analysis using AI
  async generateInitialSEOAnalysis(websiteId) {
    try {
      const website = await Website.findById(websiteId);
      if (!website) return;

      const seoAnalysis = await analyticsAIService.analyzeWebsiteMarketing({
        businessInfo: website.businessInfo,
        content: website.content,
        seo: website.seo
      });

      const analytics = await WebsiteAnalytics.findOne({ websiteId });
      if (analytics) {
        analytics.seo.overallScore = seoAnalysis.seoScore || 75;
        analytics.seo.keywordRankings = this.generateKeywordRankings(website);
        await analytics.save();
      }
    } catch (error) {
      console.error('Error generating initial SEO analysis:', error);
    }
  }

  // Generate realistic keyword rankings based on website content
  generateKeywordRankings(website) {
    const keywords = [
      ...website.businessInfo.keyServices || [],
      website.businessInfo.industry,
      website.businessInfo.name,
      ...website.seo.keywords || []
    ].filter(Boolean);

    return keywords.slice(0, 10).map(keyword => ({
      keyword,
      position: Math.floor(Math.random() * 50) + 1,
      searchVolume: Math.floor(Math.random() * 10000) + 100,
      difficulty: Math.floor(Math.random() * 100),
      url: `/${website.domain.subdomain}`,
      lastChecked: new Date()
    }));
  }

  // Simulate real-time traffic data
  async simulateTrafficData(websiteId) {
    try {
      const analytics = await WebsiteAnalytics.findOne({ websiteId });
      if (!analytics) return;

      const now = new Date();
      const hour = now.getHours();
      
      // Simulate traffic patterns based on time of day
      const baseTraffic = this.getBaseTrafficForHour(hour);
      const variance = 0.3; // 30% variance
      
      const newMetrics = {
        pageViews: analytics.traffic.pageViews + Math.floor(baseTraffic.pageViews * (1 + (Math.random() - 0.5) * variance)),
        uniqueVisitors: analytics.traffic.uniqueVisitors + Math.floor(baseTraffic.uniqueVisitors * (1 + (Math.random() - 0.5) * variance)),
        sessions: analytics.traffic.sessions + Math.floor(baseTraffic.sessions * (1 + (Math.random() - 0.5) * variance)),
        bounceRate: Math.max(0, Math.min(100, analytics.traffic.bounceRate + (Math.random() - 0.5) * 5)),
        avgSessionDuration: Math.max(0, analytics.traffic.avgSessionDuration + (Math.random() - 0.5) * 30)
      };

      await analytics.updateTrafficMetrics(newMetrics);
      
      // Add daily metric if it's a new day
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const existingDailyMetric = analytics.dailyMetrics.find(
        metric => metric.date.toDateString() === today.toDateString()
      );
      
      if (!existingDailyMetric) {
        await analytics.addDailyMetric(today, {
          pageViews: newMetrics.pageViews,
          uniqueVisitors: newMetrics.uniqueVisitors,
          sessions: newMetrics.sessions,
          bounceRate: newMetrics.bounceRate,
          conversions: analytics.conversions.totalConversions,
          revenue: analytics.conversions.revenue.total,
          socialShares: analytics.socialMedia.shares.total,
          seoScore: analytics.seo.overallScore
        });
      }

      return analytics;
    } catch (error) {
      console.error('Error simulating traffic data:', error);
    }
  }

  // Get base traffic patterns for different hours
  getBaseTrafficForHour(hour) {
    const patterns = {
      // Night hours (0-6): Low traffic
      0: { pageViews: 2, uniqueVisitors: 1, sessions: 1 },
      1: { pageViews: 1, uniqueVisitors: 1, sessions: 1 },
      2: { pageViews: 1, uniqueVisitors: 0, sessions: 0 },
      3: { pageViews: 1, uniqueVisitors: 0, sessions: 0 },
      4: { pageViews: 1, uniqueVisitors: 1, sessions: 1 },
      5: { pageViews: 2, uniqueVisitors: 1, sessions: 1 },
      6: { pageViews: 3, uniqueVisitors: 2, sessions: 2 },
      
      // Morning hours (7-11): Increasing traffic
      7: { pageViews: 5, uniqueVisitors: 3, sessions: 3 },
      8: { pageViews: 8, uniqueVisitors: 5, sessions: 5 },
      9: { pageViews: 12, uniqueVisitors: 8, sessions: 7 },
      10: { pageViews: 15, uniqueVisitors: 10, sessions: 9 },
      11: { pageViews: 18, uniqueVisitors: 12, sessions: 11 },
      
      // Afternoon hours (12-17): Peak traffic
      12: { pageViews: 20, uniqueVisitors: 15, sessions: 13 },
      13: { pageViews: 22, uniqueVisitors: 16, sessions: 14 },
      14: { pageViews: 25, uniqueVisitors: 18, sessions: 16 },
      15: { pageViews: 23, uniqueVisitors: 17, sessions: 15 },
      16: { pageViews: 20, uniqueVisitors: 15, sessions: 13 },
      17: { pageViews: 18, uniqueVisitors: 13, sessions: 12 },
      
      // Evening hours (18-23): Moderate traffic
      18: { pageViews: 15, uniqueVisitors: 11, sessions: 10 },
      19: { pageViews: 12, uniqueVisitors: 9, sessions: 8 },
      20: { pageViews: 10, uniqueVisitors: 7, sessions: 7 },
      21: { pageViews: 8, uniqueVisitors: 6, sessions: 5 },
      22: { pageViews: 5, uniqueVisitors: 4, sessions: 4 },
      23: { pageViews: 3, uniqueVisitors: 2, sessions: 2 }
    };
    
    return patterns[hour] || { pageViews: 5, uniqueVisitors: 3, sessions: 3 };
  }

  // Update SEO metrics
  async updateSEOMetrics(websiteId) {
    try {
      const analytics = await WebsiteAnalytics.findOne({ websiteId });
      if (!analytics) return;

      // Simulate SEO score changes
      const currentScore = analytics.seo.overallScore;
      const change = (Math.random() - 0.5) * 2; // -1 to +1 change
      const newScore = Math.max(0, Math.min(100, currentScore + change));

      const seoMetrics = {
        overallScore: newScore,
        technicalSEO: {
          pageSpeed: {
            desktop: Math.max(0, Math.min(100, 85 + (Math.random() - 0.5) * 10)),
            mobile: Math.max(0, Math.min(100, 75 + (Math.random() - 0.5) * 10)),
            lastChecked: new Date()
          },
          coreWebVitals: {
            lcp: Math.max(0, 2.5 + (Math.random() - 0.5) * 0.5),
            fid: Math.max(0, 100 + (Math.random() - 0.5) * 20),
            cls: Math.max(0, 0.1 + (Math.random() - 0.5) * 0.05),
            lastChecked: new Date()
          }
        }
      };

      await analytics.updateSEOMetrics(seoMetrics);
      return analytics;
    } catch (error) {
      console.error('Error updating SEO metrics:', error);
    }
  }

  // Get analytics dashboard data for a specific website
  async getWebsiteAnalyticsDashboard(websiteId, userId, dateRange = 30) {
    try {
      const analytics = await WebsiteAnalytics.findOne({ websiteId, userId });
      if (!analytics) {
        throw new Error('Analytics not found for this website');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const recentMetrics = analytics.dailyMetrics
        .filter(metric => metric.date >= startDate)
        .sort((a, b) => a.date - b.date);

      return {
        overview: {
          totalPageViews: analytics.traffic.pageViews,
          uniqueVisitors: analytics.traffic.uniqueVisitors,
          bounceRate: analytics.traffic.bounceRate,
          avgSessionDuration: analytics.traffic.avgSessionDuration,
          conversionRate: analytics.conversions.conversionRate,
          seoScore: analytics.seo.overallScore
        },
        traffic: analytics.traffic,
        seo: analytics.seo,
        conversions: analytics.conversions,
        socialMedia: analytics.socialMedia,
        campaigns: analytics.campaigns,
        trends: recentMetrics,
        alerts: analytics.alerts.filter(alert => !alert.isRead).slice(0, 5),
        lastUpdated: analytics.lastUpdated
      };
    } catch (error) {
      console.error('Error getting analytics dashboard:', error);
      throw error;
    }
  }

  // Start real-time analytics simulation
  startRealTimeSimulation() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🔄 Starting real-time analytics simulation...');
    
    this.simulationInterval = setInterval(async () => {
      try {
        const websites = await Website.find({ status: 'published' }).limit(50);
        
        for (const website of websites) {
          await this.simulateTrafficData(website._id);
          
          // Update SEO metrics less frequently (every 30 minutes)
          if (Math.random() < 0.1) {
            await this.updateSEOMetrics(website._id);
          }
        }
      } catch (error) {
        console.error('Error in real-time simulation:', error);
      }
    }, this.updateInterval);
  }

  // Stop real-time analytics simulation
  stopRealTimeSimulation() {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.isRunning = false;
      console.log('⏹️ Stopped real-time analytics simulation');
    }
  }
}

module.exports = new WebsiteAnalyticsService();
