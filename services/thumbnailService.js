const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

class ThumbnailService {
  constructor() {
    this.browser = null;
    this.thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
    this.ensureThumbnailDir();
  }

  // Ensure thumbnail directory exists
  async ensureThumbnailDir() {
    try {
      await fs.access(this.thumbnailDir);
    } catch (error) {
      await fs.mkdir(this.thumbnailDir, { recursive: true });
    }
  }

  // Initialize browser
  async initBrowser() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
    }
    return this.browser;
  }

  // Close browser
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // Generate thumbnail from HTML content
  async generateThumbnailFromHTML(html, options = {}) {
    const {
      width = 1200,
      height = 800,
      thumbnailWidth = 300,
      thumbnailHeight = 200,
      quality = 80
    } = options;

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width, height });

      // Set content
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

      // Generate filename
      const hash = crypto.createHash('md5').update(html).digest('hex');
      const filename = `thumbnail_${hash}_${Date.now()}.jpg`;
      const filepath = path.join(this.thumbnailDir, filename);

      // Take screenshot
      await page.screenshot({
        path: filepath,
        type: 'jpeg',
        quality,
        clip: {
          x: 0,
          y: 0,
          width: thumbnailWidth,
          height: thumbnailHeight
        }
      });

      await page.close();

      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/thumbnails/${filename}`,
        dimensions: {
          width: thumbnailWidth,
          height: thumbnailHeight
        }
      };
    } catch (error) {
      console.error('Error generating thumbnail from HTML:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate thumbnail from URL
  async generateThumbnailFromURL(url, options = {}) {
    const {
      width = 1200,
      height = 800,
      thumbnailWidth = 300,
      thumbnailHeight = 200,
      quality = 80
    } = options;

    try {
      const browser = await this.initBrowser();
      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({ width, height });

      // Navigate to URL
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

      // Generate filename
      const hash = crypto.createHash('md5').update(url).digest('hex');
      const filename = `thumbnail_${hash}_${Date.now()}.jpg`;
      const filepath = path.join(this.thumbnailDir, filename);

      // Take screenshot
      await page.screenshot({
        path: filepath,
        type: 'jpeg',
        quality,
        clip: {
          x: 0,
          y: 0,
          width: thumbnailWidth,
          height: thumbnailHeight
        }
      });

      await page.close();

      return {
        success: true,
        filename,
        filepath,
        url: `/uploads/thumbnails/${filename}`,
        dimensions: {
          width: thumbnailWidth,
          height: thumbnailHeight
        }
      };
    } catch (error) {
      console.error('Error generating thumbnail from URL:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate website thumbnail
  async generateWebsiteThumbnail(website, options = {}) {
    try {
      // Create complete HTML for the website
      const html = this.createCompleteHTML(website);
      
      // Generate thumbnail
      const result = await this.generateThumbnailFromHTML(html, options);
      
      if (result.success) {
        // Update website with thumbnail info
        website.thumbnail = {
          filename: result.filename,
          url: result.url,
          generatedAt: new Date(),
          dimensions: result.dimensions
        };
        await website.save();
      }

      return result;
    } catch (error) {
      console.error('Error generating website thumbnail:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Create complete HTML for thumbnail generation
  createCompleteHTML(website) {
    const businessInfo = website.businessInfo;
    const content = website.content;
    const design = website.design;

    // Use existing HTML if available, otherwise generate basic HTML
    if (content?.html) {
      return this.wrapHTMLForThumbnail(content.html, content.css);
    }

    // Generate basic HTML for thumbnail
    const primaryColor = design?.colorScheme?.primary || '#6366f1';
    const secondaryColor = design?.colorScheme?.secondary || '#8b5cf6';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${businessInfo.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Montserrat', sans-serif; line-height: 1.6; color: #333; }
        .hero { 
            background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); 
            color: white; 
            padding: 60px 20px; 
            text-align: center; 
            min-height: 400px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-direction: column;
        }
        .hero h1 { 
            font-size: 2.5rem; 
            margin-bottom: 1rem; 
            font-weight: 700; 
        }
        .hero p { 
            font-size: 1.1rem; 
            margin-bottom: 2rem; 
            max-width: 600px;
        }
        .btn { 
            display: inline-block; 
            padding: 12px 30px; 
            background: white; 
            color: ${primaryColor}; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: 600; 
        }
        .services { 
            padding: 40px 20px; 
            background: #f8f9fa; 
        }
        .services h2 { 
            text-align: center; 
            margin-bottom: 2rem; 
            color: ${primaryColor}; 
        }
        .service-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 1rem; 
            max-width: 800px; 
            margin: 0 auto; 
        }
        .service-card { 
            background: white; 
            padding: 1.5rem; 
            border-radius: 8px; 
            text-align: center; 
            box-shadow: 0 2px 4px rgba(0,0,0,0.1); 
        }
    </style>
</head>
<body>
    <div class="hero">
        <h1>${businessInfo.name}</h1>
        <p>${businessInfo.description}</p>
        <a href="#" class="btn">Get Started</a>
    </div>
    
    <div class="services">
        <h2>Our Services</h2>
        <div class="service-grid">
            ${(businessInfo.keyServices || []).slice(0, 3).map(service => `
                <div class="service-card">
                    <h3>${service}</h3>
                    <p>Professional ${service} services</p>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
  }

  // Wrap existing HTML for thumbnail generation
  wrapHTMLForThumbnail(html, css = '') {
    // If HTML already includes DOCTYPE, return as is
    if (html.includes('<!DOCTYPE')) {
      return html;
    }

    // Wrap partial HTML
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        ${css}
    </style>
</head>
<body>
    ${html}
</body>
</html>`;
  }

  // Delete thumbnail file
  async deleteThumbnail(filename) {
    try {
      const filepath = path.join(this.thumbnailDir, filename);
      await fs.unlink(filepath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting thumbnail:', error);
      return { success: false, error: error.message };
    }
  }

  // Cleanup old thumbnails
  async cleanupOldThumbnails(maxAge = 30 * 24 * 60 * 60 * 1000) { // 30 days
    try {
      const files = await fs.readdir(this.thumbnailDir);
      const now = Date.now();
      let deletedCount = 0;

      for (const file of files) {
        const filepath = path.join(this.thumbnailDir, file);
        const stats = await fs.stat(filepath);
        
        if (now - stats.mtime.getTime() > maxAge) {
          await fs.unlink(filepath);
          deletedCount++;
        }
      }

      console.log(`Cleaned up ${deletedCount} old thumbnails`);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('Error cleaning up thumbnails:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = new ThumbnailService();
