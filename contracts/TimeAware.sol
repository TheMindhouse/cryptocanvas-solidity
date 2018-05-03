pragma solidity ^0.4.21;

import "./Ownable.sol";

/**
 * @dev Contract that is aware of time. Useful for tests - like this
 *      we can mock time.
 */
contract TimeAware is Ownable {

    /**
    * @dev Returns current time.
    */
    function getTime() public view returns (uint) {
        return now;
    }

}
