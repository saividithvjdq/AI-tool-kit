const express = require('express');
const Website = require('../models/Website');
const User = require('../models/User');
const path = require('path');

const router = express.Router();

// Utility function to sanitize business name for URL
const sanitizeBusinessName = (name) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .trim('-'); // Remove leading/trailing hyphens
};

// Utility function to sanitize username for URL
const sanitizeUsername = (username) => {
  return username
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // Remove all non-alphanumeric characters
};

// @route   GET /:username/:businessname
// @desc    Serve published website publicly
// @access  Public
router.get('/:username/:businessname', async (req, res) => {
  try {
    const { username, businessname } = req.params;
    
    // Find user by sanitized username
    const user = await User.findOne({
      $expr: {
        $eq: [
          { $toLower: { $regex: { $replaceAll: { input: '$username', find: /[^a-z0-9]/g, replacement: '' } } } },
          sanitizeUsername(username)
        ]
      }
    });

    if (!user) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>User Not Found</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Montserrat', sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .error { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #e74c3c; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>User Not Found</h1>
            <p>The user "${username}" does not exist or has no published websites.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Find website by sanitized business name
    const website = await Website.findOne({
      userId: user._id,
      status: 'published',
      $expr: {
        $eq: [
          { $toLower: { $regex: { $replaceAll: { input: '$businessInfo.name', find: /[^a-z0-9\s-]/g, replacement: '' } } } },
          businessname.replace(/-/g, ' ')
        ]
      }
    });

    if (!website) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Website Not Found</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: 'Montserrat', sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
            .error { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
            h1 { color: #e74c3c; margin-bottom: 20px; }
            p { color: #666; line-height: 1.6; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>Website Not Found</h1>
            <p>The website "${businessname}" for user "${username}" does not exist or is not published.</p>
          </div>
        </body>
        </html>
      `);
    }

    // Serve the website HTML with proper meta tags and SEO
    const html = generatePublicWebsiteHTML(website, user);
    res.send(html);

  } catch (error) {
    console.error('Error serving public website:', error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: 'Montserrat', sans-serif; text-align: center; padding: 50px; background: #f8f9fa; }
          .error { background: white; padding: 40px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); max-width: 500px; margin: 0 auto; }
          h1 { color: #e74c3c; margin-bottom: 20px; }
          p { color: #666; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="error">
          <h1>Server Error</h1>
          <p>Something went wrong while loading this website. Please try again later.</p>
        </div>
      </body>
      </html>
    `);
  }
});

// Generate complete HTML for public website
const generatePublicWebsiteHTML = (website, user) => {
  const businessInfo = website.businessInfo;
  const content = website.content;
  const seo = website.seo;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${seo?.title || businessInfo.name}</title>
    <meta name="description" content="${seo?.description || businessInfo.description}">
    <meta name="keywords" content="${seo?.keywords?.join(', ') || businessInfo.keyServices?.join(', ') || ''}">
    
    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website">
    <meta property="og:url" content="${process.env.CLIENT_URL}/${sanitizeUsername(user.username)}/${sanitizeBusinessName(businessInfo.name)}">
    <meta property="og:title" content="${seo?.title || businessInfo.name}">
    <meta property="og:description" content="${seo?.description || businessInfo.description}">
    <meta property="og:image" content="${seo?.ogImage || ''}">

    <!-- Twitter -->
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:url" content="${process.env.CLIENT_URL}/${sanitizeUsername(user.username)}/${sanitizeBusinessName(businessInfo.name)}">
    <meta property="twitter:title" content="${seo?.title || businessInfo.name}">
    <meta property="twitter:description" content="${seo?.description || businessInfo.description}">
    <meta property="twitter:image" content="${seo?.ogImage || ''}">

    <!-- Structured Data -->
    <script type="application/ld+json">
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "${businessInfo.name}",
      "description": "${businessInfo.description}",
      "url": "${process.env.CLIENT_URL}/${sanitizeUsername(user.username)}/${sanitizeBusinessName(businessInfo.name)}",
      "contactPoint": {
        "@type": "ContactPoint",
        "email": "${businessInfo.contactInfo?.email || ''}",
        "telephone": "${businessInfo.contactInfo?.phone || ''}",
        "contactType": "customer service"
      },
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "${businessInfo.contactInfo?.address || ''}"
      }
    }
    </script>

    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Styles -->
    <style>
      ${website.content?.css || generateDefaultCSS(website)}
    </style>

    <!-- Analytics -->
    ${website.analytics?.googleAnalyticsId ? `
    <!-- Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=${website.analytics.googleAnalyticsId}"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${website.analytics.googleAnalyticsId}');
    </script>
    ` : ''}
    
    ${website.analytics?.facebookPixelId ? `
    <!-- Facebook Pixel -->
    <script>
      !function(f,b,e,v,n,t,s)
      {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};
      if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
      n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t,s)}(window, document,'script',
      'https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${website.analytics.facebookPixelId}');
      fbq('track', 'PageView');
    </script>
    ` : ''}
</head>
<body>
    ${website.content?.html || generateDefaultHTML(website)}
    
    <!-- JavaScript -->
    <script>
      ${website.content?.javascript || generateDefaultJS()}
    </script>
</body>
</html>`;
};

// Generate default CSS if none exists
const generateDefaultCSS = (website) => {
  const primaryColor = website.design?.colorScheme?.primary || '#6366f1';
  const secondaryColor = website.design?.colorScheme?.secondary || '#8b5cf6';
  
  return `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Montserrat', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
    .hero { background: linear-gradient(135deg, ${primaryColor}, ${secondaryColor}); color: white; padding: 100px 0; text-align: center; }
    .hero h1 { font-size: 3rem; margin-bottom: 1rem; font-weight: 700; }
    .hero p { font-size: 1.2rem; margin-bottom: 2rem; }
    .btn { display: inline-block; padding: 12px 30px; background: white; color: ${primaryColor}; text-decoration: none; border-radius: 5px; font-weight: 600; transition: transform 0.3s; }
    .btn:hover { transform: translateY(-2px); }
    .section { padding: 80px 0; }
    .section h2 { text-align: center; margin-bottom: 3rem; font-size: 2.5rem; color: ${primaryColor}; }
    .services { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 2rem; margin-top: 3rem; }
    .service-card { background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.1); text-align: center; }
    .contact { background: #f8f9fa; }
    .footer { background: #333; color: white; text-align: center; padding: 2rem 0; }
  `;
};

// Generate default HTML if none exists
const generateDefaultHTML = (website) => {
  const businessInfo = website.businessInfo;
  const content = website.content;
  
  return `
    <header class="hero">
      <div class="container">
        <h1>${content?.hero?.headline || `Welcome to ${businessInfo.name}`}</h1>
        <p>${content?.hero?.subheadline || businessInfo.description}</p>
        <a href="#contact" class="btn">${content?.hero?.ctaText || 'Get Started'}</a>
      </div>
    </header>

    <section class="section">
      <div class="container">
        <h2>${content?.about?.title || 'About Us'}</h2>
        <p style="text-align: center; font-size: 1.1rem; max-width: 800px; margin: 0 auto;">
          ${content?.about?.content || businessInfo.description}
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <h2>Our Services</h2>
        <div class="services">
          ${(businessInfo.keyServices || []).map(service => `
            <div class="service-card">
              <h3>${service}</h3>
              <p>Professional ${service} services tailored to your needs.</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <section id="contact" class="section contact">
      <div class="container">
        <h2>Contact Us</h2>
        <div style="text-align: center;">
          ${businessInfo.contactInfo?.email ? `<p><strong>Email:</strong> ${businessInfo.contactInfo.email}</p>` : ''}
          ${businessInfo.contactInfo?.phone ? `<p><strong>Phone:</strong> ${businessInfo.contactInfo.phone}</p>` : ''}
          ${businessInfo.contactInfo?.address ? `<p><strong>Address:</strong> ${businessInfo.contactInfo.address}</p>` : ''}
        </div>
      </div>
    </section>

    <footer class="footer">
      <div class="container">
        <p>&copy; ${new Date().getFullYear()} ${businessInfo.name}. All rights reserved.</p>
      </div>
    </footer>
  `;
};

// Generate default JavaScript
const generateDefaultJS = () => {
  return `
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        document.querySelector(this.getAttribute('href')).scrollIntoView({
          behavior: 'smooth'
        });
      });
    });
  `;
};

module.exports = router;
