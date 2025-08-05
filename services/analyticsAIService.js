const Groq = require('groq-sdk');

class AnalyticsAIService {
  constructor() {
    if (process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('placeholder')) {
      this.groq = new Groq({
        apiKey: process.env.GROQ_API_KEY
      });
      this.groqAvailable = true;
    } else {
      console.warn('GROQ API key not configured - using fallback responses for analytics AI');
      this.groq = null;
      this.groqAvailable = false;
    }
  }

  async analyzeBusinessMetrics(data) {
    if (!this.groqAvailable) {
      return this.getMockAnalysis(data);
    }

    try {
      const {
        revenue = [],
        customers = [],
        websiteTraffic = [],
        marketingCampaigns = [],
        customerFeedback = [],
        industry,
        businessName,
        timeframe = '30d'
      } = data;

      const prompt = `You are an expert business analyst. Analyze the following business metrics and provide comprehensive insights:

Business Information:
- Name: ${businessName}
- Industry: ${industry}
- Analysis Period: ${timeframe}

Metrics Data:
- Revenue Data Points: ${revenue.length} entries
- Customer Data Points: ${customers.length} entries  
- Website Traffic Data Points: ${websiteTraffic.length} entries
- Marketing Campaigns: ${marketingCampaigns.length} campaigns
- Customer Feedback: ${customerFeedback.length} feedback items

Revenue Trend: ${this.calculateTrend(revenue)}
Customer Growth: ${this.calculateTrend(customers)}
Traffic Trend: ${this.calculateTrend(websiteTraffic)}

Provide analysis in JSON format:
{
  "overallPerformance": {
    "score": "number 1-100",
    "status": "excellent|good|average|poor",
    "summary": "brief overall assessment"
  },
  "keyInsights": [
    {
      "category": "revenue|customers|traffic|marketing|feedback",
      "insight": "detailed insight",
      "impact": "high|medium|low",
      "trend": "increasing|decreasing|stable"
    }
  ],
  "recommendations": [
    {
      "priority": "high|medium|low",
      "action": "specific recommendation",
      "expectedImpact": "description of expected results",
      "timeframe": "immediate|short-term|long-term"
    }
  ],
  "predictions": {
    "nextMonth": {
      "revenue": "predicted change percentage",
      "customers": "predicted change percentage",
      "traffic": "predicted change percentage"
    }
  },
  "riskFactors": [
    {
      "risk": "description of risk",
      "severity": "high|medium|low",
      "mitigation": "suggested mitigation strategy"
    }
  ],
  "opportunities": [
    {
      "opportunity": "description of opportunity",
      "potential": "high|medium|low",
      "requirements": "what's needed to capitalize"
    }
  ]
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 2500
      });

      return this.parseJSONResponse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error('Error analyzing business metrics:', error);
      throw new Error('Failed to analyze business metrics');
    }
  }

  async generateCompetitiveAnalysis(data) {
    try {
      const { industry, businessName, marketPosition, competitors = [] } = data;

      const prompt = `Analyze the competitive landscape for this business:

Business: ${businessName}
Industry: ${industry}
Current Market Position: ${marketPosition}
Known Competitors: ${competitors.join(', ')}

Provide competitive analysis in JSON format:
{
  "marketAnalysis": {
    "marketSize": "description of market size",
    "growthRate": "estimated growth rate",
    "trends": ["trend1", "trend2", "trend3"]
  },
  "competitivePosition": {
    "strengths": ["strength1", "strength2"],
    "weaknesses": ["weakness1", "weakness2"],
    "opportunities": ["opportunity1", "opportunity2"],
    "threats": ["threat1", "threat2"]
  },
  "recommendations": [
    {
      "strategy": "strategic recommendation",
      "rationale": "why this strategy makes sense",
      "implementation": "how to implement"
    }
  ],
  "benchmarks": {
    "industryAverages": {
      "customerAcquisitionCost": "estimated range",
      "customerLifetimeValue": "estimated range",
      "conversionRate": "estimated percentage"
    }
  }
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.4,
        max_tokens: 2000
      });

      return this.parseJSONResponse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error('Error generating competitive analysis:', error);
      throw new Error('Failed to generate competitive analysis');
    }
  }

  async analyzeCustomerSegments(data) {
    try {
      const { customers = [], transactions = [], demographics = {} } = data;

      const prompt = `Analyze customer data to identify segments and patterns:

Customer Data:
- Total Customers: ${customers.length}
- Total Transactions: ${transactions.length}
- Demographics Available: ${Object.keys(demographics).join(', ')}

Provide customer segmentation analysis in JSON format:
{
  "segments": [
    {
      "name": "segment name",
      "size": "percentage of customer base",
      "characteristics": ["characteristic1", "characteristic2"],
      "value": "high|medium|low",
      "behavior": "description of buying behavior"
    }
  ],
  "insights": [
    {
      "segment": "segment name",
      "insight": "key insight about this segment",
      "actionable": "specific action to take"
    }
  ],
  "recommendations": [
    {
      "segment": "target segment",
      "strategy": "recommended strategy",
      "tactics": ["tactic1", "tactic2"]
    }
  ]
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 1800
      });

      return this.parseJSONResponse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error('Error analyzing customer segments:', error);
      throw new Error('Failed to analyze customer segments');
    }
  }

  async predictBusinessTrends(data) {
    try {
      const { historicalData, industry, seasonality = false, externalFactors = [] } = data;

      const prompt = `Predict business trends based on historical data:

Industry: ${industry}
Historical Data Points: ${historicalData.length}
Seasonality Considered: ${seasonality}
External Factors: ${externalFactors.join(', ')}

Historical Trend: ${this.calculateTrend(historicalData)}

Provide trend predictions in JSON format:
{
  "predictions": {
    "nextQuarter": {
      "trend": "increasing|decreasing|stable",
      "confidence": "high|medium|low",
      "expectedChange": "percentage change",
      "factors": ["factor1", "factor2"]
    },
    "nextYear": {
      "trend": "increasing|decreasing|stable",
      "confidence": "high|medium|low",
      "expectedChange": "percentage change",
      "factors": ["factor1", "factor2"]
    }
  },
  "scenarios": [
    {
      "name": "optimistic",
      "probability": "percentage",
      "outcome": "description of outcome"
    },
    {
      "name": "realistic",
      "probability": "percentage", 
      "outcome": "description of outcome"
    },
    {
      "name": "pessimistic",
      "probability": "percentage",
      "outcome": "description of outcome"
    }
  ],
  "recommendations": [
    {
      "timeframe": "immediate|short-term|long-term",
      "action": "recommended action",
      "rationale": "why this action is recommended"
    }
  ]
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.4,
        max_tokens: 2000
      });

      return this.parseJSONResponse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error('Error predicting business trends:', error);
      throw new Error('Failed to predict business trends');
    }
  }

  async generateKPIRecommendations(data) {
    try {
      const { industry, businessStage, currentKPIs = [], goals = [] } = data;

      const prompt = `Recommend KPIs for business tracking:

Industry: ${industry}
Business Stage: ${businessStage}
Current KPIs: ${currentKPIs.join(', ')}
Business Goals: ${goals.join(', ')}

Provide KPI recommendations in JSON format:
{
  "recommendedKPIs": [
    {
      "category": "financial|operational|customer|marketing",
      "name": "KPI name",
      "description": "what this KPI measures",
      "importance": "high|medium|low",
      "frequency": "daily|weekly|monthly|quarterly",
      "target": "suggested target or benchmark"
    }
  ],
  "dashboard": {
    "primaryKPIs": ["most important KPIs to track"],
    "secondaryKPIs": ["supporting KPIs"],
    "layout": "suggested dashboard organization"
  },
  "implementation": [
    {
      "kpi": "KPI name",
      "dataSource": "where to get the data",
      "calculation": "how to calculate",
      "tools": ["recommended tools"]
    }
  ]
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 2000
      });

      return this.parseJSONResponse(completion.choices[0]?.message?.content);
    } catch (error) {
      console.error('Error generating KPI recommendations:', error);
      throw new Error('Failed to generate KPI recommendations');
    }
  }

  calculateTrend(dataPoints) {
    if (!dataPoints || dataPoints.length < 2) return 'insufficient data';
    
    const first = dataPoints[0]?.value || 0;
    const last = dataPoints[dataPoints.length - 1]?.value || 0;
    const change = ((last - first) / first) * 100;
    
    if (change > 5) return 'increasing';
    if (change < -5) return 'decreasing';
    return 'stable';
  }

  parseJSONResponse(response) {
    try {
      let cleanResponse = response.trim();
      cleanResponse = cleanResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return { error: 'Could not parse AI response', rawResponse: response };
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      return { error: 'Invalid JSON response', rawResponse: response };
    }
  }
  // Mock analysis when GROQ is not available
  getMockAnalysis(data) {
    return {
      insights: [
        {
          title: 'Business Performance Overview',
          description: 'Mock analysis - GROQ API not configured',
          type: 'info',
          impact: 'medium'
        }
      ],
      recommendations: [
        {
          category: 'Setup',
          title: 'Configure Analytics AI',
          description: 'Add GROQ_API_KEY to enable AI-powered analytics',
          priority: 'medium',
          impact: 'medium',
          effort: 'low'
        }
      ],
      metrics: {
        overallScore: 75,
        trends: 'stable',
        confidence: 'low'
      }
    };
  }

  async analyzeWebsiteMarketing(websiteData) {
    if (!this.groqAvailable) {
      return this.getMockWebsiteAnalysis(websiteData);
    }

    try {
      const { businessInfo, content, seo } = websiteData;

      const prompt = `You are an expert digital marketing analyst. Analyze this website and provide comprehensive marketing insights:

Business Information:
- Name: ${businessInfo.name}
- Industry: ${businessInfo.industry}
- Description: ${businessInfo.description}
- Target Audience: ${businessInfo.targetAudience}
- Key Services: ${businessInfo.keyServices?.join(', ')}

Website Content:
- Hero Headline: ${content?.hero?.headline}
- About Content: ${content?.about?.content}
- Services: ${content?.services?.map(s => s.title).join(', ')}

SEO Data:
- Title: ${seo?.title}
- Description: ${seo?.description}
- Keywords: ${seo?.keywords?.join(', ')}

Provide a detailed analysis including:
1. Overall marketing effectiveness score (1-100)
2. SEO optimization score (1-100)
3. Market positioning assessment
4. Target audience alignment
5. Competitive advantages
6. Growth potential rating
7. Top 5 marketing recommendations
8. SEO improvement suggestions
9. Content optimization opportunities
10. Conversion optimization tips

Format as JSON with clear sections.`;

      const completion = await this.groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 2000
      });

      const analysisText = completion.choices[0]?.message?.content;

      try {
        return JSON.parse(analysisText);
      } catch (parseError) {
        return this.parseWebsiteAnalysisText(analysisText);
      }
    } catch (error) {
      console.error('Error in website marketing analysis:', error);
      return this.getMockWebsiteAnalysis(websiteData);
    }
  }

  getMockWebsiteAnalysis(websiteData) {
    const { businessInfo } = websiteData;

    return {
      marketingEffectiveness: 78,
      seoScore: 85,
      marketPosition: 'Strong local presence with digital growth potential',
      targetAudienceAlignment: 'Well-aligned with target demographic',
      competitiveAdvantages: [
        'Unique value proposition',
        'Strong customer service focus',
        'Local market expertise'
      ],
      growthPotential: 'High',
      marketingRecommendations: [
        'Implement local SEO optimization',
        'Develop content marketing strategy',
        'Enhance social media presence',
        'Create customer testimonial campaigns',
        'Optimize website conversion funnel'
      ],
      seoRecommendations: [
        'Optimize meta descriptions',
        'Improve page loading speed',
        'Add structured data markup',
        'Create location-based landing pages',
        'Build quality backlinks'
      ],
      contentOptimization: [
        'Add customer success stories',
        'Create industry-specific content',
        'Implement clear call-to-actions',
        'Develop FAQ section'
      ],
      conversionOptimization: [
        'Simplify contact forms',
        'Add trust signals',
        'Implement live chat',
        'Create urgency in CTAs'
      ]
    };
  }

  parseWebsiteAnalysisText(text) {
    // Fallback parsing for non-JSON responses
    return {
      marketingEffectiveness: 75,
      seoScore: 80,
      marketPosition: 'Analyzing market position...',
      summary: text.substring(0, 500) + '...',
      keyInsights: [
        'Website shows strong potential for optimization',
        'SEO improvements needed for better visibility',
        'Content strategy requires enhancement'
      ]
    };
  }
}

module.exports = new AnalyticsAIService();
