import {TestableArtWrapper} from "./TestableArtWrapper";

const BigNumber = require('bignumber.js');

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const eth = new BigNumber("100000000000000000");

contract('Simple canvas creation', async (accounts) => {

    it("should be empty when deployed", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        const active = await instance.getCanvasByState(0);
        const initialBidding = await instance.getCanvasByState(1);
        const owned = await instance.getCanvasByState(2);

        activeCount.should.be.eq(0);
        count.should.be.eq(0);

        active.should.be.empty;
        initialBidding.should.be.empty;
        owned.should.be.empty;
    });

    it("should create contracts", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        activeCount.should.be.equal(2);
        count.should.be.equal(2);
    });

    it('should all authors be address 0x0', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const authors = await instance.getCanvasPainters(1);

        authors.forEach(value => {
            value.should.be.eq(ZERO_ADDRESS);
        });
    });

    it('shouldn\'t have created canvases finished', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const isFinished0 = await instance.isCanvasFinished(0);
        const isFinished1 = await instance.isCanvasFinished(1);

        isFinished0.should.be.false;
        isFinished1.should.be.false;
    });

    it('should have created canvases active', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const active = await instance.getCanvasByState(0);
        active.should.be.equalTo([0, 1]);
    });

    afterEach(async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        activeCount.should.be.lte(count);
    });

});

contract('Canvas creation limit', async (accounts) => {

    it("should create maximum amount active canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const maxActiveCount = await instance.MAX_ACTIVE_CANVAS();

        for (let i = 0; i < maxActiveCount; i++) {
            await instance.createCanvas();
        }

        const active = await instance.activeCanvasCount();
        const total = await instance.canvasCount();

        active.should.be.eq(maxActiveCount);
        total.should.be.eq(maxActiveCount);
    });

    it('should fail to create new canvas when too many active ones', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.createCanvas().should.be.rejected;
    });

    it('should have all canvases active', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const active = await instance.getCanvasByState(0);

        active.should.be.equalTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    });

    it('should decrement activeCount after filling canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.fillWholeCanvas(1);

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();
        const isFinished = await instance.isCanvasFinished(1);

        activeCount.should.be.eq(count - 1);
        isFinished.should.be.true;
    });

    it('should disallow to set a name when initial bidding is not finished', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setCanvasName(1, "asd").should.be.rejected;
    });

    it('should all authors be account 0', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const authors = await instance.getCanvasPainters(1);

        authors.forEach(value => {
            value.should.be.eq(accounts[0]);
        })
    });

    it('shouldn\'t have canvas 1 active', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const active = await instance.getCanvasByState(0);

        active.should.not.to.be.containing(1);
    });

    it('should disallow to change canvas name if not called by the owner', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.makeBid(1, {value: eth.toNumber(), from: accounts[0]});
        await instance.pushTimeForward(48);

        const state = await instance.getCanvasState(1);
        state.should.be.eq(2);

        return instance.setCanvasName(1, "1231", {from: accounts[1]}).should.be.rejected;
    });

    it('should dissallow to change canvas name if longer than 24 chars', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const nameToSet = "my long name that is cool";
        
        return instance.setCanvasName(1, nameToSet, {from: accounts[0]}).should.be.rejected;
    });

    it('should change canvas name', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const nameToSet = "name";
        await instance.setCanvasName(1, nameToSet, {from: accounts[0]});

        const name = (await instance.getCanvasInfo(1)).name;
        name.should.be.eq(nameToSet);
    });

    it('should create additional canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        activeCount.should.be.eq(count - 1);
    });

});