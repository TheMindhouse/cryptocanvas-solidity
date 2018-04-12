import {TestableArtWrapper} from "./TestableArtWrapper";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const bigInt = require('big-integer');

const TestableArt = artifacts.require("TestableArt");

const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;
const GAS_PRICE = bigInt("2000000000");
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const eth = bigInt("100000000000000000");

const calculateFee = (amount) => {
    return bigInt(amount).multiply(39).divide(1000); //3.9%
};

/**
 * All tests that involve trading will calculate expected fees. It has to verified
 * at the end of the test suite.
 * @type {number}
 */
let expectedFees = bigInt();
let owner = '0x0';

contract('Canvas trading suite', async (accounts) => {

    /**
     * Creates canvas.
     */
    it("should create canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();
    });

    it("should not allow to buy not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.buyCanvas(0).should.be.rejected;
    });

    it("should not allow to offer for sale not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSale(0, 10).should.be.rejected;
    });

    it("should not allow to offer for sale (to address) not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 10, accounts[2]).should.be.rejected;
    });

    it("should not allow to cancel sale not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.canvasNoLongerForSale(0).should.be.rejected;
    });

    it("should not allow to enter buy offer not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.enterBuyOffer(0, {value: 100000}).should.be.rejected;
    });

    it("should not allow to cancel buy offer not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelBuyOffer(0).should.be.rejected;
    });

    it("should not allow to accept buy offer not finished canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, 0).should.be.rejected;
    });

    it("should return empty buy offer when canvas is not finished", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.false;
    });

    it("should return empty sell offer when canvas is not finished", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const sellOffer = await instance.getCurrentSellOffer(0);

        sellOffer.isForSale.should.be.false;
    });

    /**
     * Fills canvas with pixels. Starts INITIAL BIDDING.
     */
    it('should fill the canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.fillWholeCanvas(0); //we don't really care here who is painting

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_INITIAL_BIDDING);
    });

    it("should not allow to buy when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.buyCanvas(0).should.be.rejected;
    });

    it("should not allow to offer for sale when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSale(0, 10).should.be.rejected;
    });

    it("should not allow to offer for sale (to address) when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 10, accounts[2]).should.be.rejected;
    });

    it("should not allow to cancel sale when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.canvasNoLongerForSale(0).should.be.rejected;
    });

    it("should not allow to enter buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.enterBuyOffer(0, {value: 100000}).should.be.rejected;
    });

    it("should not allow to cancel buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelBuyOffer(0).should.be.rejected;
    });

    it("should not allow to accept buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, 0).should.be.rejected;
    });

    it("should return empty buy offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.false;
    });

    it("should return empty sell offer when canvas is in initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const sellOffer = await instance.getCurrentSellOffer(0);

        sellOffer.isForSale.should.be.false;
    });

    /**
     * Account 1 wins initial bidding.
     */
    it("should change its state to OWNED when somebody will will initial bidding", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        owner = accounts[1];
        await instance.makeBid(0, {from: owner, value: eth});
        await instance.pushTimeForward(48);

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_OWNED);

        const balance = await instance.balanceOf(owner);
        balance.should.be.eq(1);
    });

    it('should not allow to buy canvas if it\'s not offered for sale', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.buyCanvas(0, {from: accounts[0], value: 10000000}).should.be.rejected;
    });

    it('should not allow to offer canvas for sale if not called by the owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSale(0, 1000, {from: accounts[0]}).should.be.rejected;
    });

    it('should not allow to offer canvas for sale (for address) if not called by the owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 1000, accounts[5], {from: accounts[0]}).should.be.rejected;
    });

    /**
     * Owner (account 1) posts sell offer.
     */
    it('should offer canvas for sale', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.offerCanvasForSale(0, 10, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.true;
        sellOffer.seller.should.be.eq(owner);
        sellOffer.minPrice.should.be.eq(10);
        sellOffer.onlySellTo.should.be.eq(ZERO_ADDRESS);
    });

    it('should not allow to cancel sell offer if not called by the owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.canvasNoLongerForSale(0, {from: accounts[8]}).should.be.rejected;
    });

    it('should not allow to buy canvas if sell offer has been cancelled', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.canvasNoLongerForSale(0, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.false;

        return instance.buyCanvas(0, {from: accounts[5], value: 20}).should.be.rejected;
    });

    /**
     * Owner (account 1) posts sell offer.
     */
    it('should offer canvas for sale 2', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.offerCanvasForSale(0, 10, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.true;
        sellOffer.seller.should.be.eq(owner);
        sellOffer.minPrice.should.be.eq(10);
        sellOffer.onlySellTo.should.be.eq(ZERO_ADDRESS);
    });

    it('should not allow to buy a canvas for amount smaller than minimum', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.buyCanvas(0, {from: accounts[0], value: 8}).should.be.rejected;
    });

    it('should not allow address to buy its canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.buyCanvas(0, {from: owner, value: 50}).should.be.rejected;
    });

    /**
     * Account 0 buys canvas.
     */
    it('should buy a canvas offered for sale', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = eth.multiply(2); //2 eth
        const fee = calculateFee(amount);
        const buyer = accounts[0];

        const buyerBalance = await instance.getBalance(buyer);
        const sellerBalance = await instance.getBalance(owner);

        const result = await instance.buyCanvas(0, {from: buyer, value: amount, gasPrice: GAS_PRICE});

        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);
        const info = await instance.getCanvasInfo(0);
        const sellOffer = await instance.getCurrentSellOffer(0);
        const newBuyerBalance = await instance.getBalance(buyer);
        const newSellerBalance = await instance.getBalance(owner);

        info.owner.should.be.eq(buyer);
        sellOffer.isForSale.should.be.false;

        buyerBalance.minus(gas).minus(amount).eq(newBuyerBalance).should.be.true;
        sellerBalance.plus(amount).minus(fee).eq(newSellerBalance).should.be.true;

        (await instance.balanceOf(owner)).should.be.eq(0);
        (await instance.balanceOf(buyer)).should.be.eq(1);

        owner = buyer;
        expectedFees = expectedFees.plus(fee);
    });

    it('should not allow to offer a canvas for sale for an owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.offerCanvasForSaleToAddress(0, 10, owner, {from: owner}).should.be.rejected;
    });

    /**
     * Account 0 offers canvas for sale only for account 5.
     */
    it('should offer canvas for sale for specified address', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        let sellTo = accounts[5];
        await instance.offerCanvasForSaleToAddress(0, 20, sellTo, {from: owner});

        const sellOffer = await instance.getCurrentSellOffer(0);
        sellOffer.isForSale.should.be.true;
        sellOffer.minPrice.should.be.eq(20);
        sellOffer.seller.should.be.eq(owner);
        sellOffer.onlySellTo.should.be.eq(sellTo);
    });

    it('should not allow to buy canvas by the address different than specified', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.buyCanvas(0, {from: accounts[8], value: 100}).should.be.rejected;
    });

    /**
     * Account 5 buys canvas.
     */
    it('should buy canvas when specific address is specified', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = eth.multiply(1); //2 eth
        const fee = calculateFee(amount);
        const buyer = accounts[5];

        const buyerBalance = await instance.getBalance(buyer);
        const sellerBalance = await instance.getBalance(owner);

        const result = await instance.buyCanvas(0, {from: buyer, value: amount, gasPrice: GAS_PRICE});

        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);
        const info = await instance.getCanvasInfo(0);
        const sellOffer = await instance.getCurrentSellOffer(0);
        const newBuyerBalance = await instance.getBalance(buyer);
        const newSellerBalance = await instance.getBalance(owner);

        info.owner.should.be.eq(buyer);
        sellOffer.isForSale.should.be.false;

        buyerBalance.minus(gas).minus(amount).eq(newBuyerBalance).should.be.true;
        sellerBalance.plus(amount).minus(fee).eq(newSellerBalance).should.be.true;

        (await instance.balanceOf(owner)).should.be.eq(0);
        (await instance.balanceOf(buyer)).should.be.eq(1);

        owner = buyer;
        expectedFees = expectedFees.plus(fee);
    });

    /**
     * Account 7 buys canvas.
     */
    it('should return buy offer when buying a canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const amount = eth.multiply(3);
        const buyOffer = eth.multiply(2);
        const fee = calculateFee(amount);
        const buyer = accounts[7];

        //Enter buy offer and sell offer.
        await instance.enterBuyOffer(0, {from: buyer, value: buyOffer});
        await instance.offerCanvasForSale(0, 10, {from: owner});

        //Balance after posting offers
        const buyerBalance = await instance.getBalance(buyer);
        const sellerBalance = await instance.getBalance(owner);

        const result = await instance.buyCanvas(0, {from: buyer, value: amount, gasPrice: GAS_PRICE});

        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);
        const info = await instance.getCanvasInfo(0);
        const sellOffer = await instance.getCurrentSellOffer(0);
        const newBuyerBalance = await instance.getBalance(buyer);
        const newSellerBalance = await instance.getBalance(owner);

        info.owner.should.be.eq(buyer);
        sellOffer.isForSale.should.be.false;

        //Buyer should have buy offer refunded
        buyerBalance.minus(gas).minus(amount).plus(buyOffer).eq(newBuyerBalance).should.be.true;
        sellerBalance.plus(amount).minus(fee).eq(newSellerBalance).should.be.true;

        (await instance.balanceOf(owner)).should.be.eq(0);
        (await instance.balanceOf(buyer)).should.be.eq(1);

        //Buy offer should be cancelled
        (await instance.getCurrentBuyOffer(0)).hasOffer.should.be.false;

        owner = buyer;
        expectedFees = expectedFees.plus(fee);
    });

    it('should not allow to make a buy offer when called by owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.enterBuyOffer(0, {from: owner, value: 100}).should.be.rejected;
    });

    /**
     * Account 2 makes buy offer.
     */
    it('should make a buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const buyer = accounts[2];
        const amount = eth;
        const buyerBalance = await instance.getBalance(buyer);

        const result = await instance.enterBuyOffer(0, {from: buyer, value: eth, gasPrice: GAS_PRICE});
        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);

        const newBuyerBalance = await instance.getBalance(buyer);
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.true;
        buyOffer.buyer.should.be.eq(buyer);
        amount.eq(buyOffer.amount).should.be.true;

        buyerBalance.minus(gas).minus(amount).eq(newBuyerBalance).should.be.true;
    });

    it('should not allow to cancel buy offer if not called by its owner', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.cancelBuyOffer(0, {from: accounts[1]}).should.be.rejected;
    });

    /**
     * Account 2 cancels buy offer.
     */
    it('should cancel a buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const buyer = accounts[2];
        const amount = eth;
        const buyerBalance = await instance.getBalance(buyer);

        const result = await instance.cancelBuyOffer(0, {from: buyer, gasPrice: GAS_PRICE});
        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);

        const newBuyerBalance = await instance.getBalance(buyer);
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.false;

        buyerBalance.minus(gas).plus(amount).eq(newBuyerBalance).should.be.true;
    });

    /**
     * Account 9 posts buy offer. Account 2 has been outbid.
     */
    it('should refund buy offer when outbid', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyer1 = accounts[2];
        const buyer2 = accounts[9];
        const amount1 = eth;
        const amount2 = eth.multiply(2);

        await instance.enterBuyOffer(0, {from: buyer1, value: amount1});
        const buyer1Balance = await instance.getBalance(buyer1);

        await instance.enterBuyOffer(0, {from: buyer2, value: amount2});
        const newBuyer1Balance = await instance.getBalance(buyer1);
        const buyOffer = await instance.getCurrentBuyOffer(0);

        buyOffer.hasOffer.should.be.true;
        buyOffer.buyer.should.be.eq(buyer2);
        amount2.eq(buyOffer.amount).should.be.true;

        buyer1Balance.plus(amount1).eq(newBuyer1Balance).should.be.true;
    });

    it('should not allow to make buy offer when din\'t send bigger value', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.enterBuyOffer(0, {from: accounts[2], value: eth.multiply(2)}).should.be.rejected;
    });

    it('should not allow to accept buy offer if not called by the owner of the canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, 0, {from: accounts[9]}).should.be.rejected;

    });

    it('should not allow to accept buy offer if minimum price is higher that buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.acceptBuyOffer(0, eth.multiply(10), {from: owner}).should.be.rejected;
    });

    /**
     * Account 9 buys canvas.
     */
    it('should accept buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        //let's do sell offer, to make sure it will be cancelled
        await instance.offerCanvasForSale(0, 10, {from: owner});
        const buyOffer = await instance.getCurrentBuyOffer(0);
        const balance = await instance.getBalance(owner);

        const seller = owner;
        const fee = calculateFee(buyOffer.amount);

        const result = await instance.acceptBuyOffer(0, parseInt(eth.multiply(2)), {from: seller, gasPrice: GAS_PRICE});
        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);
        const newBalance = await instance.getBalance(seller);

        balance.plus(buyOffer.amount).minus(gas).minus(fee).eq(newBalance).should.be.true;

        //check ownership and balanceOf
        const info = await instance.getCanvasInfo(0);
        const balanceSeller = await instance.balanceOf(seller);
        const balanceBuyer = await instance.balanceOf(buyOffer.buyer);

        info.owner.should.be.eq(buyOffer.buyer);
        balanceSeller.should.be.eq(0);
        balanceBuyer.should.be.eq(1);

        owner = buyOffer.buyer;
        expectedFees = expectedFees.plus(fee);
    });

    it('should not have any buy nor sell offers after accepting buy offer', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const buyOffer = await instance.getCurrentBuyOffer(0);
        const sellOffer = await instance.getCurrentSellOffer(0);

        buyOffer.hasOffer.should.be.false;
        sellOffer.isForSale.should.be.false;
    });

    it('should not allow to withdraw fees when not called by the owner of the contract', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.withdrawFees({from: accounts[9]}).should.be.rejected;
    });

    it('should withdraw fees', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const contractOwner = accounts[0];

        const fees = await instance.fees();
        expectedFees.eq(fees).should.be.true;

        const balance = await instance.getBalance(contractOwner);
        const result = await instance.withdrawFees({from: contractOwner, gasPrice: GAS_PRICE});
        const gas = GAS_PRICE.multiply(result.receipt.gasUsed);

        const newBalance = await instance.getBalance(contractOwner);

        balance.plus(fees).minus(gas).eq(newBalance).should.be.true;
    });

    it('should clear fees after withdrawal', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const fees = await instance.fees();

        fees.should.be.eq(0);
    });

    it('should not allow to withdraw fees when there is nothing to withdraw', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const contractOwner = accounts[0];

        return instance.withdrawFees({from: contractOwner}).should.be.rejected;
    });

});