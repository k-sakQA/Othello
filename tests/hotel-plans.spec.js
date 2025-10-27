const { expect } = require('chai');
const puppeteer = require('puppeteer');

describe('Hotel Plans Page', () => {
    let browser;
    let page;

    before(async () => {
        browser = await puppeteer.launch();
        page = await browser.newPage();
        await page.goto('https://hotel-example-site.takeyaqa.dev/ja/plans.html');
    });

    after(async () => {
        await browser.close();
    });

    it('should display the plans section', async () => {
        const plansSection = await page.$('.plans-section');
        expect(plansSection).to.not.be.null;
    });

    it('should have at least one plan available', async () => {
        const plans = await page.$$('.plan-item');
        expect(plans.length).to.be.greaterThan(0);
    });

    it('should display plan titles', async () => {
        const planTitles = await page.$$eval('.plan-title', titles => titles.map(title => title.textContent));
        expect(planTitles).to.not.be.empty;
    });

    it('should navigate to plan details when a plan is clicked', async () => {
        const firstPlan = await page.$('.plan-item');
        await firstPlan.click();
        await page.waitForNavigation();
        const url = page.url();
        expect(url).to.include('/plan-details');
    });
});