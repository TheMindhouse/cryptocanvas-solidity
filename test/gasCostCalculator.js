import {TestableArtWrapper} from "./TestableArtWrapper";
import {generateArray} from "./utility";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const BigNumber = require('bignumber.js');

const TestableArt = artifacts.require("TestableArt");

const STATE_NOT_FINISHED = 0;
const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;

const eth = new BigNumber("100000000000000000");

const gasCosts = [];
let pixelCount = 0;
let owner = `0x0`;


/**
 * Calculates gas cost of non-view, external/public functions. Nicely prints out the result.
 * It takes into account most popular cases.
 */
contract('Contract gas calculator', async (accounts) => {

    before(async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        pixelCount = await instance.PIXEL_COUNT();
        pixelCount.should.be.gt(0);
    });

    after(() => {
        console.log(`\nGas costs for canvas of ${pixelCount} pixels\n`);

        //find longest description and set proper spacing to make
        //sure results is beautifully readable
        const longestText = gasCosts.reduce((a, b) => a[0].length > b[0].length ? a : b);
        const longestCost = gasCosts.reduce((a, b) => a[1].toString().length > b[1].toString().length ? a : b);

        gasCosts.forEach(value => {
            let spaces = longestText[0].length + longestCost[1].toString().length + 4;
            spaces -= value[0].length;
            spaces -= value[1].toString().length;

            const toLog = value[0] + ':' + Array(spaces).join(' ') + value[1];
            console.log(toLog)
        })
    });

    it("calculate creation cost", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const transaction = await instance.createCanvas();
        const cost = transaction.receipt.gasUsed;

        gasCosts.push(["createCanvas()", cost]);
    });

    it('calculate drawing cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.setPixel(0, 0, 10);
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [first one]', cost]);

        transaction = await instance.setPixel(0, 1, 10);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [second one]', cost]);

        transaction = await instance.setPixel(0, 2, 10);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [third one]', cost]);

        await instance.fillCanvas(0, 3, pixelCount - 1);

        transaction = await instance.setPixel(0, pixelCount - 1, 10);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixel() [last one]', cost]);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_INITIAL_BIDDING);
    });

    it('calculate batch drawing cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();


        let toDraw = generateArray(1, 6);
        let transaction = await instance.setPixels(1, toDraw, toDraw);
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixels() [5 pixels + first pixel]', cost]);

        toDraw = generateArray(6, 11);
        transaction = await instance.setPixels(1, toDraw, toDraw);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixels() [5 pixels]', cost]);

        toDraw = generateArray(11, 21);
        transaction = await instance.setPixels(1, toDraw, toDraw);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixels() [10 pixels]', cost]);

        toDraw = generateArray(21, 41);
        transaction = await instance.setPixels(1, toDraw, toDraw);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixels() [20 pixels]', cost]);

        toDraw = generateArray(41, 141);
        transaction = await instance.setPixels(1, toDraw, toDraw);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixels() [100 pixels]', cost]);

        toDraw = generateArray(141, 142);
        transaction = await instance.setPixels(1, toDraw, toDraw);
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setPixels() [1 pixels]', cost]);
    });

    it('calculate making bid cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.makeBid(0, {from: accounts[0], value: eth.toNumber()});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBid() [first one]', cost]);

        transaction = await instance.makeBid(0, {from: accounts[1], value: eth.multipliedBy(2).toNumber()});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBid() [outbidding someone]', cost]);

        owner = accounts[1];
    });

    /**
     * Account 1 wins initial bidding
     */
    it('buying canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.pushTimeForward(48);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_OWNED);
    });

    it('calculate setting canvas name cost', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let name = "01234";
        let transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [5 char, first time]', cost]);

        name = "a";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [1 char]', cost]);

        name = "abcde";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [5 chars]', cost]);

        name = "aąeęi";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [5 chars including 2 special]', cost]);

        name = "0123456789";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [10 chars]', cost]);

        name = "01234567ź€";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [10 chars, including 2 special]', cost]);

        name = "NzTkeT77vUe2VaElco9qNzTkeT77vUe2VaElco9q";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [20 chars, including 2 special]', cost]);

        name = "NzTkeT77vUe2VaElco9qNzTkeT77vUe2VaElco9qNzTkeT77vUe2VaElco9qNzTkeT77vUe2VaElco9q";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [40 chars, including 2 special]', cost]);

        name = "NzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6Yj";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [100 chars]', cost]);

        name = "NzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6YjNzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6Yj";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [200 chars]', cost]);

        name = "NzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6YjNzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6YjNzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6YjNzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6YjNzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6YjNzTkeT77vUe2VaElco9q6zVYmI0EifTKb3b826c1oNwnYPyS5xB1lVqDr5r xUrcSYRQGu6TnrgADbMro32UuJgTYHkGKGkLk6Yj";
        transaction = await instance.setCanvasName(0, name, {from: accounts[1]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['setCanvasName() [600 chars]', cost]);

        const setName = (await instance.getCanvasInfo(0)).name;
        setName.should.be.eq(setName);
    });

    it('calculate withdraw reward cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.addRewardToPendingWithdrawals(0, {from: accounts[0]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['addRewardToPendingWithdrawals() [1 address painted all pixels]', cost]);
    });

    it('calculate withdraw commission cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.addCommissionToPendingWithdrawals(0, {from: accounts[0]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['addCommissionToPendingWithdrawals()', cost]);
    });

    it('calculate changing minimum bid amount cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.setMinimumBidAmount(eth.toString(), {from: accounts[0]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['setMinimumBidAmount()', cost]);
    });

    it('calculate offering for sale cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.offerCanvasForSaleToAddress(0, 10, accounts[5], {from: owner});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['offerCanvasForSaleToAddress()', cost]);

        transaction = await instance.offerCanvasForSale(0, 10, {from: owner});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['offerCanvasForSale()', cost]);

        transaction = await instance.cancelSellOffer(0, {from: owner});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['cancelSellOffer()', cost]);
    });

    it('calculate accepting sell offer cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.offerCanvasForSale(0, 10, {from: owner});

        let transaction = await instance.acceptSellOffer(0, {from: accounts[0], value: 100});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['acceptSellOffer()', cost]);
        owner = accounts[0];

        await instance.offerCanvasForSale(0, 10, {from: owner});
        await instance.makeBuyOffer(0, {from: accounts[1], value: 10});

        transaction = await instance.acceptSellOffer(0, {from: accounts[1], value: 100});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['acceptSellOffer() [when having buy offer posted]', cost]);
        owner = accounts[1];
    });

    it('calculate making buy offer costs', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.makeBuyOffer(0, {from: accounts[0], value: 10});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBuyOffer()', cost]);

        transaction = await instance.makeBuyOffer(0, {from: accounts[5], value: 20});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['makeBuyOffer() [outbidding someone]', cost]);

        transaction = await instance.cancelBuyOffer(0, {from: accounts[5]});
        cost = transaction.receipt.gasUsed;
        gasCosts.push(['cancelBuyOffer()', cost]);
    });

    /**
     * Account 5 buys canvas
     */
    it('calculate accepting buy offer cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyer = accounts[5];
        await instance.makeBuyOffer(0, {from: buyer, value: eth.toNumber()});

        let transaction = await instance.acceptBuyOffer(0, 0, {from: owner});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['acceptBuyOffer()', cost]);

        owner = buyer;
    });

    it('calculate withdraw cost', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let transaction = await instance.withdraw({from: accounts[1]});
        let cost = transaction.receipt.gasUsed;
        gasCosts.push(['withdraw()', cost]);
    });

});