import {TestableArtWrapper} from "./TestableArtWrapper";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");

contract('Simple canvas creation', async (accounts) => {

    it("should be empty when deployed", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        assert.equal(activeCount.valueOf(), 0);
        assert.equal(count.valueOf(), 0);
    });

    it("should create contracts", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        activeCount.valueOf().should.be.equal(2);
        count.valueOf().should.be.equal(2);
    });

    it('shouldn\'t have created canvases finished', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const isFinished0 = await instance.isCanvasFinished(0);
        const isFinished1 = await instance.isCanvasFinished(1);

        console.log(isFinished0);

        isFinished0.should.be.false;
        isFinished1.should.be.false;
    });

    it('should have created canvases active', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const active = await instance.getActiveCanvases();
        active.should.be.equalTo([0, 1]);
    });

    afterEach(async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        let activeCount = await instance.activeCanvasCount();
        let count = await instance.canvasCount();
        activeCount = parseInt(activeCount);
        count = parseInt(count);

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

        assert.equal(active, maxActiveCount);
        assert.equal(total, maxActiveCount);
    });

    it('should fail to create new canvas when too many active ones', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.createCanvas().should.be.rejected;
    });

    it('should have all canvases active', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const active = await instance.getActiveCanvases();

        active.should.be.equalTo([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('should decrement activeCount after filling canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.fillWholeCanvas(1);

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();
        const isFinished = await instance.isCanvasFinished(1);

        assert.equal(activeCount, count - 1);
        assert.isTrue(isFinished, "Filled canvas has to be finished")
    });

    it('shouldn\'t have canvas 1 active', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const active = await instance.getActiveCanvases();

        active.should.not.to.be.containing(1);
    });

    it('should create additional canvas', async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.canvasCount();

        assert.equal(activeCount, count - 1);
    });

});