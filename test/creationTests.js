import {fillWholeCanvas} from "./utils";

require('chai')
    .use(require('chai-as-promised'))
    .should();

const CryptoArt = artifacts.require("CryptoArt");

contract('Canvas creation suite', async (accounts) => {

    it("should be empty when deployed", async () => {
        const instance = await CryptoArt.deployed();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getCanvasCount();

        assert.equal(activeCount.valueOf(), 0);
        assert.equal(count.valueOf(), 0);
    });

    it("should create contracts", async () => {
        let instance = await CryptoArt.deployed();
        await instance.createCanvas();
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getCanvasCount();
        assert.equal(activeCount.valueOf(), 2);
        assert.equal(count.valueOf(), 2);

        const isFinished0 = await instance.isCanvasFinished(0);
        const isFinished1 = await instance.isCanvasFinished(1);
        assert.isFalse(isFinished0);
        assert.isFalse(isFinished1);
    });

    afterEach(async () => {
        const instance = await CryptoArt.deployed();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getCanvasCount();

        assert.isAtMost(activeCount, count);
    });

});

contract('Canvas creation limit', async (accounts) => {

    it("should create maximum amount active canvas", async () => {
        const instance = await CryptoArt.deployed();
        const maxActiveCount = await instance.MAX_ACTIVE_CANVAS();

        for (let i = 0; i < maxActiveCount; i++) {
            await instance.createCanvas();
        }

        const active = await instance.activeCanvasCount();
        const total = await instance.getCanvasCount();

        assert.equal(active.valueOf(), maxActiveCount.valueOf());
        assert.equal(total.valueOf(), maxActiveCount.valueOf());
    });

    it('should fail to create new canvas when too many active ones', async () => {
        const instance = await CryptoArt.deployed();
        return instance.createCanvas().should.be.rejected;
    });

    it('should decrement activeCount after filling canvas', async () => {
        const instance = await CryptoArt.deployed();

        await fillWholeCanvas(instance, 1);

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getCanvasCount();
        const isFinished = await instance.isCanvasFinished(1);

        assert.equal(activeCount.valueOf(), count.valueOf() - 1);
        assert.isTrue(isFinished, "Filled canvas has to be finished")
    });

    it('should create additional canvas', async () => {
        const instance = await CryptoArt.deployed();
        await instance.createCanvas();

        const activeCount = await instance.activeCanvasCount();
        const count = await instance.getCanvasCount();

        assert.equal(activeCount.valueOf(), count.valueOf() - 1);
    });

});