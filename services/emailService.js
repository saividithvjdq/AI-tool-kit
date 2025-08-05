const nodemailer = require('nodemailer');
const { validate } = require('email-validator');
const fs = require('fs');
const path = require('path');
const handlebars = require('handlebars');

class EmailService {
  constructor() {
    this.configuration = {
      EMAIL: process.env.EMAIL_ID || 'vjdataquesters.club@gmail.com',
      APP_PASS: process.env.EMAIL_PASS || 'pwqsyxnurpdwvtmo',
      CONCURRENCY_LIMIT: parseInt(process.env.EMAIL_CONCURRENCY_LIMIT) || 10,
      SERVICE: process.env.EMAIL_SERVICE || 'gmail'
    };

    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransport({
        service: this.configuration.SERVICE,
        auth: {
          user: this.configuration.EMAIL,
          pass: this.configuration.APP_PASS,
        },
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development',
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5
      });

      console.log('📧 Email service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize email service:', error.message);
      this.transporter = null;
    }
  }

  async verifyConnection() {
    if (!this.transporter) {
      throw new Error('Email transporter not initialized');
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email server connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email server connection failed:', error.message);
      return false;
    }
  }

  loadTemplate(templateName, variables = {}) {
    try {
      const templatePath = path.join(__dirname, '../templates/email', `${templateName}.html`);
      
      if (!fs.existsSync(templatePath)) {
        console.warn(`⚠️ Template ${templateName} not found, using default template`);
        return this.getDefaultTemplate(variables);
      }

      const templateSource = fs.readFileSync(templatePath, 'utf8');
      const template = handlebars.compile(templateSource);
      return template(variables);
    } catch (error) {
      console.error('❌ Error loading email template:', error.message);
      return this.getDefaultTemplate(variables);
    }
  }

  getDefaultTemplate(variables = {}) {
    const defaultTemplate = `
      <!DOCTYPE html>
      <html>
      <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>{{subject}}</title>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; margin: 0; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { padding: 30px; }
              .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; color: #666; }
              .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
      </head>
      <body>
          <div class="container">
              <div class="header">
                  <h1>{{title}}</h1>
              </div>
              <div class="content">
                  <p>Hello {{name}},</p>
                  <div>{{{content}}}</div>
                  {{#if actionUrl}}
                  <p><a href="{{actionUrl}}" class="btn">{{actionText}}</a></p>
                  {{/if}}
              </div>
              <div class="footer">
                  <p>{{companyName}} - {{companyAddress}}</p>
                  <p><a href="{{unsubscribeUrl}}">Unsubscribe</a></p>
              </div>
          </div>
      </body>
      </html>
    `;

    const template = handlebars.compile(defaultTemplate);
    return template({
      title: variables.title || 'Notification',
      name: variables.name || 'User',
      content: variables.content || 'Thank you for using our service.',
      subject: variables.subject || 'Notification',
      companyName: variables.companyName || 'MechXTech',
      companyAddress: variables.companyAddress || 'Your Business Address',
      actionUrl: variables.actionUrl,
      actionText: variables.actionText || 'View Details',
      unsubscribeUrl: variables.unsubscribeUrl || '#'
    });
  }

  async sendSingleEmail(options) {
    if (!this.transporter) {
      throw new Error('Email service not available');
    }

    const { to, subject, template, variables = {}, attachments = [], text } = options;

    if (!validate(to)) {
      throw new Error(`Invalid email address: ${to}`);
    }

    try {
      const html = template ? this.loadTemplate(template, variables) : this.getDefaultTemplate(variables);

      const mailOptions = {
        from: `${variables.fromName || 'MechXTech'} <${this.configuration.EMAIL}>`,
        to,
        subject,
        text: text || variables.content || 'Please enable HTML to view this email.',
        html,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent to ${to}: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        recipient: to,
        status: 'sent'
      };
    } catch (error) {
      console.error(`❌ Error sending email to ${to}:`, error.message);
      
      return {
        success: false,
        recipient: to,
        status: 'failed',
        error: error.message
      };
    }
  }

  async sendBulkEmails(emailList, options = {}) {
    const { template, subject, variables = {}, attachments = [] } = options;
    const batchSize = this.configuration.CONCURRENCY_LIMIT;
    const results = [];
    let sentCount = 0;
    let failedCount = 0;

    console.log(`📨 Sending ${emailList.length} emails in batches of ${batchSize}...`);

    for (let i = 0; i < emailList.length; i += batchSize) {
      const batch = emailList.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(emailList.length / batchSize);
      
      console.log(`🚀 Processing batch ${batchNumber} of ${totalBatches} (${batch.length} emails)`);

      const batchPromises = batch.map(async (emailData) => {
        const emailOptions = {
          to: typeof emailData === 'string' ? emailData : emailData.email,
          subject,
          template,
          variables: {
            ...variables,
            ...(typeof emailData === 'object' ? emailData.variables || {} : {}),
            name: typeof emailData === 'object' ? emailData.name : emailData
          },
          attachments: typeof emailData === 'object' && emailData.attachments 
            ? [...attachments, ...emailData.attachments] 
            : attachments
        };

        return this.sendSingleEmail(emailOptions);
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) {
            sentCount++;
          } else {
            failedCount++;
          }
        } else {
          results.push({
            success: false,
            status: 'failed',
            error: result.reason.message
          });
          failedCount++;
        }
      });

      console.log(`✅ Batch ${batchNumber} complete. Sent: ${sentCount}, Failed: ${failedCount}`);

      // Add delay between batches to respect rate limits
      if (i + batchSize < emailList.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log('🏁 Bulk email sending complete!');
    console.log(`📊 Summary - Total: ${emailList.length}, Sent: ${sentCount}, Failed: ${failedCount}`);

    return {
      total: emailList.length,
      sent: sentCount,
      failed: failedCount,
      results
    };
  }

  async sendNewsletterEmail(newsletterData, recipientList) {
    const { subject, content, html } = newsletterData;
    
    const emailOptions = {
      subject,
      template: 'newsletter',
      variables: {
        title: subject,
        content: content || 'Newsletter content',
        companyName: 'AI Business Platform'
      }
    };

    return this.sendBulkEmails(recipientList, emailOptions);
  }

  async sendMarketingCampaign(campaignData) {
    const { 
      subject, 
      template = 'campaign', 
      content, 
      recipientList, 
      variables = {},
      scheduledTime 
    } = campaignData;

    // If scheduled for later, implement scheduling logic here
    if (scheduledTime && new Date(scheduledTime) > new Date()) {
      console.log(`📅 Campaign scheduled for: ${scheduledTime}`);
      // In a real implementation, you'd use a job queue like Bull or Agenda
      return { status: 'scheduled', scheduledTime };
    }

    const emailOptions = {
      subject,
      template,
      variables: {
        ...variables,
        content,
        companyName: variables.companyName || 'MechXTech'
      }
    };

    return this.sendBulkEmails(recipientList, emailOptions);
  }

  async sendWebsiteNotification(websiteId, notificationType, data) {
    // Integration with WebsiteAnalytics for sending analytics alerts
    const templates = {
      'traffic_spike': {
        subject: '🚀 Traffic Spike Alert - Your Website is Getting Popular!',
        template: 'traffic_alert',
        variables: {
          title: 'Traffic Spike Detected',
          content: `Your website has experienced a ${data.increase}% increase in traffic. Current visitors: ${data.currentVisitors}`
        }
      },
      'conversion_drop': {
        subject: '⚠️ Conversion Rate Alert - Action Required',
        template: 'conversion_alert',
        variables: {
          title: 'Conversion Rate Drop',
          content: `Your conversion rate has dropped by ${data.decrease}%. Current rate: ${data.currentRate}%`
        }
      },
      'seo_improvement': {
        subject: '📈 SEO Score Improvement',
        template: 'seo_alert',
        variables: {
          title: 'SEO Score Improved',
          content: `Your SEO score has improved to ${data.newScore}/100. Great work!`
        }
      }
    };

    const emailConfig = templates[notificationType];
    if (!emailConfig) {
      console.warn(`Unknown notification type: ${notificationType}`);
      return;
    }

    // In a real implementation, you'd fetch the website owner's email from the database
    const ownerEmail = data.ownerEmail || process.env.DEFAULT_ADMIN_EMAIL;
    
    if (ownerEmail) {
      return this.sendSingleEmail({
        to: ownerEmail,
        ...emailConfig
      });
    }
  }

  close() {
    if (this.transporter) {
      this.transporter.close();
      console.log('📧 Email service connection closed');
    }
  }
}

module.exports = new EmailService();
