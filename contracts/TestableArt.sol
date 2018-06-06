pragma solidity 0.4.24;

import "./CryptoArt.sol";

/**
 * @dev Contract with utility methods for testing.
 *
 * **NEVER DEPLOY THIS CONTRACT!!!**
 */
contract TestableArt is CryptoArt {

    uint public mockTime;

    /**
    * @dev Overrides default behaviour. Allows to mock time.
    */
    function getTime() public view returns (uint) {
        return mockTime;
    }

    /**
    * @dev Sets current time.
    */
    function mockTime(uint _time) external {
        mockTime = _time;
    }

}
