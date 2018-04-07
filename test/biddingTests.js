import {TestableArtWrapper} from "./TestableArtWrapper";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");

const STATE_NOT_FINISHED = 0;
const STATE_INITIAL_BIDDING = 1;
const STATE_OWNED = 2;
const COMMISSION = 0.039;
const MINIMUM_BID_AMOUNT_WEI = 80000000000000000; //0.08 ether
const BIDDING_DURATION_HOURS = 48;

const ACCOUNT_PIXELS = [400, 350, 450, 500, 250, 446, 500, 350, 450, 400];

contract('Initial bidding suite', async (accounts) => {

    it("should fail to return state of not existing canvas", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.getCanvasState(0).should.be.rejected;
    });

    it('should have 0 state for not finished canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        await instance.createCanvas();

        const state = await instance.getCanvasState(0);

        state.should.be.eq(STATE_NOT_FINISHED);

    });

    it('should have 1 state for finished canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());

        const pixelIndices = [0];
        ACCOUNT_PIXELS.reduce(function (a, b, i) {
            return pixelIndices[i + 1] = a + b;
        }, 0);

        for (let i = 1; i < pixelIndices.length; i++) {
            await instance.fillCanvas(0, pixelIndices[i - 1], pixelIndices[i], i);
        }

        const state = await instance.getCanvasState(0);
        state.should.be.eq(STATE_INITIAL_BIDDING);
    });

    it('should disallow to set pixels on finished canvas', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        return instance.setPixel(0, 10, 10).should.be.rejected;
    });

    it('should have no bids when initial bidding starts', async function () {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        const result = await instance.getLastBidForCanvas(0);

        console.log(JSON.stringify(result))
    });


});