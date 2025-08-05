const Groq = require('groq-sdk');

class FeedbackAnalysisService {
  constructor() {
    if (process.env.GROQ_API_KEY) {
      try {
        this.groq = new Groq({
          apiKey: process.env.GROQ_API_KEY
        });
      } catch (error) {
        console.log('⚠️ Error initializing GROQ - using fallback responses for feedback analysis');
        this.groq = null;
      }
    } else {
      console.log('⚠️ GROQ API key not configured - using fallback responses for feedback analysis');
      this.groq = null;
    }
  }

  // Analyze feedback using AI
  async analyzeFeedback(feedbackData) {
    try {
      const { rating, comments } = feedbackData;
      
      // Combine all text content for analysis
      const textContent = [
        comments.general,
        comments.likes,
        comments.improvements,
        comments.suggestions
      ].filter(Boolean).join(' ');

      if (!textContent.trim()) {
        return this.createBasicAnalysis(rating);
      }

      // Perform AI analysis
      const [sentimentAnalysis, categoryAnalysis, insightsAnalysis] = await Promise.all([
        this.analyzeSentiment(textContent),
        this.categorizeContent(textContent),
        this.generateActionableInsights(textContent, rating)
      ]);

      return {
        sentiment: sentimentAnalysis,
        emotions: this.extractEmotions(textContent),
        keywords: this.extractKeywords(textContent),
        categories: categoryAnalysis,
        actionableInsights: insightsAnalysis,
        processedAt: new Date(),
        processingModel: 'groq-llama'
      };
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      return this.createBasicAnalysis(feedbackData.rating);
    }
  }

  // Analyze sentiment using Groq
  async analyzeSentiment(text) {
    try {
      if (!this.groq) {
        // Fallback sentiment analysis without API
        return this.fallbackSentimentAnalysis(text);
      }

      const prompt = `
Analyze the sentiment of the following feedback text. Provide a JSON response with:
- overall: one of "very_positive", "positive", "neutral", "negative", "very_negative"
- score: a number between -1 (very negative) and 1 (very positive)
- confidence: a number between 0 and 1 indicating confidence in the analysis

Text: "${text}"

Respond only with valid JSON:`;

      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 200
      });

      const result = JSON.parse(response.choices[0].message.content);
      return {
        overall: result.overall || 'neutral',
        score: result.score || 0,
        confidence: result.confidence || 0.5
      };
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      return this.fallbackSentimentAnalysis(text);
    }
  }

  // Categorize feedback content
  async categorizeContent(text) {
    try {
      if (!this.groq) {
        return this.fallbackCategorizeContent(text);
      }

      const prompt = `
Categorize the following feedback text into relevant categories. Provide a JSON array of objects with:
- category: one of "design", "functionality", "content", "performance", "navigation", "mobile", "accessibility", "general"
- confidence: a number between 0 and 1
- mentions: array of specific phrases that led to this categorization

Text: "${text}"

Respond only with valid JSON array:`;

      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.1,
        max_tokens: 300
      });

      const result = JSON.parse(response.choices[0].message.content);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error in content categorization:', error);
      return this.fallbackCategorizeContent(text);
    }
  }

  // Generate actionable insights
  async generateActionableInsights(text, rating) {
    try {
      if (!this.groq) {
        return this.fallbackGenerateInsights(text, rating);
      }

      const prompt = `
Based on the following feedback text and rating, generate actionable insights. Provide a JSON array of objects with:
- priority: one of "high", "medium", "low"
- category: the area of improvement
- insight: what the feedback reveals
- suggestedAction: specific action to take
- impact: expected impact of the action

Feedback text: "${text}"
Overall rating: ${rating.overall}/5

Respond only with valid JSON array:`;

      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.2,
        max_tokens: 500
      });

      const result = JSON.parse(response.choices[0].message.content);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      console.error('Error generating insights:', error);
      return this.fallbackGenerateInsights(text, rating);
    }
  }

  // Extract emotions (simplified version)
  extractEmotions(text) {
    const emotionKeywords = {
      joy: ['happy', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect'],
      sadness: ['sad', 'disappointed', 'unhappy', 'terrible', 'awful', 'hate'],
      anger: ['angry', 'frustrated', 'annoying', 'irritating', 'furious', 'mad'],
      fear: ['worried', 'concerned', 'afraid', 'scary', 'nervous'],
      surprise: ['surprised', 'unexpected', 'shocking', 'amazing', 'wow'],
      trust: ['reliable', 'trustworthy', 'confident', 'secure', 'dependable'],
      anticipation: ['excited', 'looking forward', 'eager', 'hopeful', 'expecting']
    };

    const emotions = [];
    const lowerText = text.toLowerCase();

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(keyword => lowerText.includes(keyword));
      if (matches.length > 0) {
        emotions.push({
          emotion,
          intensity: Math.min(matches.length / keywords.length, 1)
        });
      }
    }

    return emotions;
  }

  // Extract keywords (simplified version)
  extractKeywords(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordCount = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });

    // Get top keywords
    const keywords = Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word, frequency]) => ({
        word,
        frequency,
        sentiment: this.getWordSentiment(word),
        relevance: frequency / words.length
      }));

    return keywords;
  }

  // Get basic sentiment for a word
  getWordSentiment(word) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love', 'like', 'best'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'worst', 'horrible', 'disappointing', 'poor'];

    if (positiveWords.includes(word)) return 'positive';
    if (negativeWords.includes(word)) return 'negative';
    return 'neutral';
  }

  // Create basic analysis when no text is provided
  createBasicAnalysis(rating) {
    const overallRating = rating.overall;
    let sentiment = 'neutral';
    let score = 0;

    if (overallRating >= 4.5) {
      sentiment = 'very_positive';
      score = 0.8;
    } else if (overallRating >= 3.5) {
      sentiment = 'positive';
      score = 0.4;
    } else if (overallRating >= 2.5) {
      sentiment = 'neutral';
      score = 0;
    } else if (overallRating >= 1.5) {
      sentiment = 'negative';
      score = -0.4;
    } else {
      sentiment = 'very_negative';
      score = -0.8;
    }

    return {
      sentiment: {
        overall: sentiment,
        score,
        confidence: 0.7
      },
      emotions: [],
      keywords: [],
      categories: [{
        category: 'general',
        confidence: 0.8,
        mentions: []
      }],
      actionableInsights: this.generateBasicInsights(overallRating),
      processedAt: new Date(),
      processingModel: 'basic-analysis'
    };
  }

  // Generate basic insights based on rating
  generateBasicInsights(rating) {
    if (rating >= 4) {
      return [{
        priority: 'low',
        category: 'general',
        insight: 'Customer is satisfied with the overall experience',
        suggestedAction: 'Continue maintaining current quality standards',
        impact: 'Maintain customer satisfaction and loyalty'
      }];
    } else if (rating >= 3) {
      return [{
        priority: 'medium',
        category: 'general',
        insight: 'Customer experience is average, room for improvement',
        suggestedAction: 'Identify specific areas for enhancement',
        impact: 'Potential to increase customer satisfaction'
      }];
    } else {
      return [{
        priority: 'high',
        category: 'general',
        insight: 'Customer is dissatisfied, immediate attention needed',
        suggestedAction: 'Investigate issues and implement improvements',
        impact: 'Critical for preventing customer churn'
      }];
    }
  }

  // Batch analyze multiple feedback items
  async batchAnalyzeFeedback(feedbackItems) {
    const results = [];
    
    for (const feedback of feedbackItems) {
      try {
        const analysis = await this.analyzeFeedback(feedback);
        results.push({
          feedbackId: feedback._id,
          analysis,
          success: true
        });
      } catch (error) {
        results.push({
          feedbackId: feedback._id,
          error: error.message,
          success: false
        });
      }
    }

    return results;
  }

  // Generate summary insights for multiple feedback items
  async generateSummaryInsights(feedbackItems) {
    try {
      const summaryText = feedbackItems
        .map(f => [f.comments.general, f.comments.improvements].filter(Boolean).join(' '))
        .join(' ');

      if (!summaryText.trim()) {
        return {
          overallSentiment: 'neutral',
          keyThemes: [],
          priorityActions: [],
          recommendations: []
        };
      }

      const prompt = `
Analyze the following collection of website feedback and provide a comprehensive summary. Provide a JSON response with:
- overallSentiment: overall sentiment across all feedback
- keyThemes: array of main themes/topics mentioned
- priorityActions: array of high-priority actions to take
- recommendations: array of strategic recommendations

Combined feedback: "${summaryText.substring(0, 2000)}"

Respond only with valid JSON:`;

      const response = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.2,
        max_tokens: 600
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Error generating summary insights:', error);
      return {
        overallSentiment: 'neutral',
        keyThemes: [],
        priorityActions: [],
        recommendations: []
      };
    }
  }

  // Fallback methods for when GROQ API is not available
  fallbackSentimentAnalysis(text) {
    const positiveWords = ['good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic', 'love', 'perfect', 'awesome', 'brilliant'];
    const negativeWords = ['bad', 'terrible', 'awful', 'hate', 'horrible', 'disgusting', 'worst', 'disappointing', 'frustrating'];
    
    const words = text.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    words.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });
    
    const score = (positiveCount - negativeCount) / Math.max(words.length, 1);
    let overall = 'neutral';
    
    if (score > 0.1) overall = 'positive';
    else if (score > 0.2) overall = 'very_positive';
    else if (score < -0.1) overall = 'negative';
    else if (score < -0.2) overall = 'very_negative';
    
    return {
      overall,
      score: Math.max(-1, Math.min(1, score)),
      confidence: 0.6
    };
  }

  fallbackCategorizeContent(text) {
    const categories = {
      design: ['design', 'layout', 'color', 'font', 'visual', 'appearance', 'style'],
      functionality: ['function', 'feature', 'work', 'broken', 'bug', 'error'],
      content: ['content', 'text', 'information', 'article', 'blog'],
      performance: ['slow', 'fast', 'speed', 'load', 'performance'],
      navigation: ['navigation', 'menu', 'link', 'page', 'click'],
      mobile: ['mobile', 'phone', 'responsive', 'tablet'],
      accessibility: ['accessibility', 'accessible', 'disability']
    };
    
    const result = [];
    const textLower = text.toLowerCase();
    
    Object.entries(categories).forEach(([category, keywords]) => {
      const matches = keywords.filter(keyword => textLower.includes(keyword));
      if (matches.length > 0) {
        result.push({
          category,
          confidence: Math.min(matches.length * 0.3, 1),
          mentions: matches
        });
      }
    });
    
    return result.length > 0 ? result : [{
      category: 'general',
      confidence: 0.5,
      mentions: []
    }];
  }

  fallbackGenerateInsights(text, rating) {
    const insights = [];
    const ratingValue = rating?.overall || 3;
    
    if (ratingValue < 3) {
      insights.push({
        priority: 'high',
        category: 'user_satisfaction',
        insight: 'Low user satisfaction detected',
        suggestedAction: 'Investigate specific pain points mentioned in feedback',
        impact: 'Improved user retention and satisfaction'
      });
    }
    
    if (text.toLowerCase().includes('slow') || text.toLowerCase().includes('performance')) {
      insights.push({
        priority: 'high',
        category: 'performance',
        insight: 'Performance concerns mentioned',
        suggestedAction: 'Optimize page load times and system performance',
        impact: 'Better user experience and engagement'
      });
    }
    
    return insights;
  }
}

// Export the class, not an instance to avoid initialization errors
module.exports = FeedbackAnalysisService;
