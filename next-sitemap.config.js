/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.SITE_URL || 'https://www.cooketricks.com',
  generateRobotsTxt: true,
  exclude: ['/test-page'], // Exclude any test or draft pages
  robotsTxtOptions: {
    policies: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
  },
}
