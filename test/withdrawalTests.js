import {TestableArtWrapper} from "./TestableArtWrapper";

const chai = require('chai');
chai.use(require('chai-as-promised')).should();
chai.use(require('chai-arrays')).should();

const TestableArt = artifacts.require("TestableArt");

contract('Withdrawal tests', async (accounts) => {

    it("should be empty when deployed", async () => {
        const instance = new TestableArtWrapper(await TestableArt.deployed());
        true.should.be.false() //todo
    });

});