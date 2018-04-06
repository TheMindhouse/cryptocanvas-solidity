const TestableArt = artifacts.require("TestableArt");

module.exports = function(deployer) {
    deployer.deploy(TestableArt);
};